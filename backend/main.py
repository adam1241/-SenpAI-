from flask import Flask, request, Response, jsonify, send_from_directory
from flask_cors import CORS
import os
import re
import json
from werkzeug.utils import secure_filename
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from prompts.socratic_tutor import get_socratic_tutor_prompt
from tools.flash_cards_tool import FlashCardsTool
from utils.database import Database
from datetime import datetime, date, timedelta

load_dotenv()

# Make the upload folder path absolute and ensure it exists
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(app)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/images', methods=['POST'])
def upload_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # To avoid overwriting files with the same name, add a timestamp
        name, ext = os.path.splitext(filename)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        new_filename = f"{name}_{timestamp}{ext}"
        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], new_filename))
        
        # We return the URL where the image can be accessed
        file_url = f"/api/uploads/{new_filename}"
        return jsonify({"url": file_url}), 201
    else:
        return jsonify({"error": "File type not allowed"}), 400


@app.route('/api/flashcards/<int:flashcard_id>/review', methods=['POST'])
def review_flashcard(flashcard_id):
    """
    Endpoint to process a flashcard review and update its SRS data.
    """
    data = request.get_json()
    performance = data.get('performance') # "hard", "medium", "easy"

    if not performance or performance not in ["hard", "medium", "easy"]:
        return jsonify({"error": "Valid performance rating is required"}), 400

    flashcards = Database.load_table("flash_cards")
    card_to_update = next((fc for fc in flashcards if fc['id'] == flashcard_id), None)

    if not card_to_update:
        return jsonify({"error": "Flashcard not found"}), 404

    # --- Simplified SM-2 Algorithm ---
    ease_factor = card_to_update.get('ease_factor', 2.5)
    interval = card_to_update.get('interval', 0)
    
    if performance == "hard":
        interval = 1 # See it again tomorrow
        # Ease factor does not change on 'hard' to avoid penalizing too much
    elif performance == "medium":
        if interval < 1:
            interval = 3
        else:
            interval = round(interval * ease_factor)
    elif performance == "easy":
        if interval < 1:
            interval = 7
        else:
            interval = round(interval * (ease_factor + 0.15))
        ease_factor += 0.15

    # Clamp interval to be at least 1 day if it's not the first review
    if interval < 1 and card_to_update.get('last_reviewed'):
        interval = 1
        
    card_to_update['interval'] = interval
    card_to_update['ease_factor'] = ease_factor
    card_to_update['last_reviewed'] = datetime.now().isoformat()
    card_to_update['next_review_date'] = (date.today() + timedelta(days=interval)).isoformat()
    
    Database.save_table("flash_cards", flashcards)
    
    return jsonify(card_to_update), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    # We now expect a 'messages' array from the frontend
    conversation_history = data.get('messages')

    if not conversation_history:
        return Response("No messages provided", status=400)

    def generate():
        client = Cerebras(
            api_key=os.environ.get("CEREBRAS_API_KEY")
        )

        # Load available decks to provide context to the LLM
        decks = Database.load_table("decks")
        decks_json_string = json.dumps(decks, indent=2)

        # The first message is always the system prompt
        system_prompt = {
            "role": "system",
            "content": get_socratic_tutor_prompt(
                flashcard_decks=decks_json_string
            )
        }
        
        # The history from the frontend is already formatted
        api_messages = [system_prompt] + conversation_history

        stream = client.chat.completions.create(
            messages=api_messages,
            model="qwen-3-235b-a22b",
            stream=True,
            max_completion_tokens=40000,
            temperature=0.6,
            top_p=0.95
        )

        buffer = ""
        in_think_block = False
        flash_card_tool = FlashCardsTool()
        action_regex = re.compile(
            r"//ACTION: CREATE_FLASHCARD// //FLASHCARD_JSON: (.*?)\/\/"
        )

        def process_buffer(buf):
            nonlocal in_think_block
            # First, handle flashcard actions
            match = action_regex.search(buf)
            if match:
                json_payload = match.group(1)
                try:
                    flash_card_tool.add_flash_card(json_payload)
                except Exception as e:
                    print(f"Error processing flashcard action: {e}")
                # Remove the action text regardless of success
                buf = action_regex.sub("", buf)

            # Next, handle think blocks
            processed_output = ""
            while buf:
                if in_think_block:
                    end_tag = buf.find("</think>")
                    if end_tag != -1:
                        buf = buf[end_tag + len("</think>"):]
                        in_think_block = False
                    else:
                        # Remainder is a thought, discard
                        buf = ""
                else:
                    start_tag = buf.find("<think>")
                    if start_tag != -1:
                        processed_output += buf[:start_tag]
                        buf = buf[start_tag + len("<think>"):]
                        in_think_block = True
                    else:
                        # No more tags, the rest is content
                        processed_output += buf
                        buf = ""
            return processed_output

        for chunk in stream:
            content = chunk.choices[0].delta.content
            if not content:
                continue
            buffer += content
            
            # Decide when to process the buffer.
            # Let's do it if it contains a newline character.
            if '\n' in buffer:
                parts = buffer.split('\n')
                to_process = '\n'.join(parts[:-1]) + '\n'
                buffer = parts[-1]
                
                output = process_buffer(to_process)
                if output:
                    yield output
        
        # Process any remaining part of the buffer
        if buffer:
            output = process_buffer(buffer)
            if output:
                yield output

    return Response(generate(), mimetype='text/plain')


@app.route('/api/decks', methods=['GET'])
def get_decks():
    """
    Endpoint to retrieve all flashcard decks with their stats.
    Accepts an optional 'search' query parameter to filter results.
    """
    search_term = request.args.get('search', '').lower()
    decks = Database.load_table("decks")
    flashcards = Database.load_table("flash_cards")

    if search_term:
        # Find deck IDs that have cards matching the search term
        decks_with_matching_cards = {
            card['deck_id'] for card in flashcards if
            search_term in card['question'].lower() or
            search_term in card['answer'].lower()
        }

        # Filter decks based on their own info or their cards' content
        filtered_decks = [
            deck for deck in decks if
            search_term in deck['name'].lower() or
            search_term in deck['description'].lower() or
            deck['id'] in decks_with_matching_cards
        ]
        decks = filtered_decks
    
    today_iso = date.today().isoformat()

    for deck in decks:
        cards_in_deck = [card for card in flashcards if card['deck_id'] == deck['id']]
        deck['cardCount'] = len(cards_in_deck)
        
        new_cards_count = 0
        review_cards_count = 0

        for card in cards_in_deck:
            # A card is new if its interval is 0
            if card.get('interval', 0) == 0:
                new_cards_count += 1
            
            # A card is due for review if its next_review_date is today or in the past
            next_review_str = card.get('next_review_date', today_iso)
            if next_review_str <= today_iso:
                review_cards_count += 1
        
        deck['newCards'] = new_cards_count
        deck['reviewCards'] = review_cards_count

    return jsonify(decks)


@app.route('/api/decks', methods=['POST'])
def create_deck():
    """
    Endpoint to create a new flashcard deck.
    """
    data = request.get_json()
    if not data or 'name' not in data or 'description' not in data:
        return jsonify({"error": "Name and description are required"}), 400

    decks = Database.load_table("decks")
    
    new_deck = {
        "id": (max([d['id'] for d in decks]) + 1) if decks else 1,
        "name": data['name'],
        "description": data['description']
    }
    
    Database.add_to_table("decks", new_deck)
    
    # Return the newly created deck, enriched with initial stats
    new_deck['cardCount'] = 0
    new_deck['newCards'] = 0
    new_deck['reviewCards'] = 0
    
    return jsonify(new_deck), 201


@app.route('/api/decks/<int:deck_id>', methods=['DELETE'])
def delete_deck(deck_id):
    """
    Endpoint to delete a deck and all its associated flashcards.
    """
    decks = Database.load_table("decks")
    deck_to_delete = next((d for d in decks if d['id'] == deck_id), None)
    
    if not deck_to_delete:
        return jsonify({"error": "Deck not found"}), 404

    # Filter out the deck to be deleted
    updated_decks = [d for d in decks if d['id'] != deck_id]
    Database.save_table("decks", updated_decks)

    # Also delete associated flashcards
    flashcards = Database.load_table("flash_cards")
    updated_flashcards = [fc for fc in flashcards if fc['deck_id'] != deck_id]
    Database.save_table("flash_cards", updated_flashcards)

    return jsonify({"message": "Deck and associated flashcards deleted successfully"}), 200


@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    """
    Endpoint to retrieve all flashcards.
    """
    flashcards = Database.load_table("flash_cards")
    return jsonify(flashcards)


@app.route('/api/flashcards', methods=['POST'])
def create_flashcard():
    """
    Endpoint to create a new flashcard for a given deck.
    """
    data = request.get_json()
    if not data or 'question' not in data or 'answer' not in data or 'deck_id' not in data:
        return jsonify({"error": "Question, answer, and deck_id are required"}), 400

    flashcards = Database.load_table("flash_cards")
    
    new_card = {
        "id": (max([fc['id'] for fc in flashcards]) + 1) if flashcards else 1,
        "question": data['question'],
        "answer": data['answer'],
        "deck_id": data['deck_id'],
        "last_reviewed": None,
        "next_review_date": date.today().isoformat(),
        "interval": 0,
        "ease_factor": 2.5,
        "question_image": data.get("question_image"),
        "answer_image": data.get("answer_image")
    }
    
    Database.add_to_table("flash_cards", new_card)
    
    return jsonify(new_card), 201


@app.route('/api/flashcards/<int:flashcard_id>', methods=['PUT'])
def update_flashcard(flashcard_id):
    """
    Endpoint to update a flashcard.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    flashcards = Database.load_table("flash_cards")
    card_found = False
    for card in flashcards:
        if card['id'] == flashcard_id:
            card['question'] = data.get('question', card['question'])
            card['answer'] = data.get('answer', card['answer'])
            card['difficulty'] = data.get('difficulty', card['difficulty'])
            card['question_image'] = data.get('question_image', card.get('question_image'))
            card['answer_image'] = data.get('answer_image', card.get('answer_image'))
            card_found = True
            break
            
    if not card_found:
        return jsonify({"error": "Flashcard not found"}), 404

    Database.save_table("flash_cards", flashcards)
    return jsonify({"message": "Flashcard updated successfully"}), 200


@app.route('/api/flashcards/<int:flashcard_id>', methods=['DELETE'])
def delete_flashcard(flashcard_id):
    """
    Endpoint to delete a flashcard.
    """
    flashcards = Database.load_table("flash_cards")
    
    card_to_delete = next((fc for fc in flashcards if fc['id'] == flashcard_id), None)
    
    if not card_to_delete:
        return jsonify({"error": "Flashcard not found"}), 404

    updated_flashcards = [fc for fc in flashcards if fc['id'] != flashcard_id]
    Database.save_table("flash_cards", updated_flashcards)

    return jsonify({"message": "Flashcard deleted successfully"}), 200


if __name__ == '__main__':
    app.run(port=5001, debug=True) 