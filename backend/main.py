from flask import Flask, request, Response, jsonify, send_from_directory
from flask_cors import CORS
import os
import re
import json
import uuid
from werkzeug.utils import secure_filename
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from prompts.socratic_tutor import get_socratic_tutor_prompt
from tools.flash_cards_tool import FlashCardsTool
from tools.quizz_tool import QuizzTool
from tools.decks_tool import DecksTool
from utils.database import Database

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        unique_filename = f"{uuid.uuid4()}.{ext}"
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Return the full URL path for the frontend
        file_url = f'{request.host_url.rstrip("/")}/uploads/{unique_filename}'
        return jsonify({"filePath": file_url}), 201
        
    return jsonify({"error": "File upload failed"}), 500


@app.route('/api/decks', methods=['GET'])
def get_decks():
    """
    Endpoint to retrieve all flashcard decks.
    """
    decks = Database.load_table("decks")
    return jsonify(decks)


@app.route('/api/decks/<int:deck_id>', methods=['GET'])
def get_deck(deck_id):
    """
    Endpoint to retrieve a single deck by its ID.
    """
    deck = DecksTool().get_deck_by_id(deck_id)
    if deck:
        return jsonify(deck)
    return jsonify({"error": "Deck not found"}), 404


@app.route('/api/decks/<int:deck_id>/flashcards', methods=['GET'])
def get_flashcards_for_deck(deck_id):
    """
    Endpoint to retrieve all flashcards for a specific deck.
    """
    # First, check if the deck exists to return a proper 404
    deck = DecksTool().get_deck_by_id(deck_id)
    if not deck:
        return jsonify({"error": "Deck not found"}), 404
        
    flashcards = FlashCardsTool().get_flash_cards_by_deck(deck_id)
    return jsonify(flashcards)


@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    """
    Endpoint to retrieve all flashcards.
    """
    flashcards = Database.load_table("flash_cards")
    return jsonify(flashcards)


@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    """
    Endpoint to retrieve all quizzes.
    """
    quizzes = Database.load_table("quizzes")
    return jsonify(quizzes)


@app.route('/api/quizzes/manual', methods=['POST'])
def add_manual_quiz():
    """
    Endpoint to manually add a new quiz.
    """
    quiz_data = request.get_json()
    if not quiz_data:
        return Response("No quiz data provided", status=400)

    try:
        # The QuizzTool now handles ID generation and validation
        quizz_tool = QuizzTool()
        # The tool expects a JSON string, so we dump the dict back to a string
        quizz_tool.add_quiz(json.dumps(quiz_data))
        return jsonify({"message": "Quiz added successfully"}), 201
    except Exception as e:
        print(f"Error adding manual quiz: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/flashcards/manual', methods=['POST'])
def add_manual_flashcard():
    """
    Endpoint to manually add a new flashcard.
    """
    flashcard_data = request.get_json()
    if not flashcard_data:
        return Response("No flashcard data provided", status=400)

    try:
        # The FlashCardsTool handles ID generation and validation
        flash_card_tool = FlashCardsTool()
        # The tool expects a JSON string, so we dump the dict back to a string
        flash_card_tool.add_flash_cards(json.dumps(flashcard_data))
        return jsonify({"message": "Flashcard added successfully"}), 201
    except Exception as e:
        print(f"Error adding manual flashcard: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/flashcards/<int:card_id>', methods=['PUT'])
def update_flashcard(card_id):
    """
    Endpoint to update a flashcard.
    """
    card_data = request.get_json()
    if not card_data:
        return Response("No flashcard data provided", status=400)
    try:
        flash_card_tool = FlashCardsTool()
        updated_card = flash_card_tool.update_flash_card(card_id, card_data)
        return jsonify(updated_card), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/flashcards/<int:card_id>', methods=['DELETE'])
def delete_flashcard(card_id):
    """
    Endpoint to delete a flashcard.
    """
    try:
        flash_card_tool = FlashCardsTool()
        flash_card_tool.delete_flash_card(card_id)
        return jsonify({"message": "Flashcard deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/decks/manual', methods=['POST'])
def add_manual_deck():
    """
    Endpoint to manually add a new deck.
    """
    deck_data = request.get_json()
    if not deck_data:
        return Response("No deck data provided", status=400)

    try:
        decks_tool = DecksTool()
        new_deck = decks_tool.add_deck(deck_data)
        return jsonify(new_deck.model_dump()), 201
    except Exception as e:
        print(f"Error adding manual deck: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/decks/<int:deck_id>', methods=['PUT'])
def update_deck(deck_id):
    """
    Endpoint to update an existing deck.
    """
    deck_data = request.get_json()
    if not deck_data:
        return Response("No deck data provided for update", status=400)

    try:
        decks_tool = DecksTool()
        updated_deck = decks_tool.update_deck(deck_id, deck_data)
        return jsonify(updated_deck), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"Error updating deck: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500


@app.route('/api/decks/<int:deck_id>', methods=['DELETE'])
def delete_deck(deck_id):
    """
    Endpoint to delete a deck and its associated flashcards.
    """
    try:
        decks_tool = DecksTool()
        decks_tool.delete_deck(deck_id)
        return jsonify({"message": f"Deck with ID {deck_id} and its flashcards have been deleted."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"Error deleting deck: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500


@app.route('/api/import', methods=['POST'])
def import_deck():
    """
    Endpoint to import a deck from a JSON file.
    """
    data = request.get_json()
    if not data or 'name' not in data or 'flashcards' not in data:
        return jsonify({"error": "Invalid import file format"}), 400

    try:
        decks_tool = DecksTool()
        flash_cards_tool = FlashCardsTool()

        # Create the new deck
        deck_data = {"name": data['name'], "description": data.get('description', '')}
        new_deck = decks_tool.add_deck(deck_data)

        # Prepare flashcards for the new deck
        flashcards_to_add = []
        for card in data['flashcards']:
            card['deck_id'] = new_deck.id
            flashcards_to_add.append(card)
        
        # Add flashcards in batch
        if flashcards_to_add:
            flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))

        return jsonify({"message": "Deck imported successfully", "deck_id": new_deck.id}), 201

    except Exception as e:
        print(f"Error importing deck: {e}")
        return jsonify({"error": str(e)}), 500


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
            model='qwen-3-235b-a22b-instruct-2507',
            stream=True,
            max_completion_tokens=40000,
            temperature=0.6,
            top_p=0.95
        )

        buffer = ""
        in_think_block = False
        flash_card_tool = FlashCardsTool()
        quizz_tool = QuizzTool()
        decks_tool = DecksTool()
        
        flashcards_action_regex = re.compile(
            r"//ACTION: CREATE_FLASHCARDS// //FLASHCARDS_JSON: (.*?)\/\/"
        )
        quiz_action_regex = re.compile(
            r"//ACTION: CREATE_QUIZ// //QUIZ_JSON: (.*?)\/\/"
        )
        deck_action_regex = re.compile(
            r"//ACTION: CREATE_DECK// //DECK_JSON: (.*?)\/\/"
        )

        def process_buffer(buf):
            nonlocal in_think_block

            action_handlers = [
                (flashcards_action_regex, lambda p: flash_card_tool.add_flash_cards(p)),
                (quiz_action_regex, lambda p: quizz_tool.add_quiz(p)),
                (deck_action_regex, lambda p: decks_tool.add_deck(json.loads(p)))
            ]

            # Loop to handle multiple actions in the same buffer
            while True:
                match_found = False
                for regex, handler in action_handlers:
                    match = regex.search(buf)
                    if match:
                        json_payload = match.group(1)
                        try:
                            handler(json_payload)
                        except Exception as e:
                            print(f"Error processing action for {regex.pattern}: {e}")
                        # Remove the action text and restart the loop
                        buf = regex.sub("", buf, 1)
                        match_found = True
                        break # Restart search from the beginning
                
                if not match_found:
                    break # No more actions found

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

            with open("ai_output.log", "a", encoding="utf-8") as f:
                f.write(content)
            
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)