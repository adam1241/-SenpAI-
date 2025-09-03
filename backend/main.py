from flask import Flask, request, Response, jsonify, send_from_directory
from flask_cors import CORS
import os
import re
import json
import uuid
from werkzeug.utils import secure_filename
from datetime import datetime
from collections import defaultdict

from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from mem0 import Memory

from prompts.socratic_tutor import get_socratic_tutor_prompt
from tools.flash_cards_tool import FlashCardsTool
from tools.quizz_tool import QuizzTool
from tools.decks_tool import DecksTool
from utils.database import Database

load_dotenv()

app = Flask(__name__)

# --- CORRECT & ROBUST CORS SETUP ---
CORS(
    app,
    origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)
# --- END CORS SETUP ---


# --- START: Corrected Mem0 Initialization ---
config = {
    "vector_store": {
        "provider": "chroma",
        "config": { "collection_name": "senpai_memories", "path": "./mem0_chroma_db" }
    },
    "embedder": {
        "provider": "huggingface",
        "config": { "model": "sentence-transformers/all-MiniLM-L6-v2" }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "api_key": os.environ.get("CEREBRAS_API_KEY"),
            "openai_base_url": "https://api.cerebras.ai/v1",
            "model": "qwen-3-235b-a22b-instruct-2507"
        }
    }
}
memory = Memory.from_config(config)
# --- END: Corrected Mem0 Initialization ---

# Define a robust, absolute path for the uploads folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# --- Image Serving and Uploading ---
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
        file_url = f'{request.host_url.rstrip("/")}/uploads/{unique_filename}'
        print(f"--- [API UPLOAD] Generated file URL: {file_url} ---") # DEBUG
        return jsonify({"filePath": file_url}), 201
    return jsonify({"error": "File upload failed"}), 500

# --- Deck Import/Export ---
@app.route('/api/import', methods=['POST'])
def import_deck():
    data = request.get_json()
    if not data or 'name' not in data or 'flashcards' not in data:
        return jsonify({"error": "Invalid import file format"}), 400
    try:
        decks_tool = DecksTool()
        flash_cards_tool = FlashCardsTool()
        deck_data = {"name": data['name'], "description": data.get('description', '')}
        new_deck = decks_tool.add_deck(deck_data)
        flashcards_to_add = []
        for card in data['flashcards']:
            card['deck_id'] = new_deck.id
            flashcards_to_add.append(card)
        if flashcards_to_add:
            flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))
        return jsonify({"message": "Deck imported successfully", "deck_id": new_deck.id}), 201
    except Exception as e:
        print(f"Error importing deck: {e}")
        return jsonify({"error": str(e)}), 500

# --- Decks API ---
@app.route('/api/decks', methods=['GET'])
def get_decks():
    decks = Database.load_table("decks")
    return jsonify(decks)

@app.route('/api/decks/<int:deck_id>', methods=['GET'])
def get_deck(deck_id):
    deck = DecksTool().get_deck_by_id(deck_id)
    if deck:
        return jsonify(deck)
    return jsonify({"error": "Deck not found"}), 404

@app.route('/api/decks/manual', methods=['POST'])
def add_manual_deck():
    deck_data = request.get_json()
    print(f"--- [API] Received data for new deck: {deck_data} ---") # DEBUG
    if not deck_data:
        return Response("No deck data provided", status=400)
    try:
        decks_tool = DecksTool()
        new_deck = decks_tool.add_deck(deck_data)
        # Directly return the Pydantic model, Flask will handle serialization
        print(f"--- [API] Deck created successfully. Returning: {new_deck.model_dump()} ---") # DEBUG
        return jsonify(new_deck.model_dump()), 201
    except Exception as e:
        print(f"--- [API ERROR] Error adding manual deck: {e} ---") # DEBUG
        return jsonify({"error": str(e)}), 500

@app.route('/api/decks/<int:deck_id>', methods=['PUT'])
def update_deck(deck_id):
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
    try:
        decks_tool = DecksTool()
        decks_tool.delete_deck(deck_id)
        return jsonify({"message": f"Deck with ID {deck_id} and its flashcards have been deleted."}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"Error deleting deck: {e}")
        return jsonify({"error": "An unexpected error occurred."}), 500

# --- Flashcards API ---
@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    flashcards = Database.load_table("flash_cards")
    return jsonify(flashcards)

@app.route('/api/decks/<int:deck_id>/flashcards', methods=['GET'])
def get_flashcards_for_deck(deck_id):
    deck = DecksTool().get_deck_by_id(deck_id)
    if not deck:
        return jsonify({"error": "Deck not found"}), 404
    flashcards = FlashCardsTool().get_flash_cards_by_deck(deck_id)
    return jsonify(flashcards)

@app.route('/api/flashcards/manual', methods=['POST'])
def add_manual_flashcard():
    flashcard_data = request.get_json()
    if not flashcard_data:
        return Response("No flashcard data provided", status=400)
    try:
        flash_card_tool = FlashCardsTool()
        flash_card_tool.add_flash_cards(json.dumps(flashcard_data))
        return jsonify({"message": "Flashcard added successfully"}), 201
    except Exception as e:
        print(f"Error adding manual flashcard: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/flashcards/<int:card_id>', methods=['PUT'])
def update_flashcard(card_id):
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
    try:
        flash_card_tool = FlashCardsTool()
        flash_card_tool.delete_flash_card(card_id)
        return jsonify({"message": "Flashcard deleted successfully"}), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# --- Quizzes API ---
@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    quizzes = Database.load_table("quizzes")
    return jsonify(quizzes)

@app.route('/api/quizzes/manual', methods=['POST'])
def add_manual_quiz():
    quiz_data = request.get_json()
    if not quiz_data:
        return Response("No quiz data provided", status=400)
    try:
        quizz_tool = QuizzTool()
        quizz_tool.add_quiz(json.dumps(quiz_data))
        return jsonify({"message": "Quiz added successfully"}), 201
    except Exception as e:
        print(f"Error adding manual quiz: {e}")
        return jsonify({"error": str(e)}), 500

# --- History API ---
@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    user_id = request.args.get('user_id')
    session_id = request.args.get('session_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    all_history = Database.load_table("chat_history")
    user_history = [msg for msg in all_history if msg.get('user_id') == user_id]
    if not user_history:
        return jsonify([])
    target_session_id = session_id
    if not target_session_id:
        target_session_id = user_history[-1]['session_id']
    session_history = [msg for msg in user_history if msg.get('session_id') == target_session_id]
    return jsonify(session_history)

@app.route('/api/history', methods=['GET'])
def get_history():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    all_history = Database.load_table("chat_history")
    user_history = [msg for msg in all_history if msg.get('user_id') == user_id]
    sessions = defaultdict(list)
    for msg in user_history:
        sessions[msg['session_id']].append(msg)
    history_items = []
    for session_id, messages in sessions.items():
        if not messages:
            continue
        messages.sort(key=lambda x: x.get('timestamp', ''))
        first_user_message = next((msg['content'] for msg in messages if msg['role'] == 'user'), 'Conversation')
        preview_content = " ".join(msg['content'] for msg in messages)
        history_items.append({
            "id": session_id,
            "title": first_user_message[:50],
            "preview": preview_content[:200],
            "timestamp": messages[-1]['timestamp'],
            "type": "conversation",
            "masteryMoments": 0,
            "topics": []
        })
    history_items.sort(key=lambda x: x['timestamp'], reverse=True)
    return jsonify(history_items)

# --- Chat API ---
@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_id = data.get("user_id", "default_user")
    session_id = data.get("session_id", "default_session")
    conversation_history = data.get('messages', [])
    if not conversation_history:
        return Response("No messages provided", status=400)
    latest_user_message = conversation_history[-1]['content']
    try:
        search_results = memory.search(query=latest_user_message, user_id=user_id)
        if search_results and search_results.get("results"):
            relevant_memories = [entry['memory'] for entry in search_results["results"]]
        else:
            relevant_memories = []
    except Exception as e:
        print(f"Memory search failed: {e}")
        relevant_memories = []
    memory_context = "\n".join(relevant_memories)
    print(memory_context)

    def generate():
        full_response_content = ""
        client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
        decks = Database.load_table("decks")
        decks_json_string = json.dumps(decks, indent=2)
        system_prompt_content = get_socratic_tutor_prompt(
            user_memory=memory_context,
                flashcard_decks=decks_json_string
            )
        system_prompt = {"role": "system", "content": system_prompt_content}
        api_messages = [system_prompt] + conversation_history
        stream = client.chat.completions.create(
            messages=api_messages,
            model="qwen-3-235b-a22b-instruct-2507",
            stream=True, max_completion_tokens=40000, temperature=0.6, top_p=0.95
        )
        buffer = ""
        in_think_block = False
        flash_card_tool = FlashCardsTool()
        quizz_tool = QuizzTool()
        decks_tool = DecksTool()
        flashcards_action_regex = re.compile(r"//ACTION: CREATE_FLASHCARDS// //FLASHCARDS_JSON: (.*?)\\/")
        quiz_action_regex = re.compile(r"//ACTION: CREATE_QUIZ// //QUIZ_JSON: (.*?)\\/")
        deck_action_regex = re.compile(r"//ACTION: CREATE_DECK// //DECK_JSON: (.*?)\\/")

        def process_buffer(buf):
            nonlocal in_think_block
            action_handlers = [
                (flashcards_action_regex, lambda p: flash_card_tool.add_flash_cards(p)),
                (quiz_action_regex, lambda p: quizz_tool.add_quiz(p)),
                (deck_action_regex, lambda p: decks_tool.add_deck(json.loads(p)))
            ]
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
                        buf = regex.sub("", buf, 1)
                        match_found = True
                        break
                if not match_found:
                    break
            processed_output = ""
            while buf:
                if in_think_block:
                    end_tag = buf.find("</think>")
                    if end_tag != -1:
                        buf = buf[end_tag + len("</think>"):]
                        in_think_block = False
                    else:
                        buf = ""
                else:
                    start_tag = buf.find("<think>")
                    if start_tag != -1:
                        processed_output += buf[:start_tag]
                        buf = buf[start_tag + len("<think>"):]
                        in_think_block = True
                    else:
                        processed_output += buf
                        buf = ""
            return processed_output

        for chunk in stream:
            content = chunk.choices[0].delta.content
            if not content:
                continue
            full_response_content += content
            buffer += content
            with open("ai_output.log", "a", encoding="utf-8") as f:
                f.write(content)
            if '\n' in buffer:
                parts = buffer.split('\n')
                to_process = '\n'.join(parts[:-1]) + '\n'
                buffer = parts[-1]
                output = process_buffer(to_process)
                if output:
                    yield output
        if buffer:
            output = process_buffer(buffer)
            if output:
                yield output
        try:
            memory.add(
                messages=[
                    {"role": "user", "content": latest_user_message},
                    {"role": "assistant", "content": full_response_content}
                ],
                user_id=user_id,
                run_id=session_id
            )
        except Exception as e:
            print(f"Adding memory failed: {e}")
        try:
            timestamp = datetime.utcnow().isoformat()
            user_message_entry = { "user_id": user_id, "session_id": session_id, "role": "user", "content": latest_user_message, "timestamp": timestamp }
            ai_message_entry = { "user_id": user_id, "session_id": session_id, "role": "assistant", "content": full_response_content, "timestamp": timestamp }
            Database.add_to_table("chat_history", user_message_entry)
            Database.add_to_table("chat_history", ai_message_entry)
        except Exception as e:
            print(f"Saving chat history transcript failed: {e}")
    return Response(generate(), mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
