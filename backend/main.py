from flask import Flask, request, Response, jsonify, send_file
from flask_cors import CORS
import os
import re
import json
import uuid
import requests
import csv
import io
from werkzeug.utils import secure_filename
from datetime import datetime
from collections import defaultdict

from openai import OpenAI
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from mem0 import Memory

from prompts.socratic_tutor import get_socratic_tutor_prompt
from tools.flash_cards_tool import FlashCardsTool
from tools.quizz_tool import QuizzTool
from tools.decks_tool import DecksTool
from tools.image_analysis_tool import analyze_image_with_openrouter
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
            "api_key": os.environ.get("OPENROUTER_API_KEY"),
            "openai_base_url": "https://openrouter.ai/api/v1",
            "model": "openrouter/auto"
        }
    }
}
memory = Memory.from_config(config)
# --- END: Corrected Mem0 Initialization ---

# --- Image Uploading ---
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")
    if not IMGBB_API_KEY:
        return jsonify({"error": "IMGBB_API_KEY environment variable is not set"}), 500

    try:
        url = "https://api.imgbb.com/1/upload"
        payload = {
            "key": IMGBB_API_KEY,
        }
        files = {
            "image": (file.filename, file.read(), file.mimetype)
        }

        response = requests.post(url, params=payload, files=files)
        response.raise_for_status()

        result = response.json()
        if result.get("success"):
            image_url = result["data"]["url"]
            print(f"--- [IMGBB UPLOAD] Generated file URL: {image_url} ---")
            return jsonify({"filePath": image_url}), 201
        else:
            error_message = result.get("error", {}).get("message", "Unknown error from imgbb")
            print(f"--- [IMGBB UPLOAD ERROR] {error_message} ---")
            return jsonify({"error": f"Failed to upload to imgbb: {error_message}"}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error uploading to imgbb: {e}")
        return jsonify({"error": "File upload failed due to a network issue."}, 500)
    except Exception as e:
        print(f"An unexpected error occurred during upload: {e}")
        return jsonify({"error": "An unexpected server error occurred."}), 500

# --- Deck Import/Export ---
@app.route('/api/import', methods=['POST'])
def import_deck():
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request."}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400

    filename = secure_filename(file.filename)
    deck_name_from_file, file_ext = os.path.splitext(filename)
    file_ext = file_ext.lower()

    try:
        decks_tool = DecksTool()
        flash_cards_tool = FlashCardsTool()

        if file_ext == '.json':
            file_content = file.read().decode('utf-8')
            data = json.loads(file_content)
            
            # Case 1: Batch import (list of decks)
            if isinstance(data, list):
                imported_decks_count = 0
                for deck_item in data:
                    if 'name' not in deck_item or 'flashcards' not in deck_item:
                        continue # Skip malformed entries in the list
                    
                    deck_name = deck_item.get('name')
                    description = deck_item.get('description', '')
                    flashcards_to_add = deck_item.get('flashcards', [])

                    new_deck = decks_tool.add_deck({"name": deck_name, "description": description})
                    
                    if flashcards_to_add:
                        for card in flashcards_to_add:
                            card['deck_id'] = new_deck.id
                        flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))
                    
                    imported_decks_count += 1
                
                if imported_decks_count == 0:
                    return jsonify({"error": "No valid decks found in the JSON array."}), 400
                
                return jsonify({"message": f"{imported_decks_count} decks imported successfully"}), 201

            # Case 2: Single deck import (dict)
            elif isinstance(data, dict):
                if 'name' not in data or 'flashcards' not in data:
                    return jsonify({"error": "Invalid JSON format for single deck. 'name' and 'flashcards' keys are required."}), 400
                
                deck_name = data.get('name', deck_name_from_file)
                description = data.get('description', '')
                flashcards_to_add = data.get('flashcards', [])

                new_deck = decks_tool.add_deck({"name": deck_name, "description": description})
                
                if flashcards_to_add:
                    for card in flashcards_to_add:
                        card['deck_id'] = new_deck.id
                    flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))

                return jsonify({"message": "Deck imported successfully", "deck_id": new_deck.id}), 201
            
            else:
                return jsonify({"error": "Invalid JSON structure. Must be an object or a list of objects."}), 400

        elif file_ext == '.csv':
            file_content = file.read().decode('utf-8')
            csvfile = io.StringIO(file_content)
            reader = csv.DictReader(csvfile)
            
            fieldnames = reader.fieldnames
            if not fieldnames:
                 return jsonify({"error": "CSV file is empty or headers are missing."}), 400

            expected_headers = ['question', 'answer']
            if not all(h in fieldnames for h in expected_headers):
                 return jsonify({"error": f"Invalid CSV format. Required headers are: {', '.join(expected_headers)}."}), 400

            # Case 1: Batch import from CSV (deck_name column exists)
            if 'deck_name' in fieldnames:
                decks_with_cards = defaultdict(list)
                for row in reader:
                    deck_name = row.get("deck_name")
                    if not deck_name:
                        continue # Skip rows without a deck name
                    decks_with_cards[deck_name].append({
                        "question": row.get("question"), "answer": row.get("answer"),
                        "difficulty": row.get("difficulty", "MEDIUM"),
                        "question_image_url": row.get("question_image_url"), "answer_image_url": row.get("answer_image_url"),
                    })

                if not decks_with_cards:
                    return jsonify({"error": "No valid deck entries found in CSV file."}), 400

                imported_decks_count = 0
                for deck_name, flashcards_to_add in decks_with_cards.items():
                    new_deck = decks_tool.add_deck({"name": deck_name, "description": ""})
                    if flashcards_to_add:
                        for card in flashcards_to_add:
                            card['deck_id'] = new_deck.id
                        flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))
                    imported_decks_count += 1
                
                return jsonify({"message": f"{imported_decks_count} decks imported successfully from CSV"}), 201

            # Case 2: Single deck import from CSV (no deck_name column)
            else:
                flashcards_to_add = []
                for row in reader:
                    flashcards_to_add.append({
                        "question": row.get("question"), "answer": row.get("answer"),
                        "difficulty": row.get("difficulty", "MEDIUM"),
                        "question_image_url": row.get("question_image_url"), "answer_image_url": row.get("answer_image_url"),
                    })
                
                if not flashcards_to_add:
                    return jsonify({"error": "No flashcards found in the file."}), 400
                
                new_deck = decks_tool.add_deck({"name": deck_name_from_file, "description": ""})

                for card in flashcards_to_add:
                    card['deck_id'] = new_deck.id
                flash_cards_tool.add_flash_cards(json.dumps(flashcards_to_add))
                
                return jsonify({"message": "Deck imported successfully from CSV", "deck_id": new_deck.id}), 201

        else:
            return jsonify({"error": "Unsupported file format. Please upload a .json or .csv file."}), 400

    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON file content."}), 400
    except Exception as e:
        print(f"Error importing deck: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/decks/export/batch', methods=['POST'])
def export_decks_batch():
    try:
        data = request.get_json()
        deck_ids = data.get('deck_ids')
        file_format = data.get('format', 'json').lower()

        if not deck_ids or not isinstance(deck_ids, list):
            return jsonify({"error": "A list of 'deck_ids' is required."}), 400

        decks_tool = DecksTool()
        flash_cards_tool = FlashCardsTool()
        
        all_decks_data = []
        all_flashcards_data = []

        for deck_id in deck_ids:
            deck = decks_tool.get_deck_by_id(deck_id)
            if deck:
                flashcards = flash_cards_tool.get_flash_cards_by_deck(deck_id)
                deck['flashcards'] = flashcards
                all_decks_data.append(deck)
                # For CSV, add deck_name to each card
                for card in flashcards:
                    card_copy = card.copy()
                    card_copy['deck_name'] = deck.get('name')
                    all_flashcards_data.append(card_copy)

        if not all_decks_data:
            return jsonify({"error": "None of the provided deck IDs were found."}), 404
        
        # Sanitize filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_base = f"decks_export_{timestamp}"

        if file_format == 'json':
            json_buffer = io.BytesIO()
            json_buffer.write(json.dumps(all_decks_data, indent=2).encode('utf-8'))
            json_buffer.seek(0)
            return send_file(
                json_buffer,
                as_attachment=True,
                download_name=f"{filename_base}.json",
                mimetype='application/json'
            )

        elif file_format == 'csv':
            csv_output = io.StringIO()
            headers = ['deck_name', 'question', 'answer', 'difficulty', 'question_image_url', 'answer_image_url']
            writer = csv.DictWriter(csv_output, fieldnames=headers, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(all_flashcards_data)
            
            csv_buffer = io.BytesIO()
            csv_buffer.write(csv_output.getvalue().encode('utf-8'))
            csv_buffer.seek(0)
            return send_file(
                csv_buffer,
                as_attachment=True,
                download_name=f"{filename_base}.csv",
                mimetype='text/csv'
            )

        else:
            return jsonify({"error": "Unsupported file format"}), 400

    except Exception as e:
        print(f"Error during batch export: {e}")
        return jsonify({"error": "An internal error occurred during batch export."}), 500


@app.route('/api/decks/<int:deck_id>/export/<string:file_format>', methods=['GET'])
def export_deck(deck_id, file_format):
    try:
        decks_tool = DecksTool()
        deck = decks_tool.get_deck_by_id(deck_id)
        if not deck:
            return jsonify({"error": "Deck not found"}), 404

        flash_cards_tool = FlashCardsTool()
        flashcards = flash_cards_tool.get_flash_cards_by_deck(deck_id)

        # Sanitize deck name for filename
        sanitized_deck_name = secure_filename(deck.get('name', 'deck')).replace('_', ' ')

        if file_format.lower() == 'json':
            export_data = {
                "name": deck.get('name'),
                "description": deck.get('description'),
                "flashcards": [
                    {
                        "question": card.get('question'),
                        "answer": card.get('answer'),
                        "difficulty": card.get('difficulty'),
                        "question_image_url": card.get('question_image_url'),
                        "answer_image_url": card.get('answer_image_url')
                    } for card in flashcards
                ]
            }
            
            # Create an in-memory file for the JSON data
            json_buffer = io.BytesIO()
            json_buffer.write(json.dumps(export_data, indent=2).encode('utf-8'))
            json_buffer.seek(0)

            return send_file(
                json_buffer,
                as_attachment=True,
                download_name=f"{sanitized_deck_name}.json",
                mimetype='application/json'
            )

        elif file_format.lower() == 'csv':
            # Use StringIO for CSV writer
            csv_output = io.StringIO()
            
            # Define headers - ensure all possible keys are included
            headers = ['question', 'answer', 'difficulty', 'question_image_url', 'answer_image_url']
            writer = csv.DictWriter(csv_output, fieldnames=headers)
            writer.writeheader()
            
            for card in flashcards:
                # Prepare a row with all headers, defaulting missing values to empty string
                row = {h: card.get(h, '') for h in headers}
                writer.writerow(row)

            # Create an in-memory bytes buffer from the string buffer
            csv_buffer = io.BytesIO()
            csv_buffer.write(csv_output.getvalue().encode('utf-8'))
            csv_buffer.seek(0)
            
            return send_file(
                csv_buffer,
                as_attachment=True,
                download_name=f"{sanitized_deck_name}.csv",
                mimetype='text/csv'
            )

        else:
            return jsonify({"error": "Unsupported file format"}), 400

    except Exception as e:
        print(f"Error exporting deck: {e}")
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
    if not deck_data:
        return Response("No deck data provided", status=400)
    try:
        decks_tool = DecksTool()
        new_deck = decks_tool.add_deck(deck_data)
        return jsonify(new_deck.model_dump()), 201
    except Exception as e:
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
        
        first_user_message_content = messages[0]['content']
        if isinstance(first_user_message_content, list):
            first_user_message = next((part['text'] for part in first_user_message_content if part['type'] == 'text'), 'Conversation')
        else:
            first_user_message = first_user_message_content

        preview_parts = []
        for msg in messages:
            content = msg['content']
            if isinstance(content, list):
                text_part = next((part['text'] for part in content if part['type'] == 'text'), '')
                preview_parts.append(text_part)
            else:
                preview_parts.append(content)
        preview_content = " ".join(preview_parts)

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

    def generate():
        full_response_content = ""
        
        # try:
        #     search_results = memory.search(query=str(latest_user_message), user_id=user_id)
        #     if search_results and search_results.get("results"):
        #         relevant_memories = [entry['memory'] for entry in search_results["results"]]
        #     else:
        #         relevant_memories = []
        # except Exception as e:
        #     print(f"Memory search failed: {e}")
        #     relevant_memories = []
        # memory_context = "\n".join(relevant_memories)
        # print(memory_context)

        decks = Database.load_table("decks")
        decks_json_string = json.dumps(decks, indent=2)
        system_prompt_content = get_socratic_tutor_prompt(
            user_memory="", # Memory disabled for now
            flashcard_decks=decks_json_string
        )
        system_prompt = {"role": "system", "content": system_prompt_content}
        api_messages = [system_prompt] + conversation_history

        # Determine if we have an image to process
        image_url = None
        question = ""
        is_multimodal = isinstance(latest_user_message, list)
        if is_multimodal:
            text_parts = []
            for part in latest_user_message:
                if part.get('type') == 'image_url' and part.get('image_url', {}).get('url'):
                    image_url = part['image_url']['url']
                elif part.get('type') == 'text':
                    text_parts.append(part['text'])
            question = " ".join(text_parts)

        if image_url:
            try:
                if not question:
                    question = "What is in this image?"
                full_response_content = analyze_image_with_openrouter(image_url=image_url, question=question)
                yield full_response_content
            except Exception as e:
                print(f"Error analyzing image: {e}")
                yield "Sorry, I was unable to analyze the image."
        else:
            try:
                # --- START FIX: Convert message content to string for Cerebras ---
                string_api_messages = []
                for msg in api_messages:
                    new_msg = msg.copy()
                    if isinstance(new_msg['content'], list):
                        text_content = " ".join(part['text'] for part in new_msg['content'] if part.get('type') == 'text' and part.get('text'))
                        new_msg['content'] = text_content
                    string_api_messages.append(new_msg)
                # --- END FIX ---

                client = Cerebras(api_key=os.environ.get("CEREBRAS_API_KEY"))
                stream = client.chat.completions.create(
                    messages=string_api_messages,
                    model="qwen-3-235b-a22b-instruct-2507",
                    stream=True,
                    max_completion_tokens=20000,
                    temperature=0.7,
                    top_p=0.8
                )

                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response_content += content
                        yield content

            except Exception as e:
                print(f"Error with Cerebras API: {e}")
                yield "Sorry, I'm having trouble connecting to the text AI model."

        # --- START: Action Processing ---
        # After the full response is generated, check for and execute actions.
        try:
            # Handler for CREATE_FLASHCARDS
            if "//ACTION: CREATE_FLASHCARDS//" in full_response_content:
                print("--- [ACTION] Detected CREATE_FLASHCARDS ---")
                flashcards_json_match = re.search(r'//FLASHCARDS_JSON:\s*(\[.*?\]|\{.*?\})//', full_response_content, re.DOTALL)
                if flashcards_json_match:
                    flashcards_json_str = flashcards_json_match.group(1)
                    FlashCardsTool().add_flash_cards(flashcards_json_str)
                    print(f"--- [ACTION] Flashcards processed successfully ---")
                else:
                    print("--- [ACTION ERROR] CREATE_FLASHCARDS detected, but no valid FLASHCARDS_JSON found ---")

            if "//ACTION: CREATE_QUIZ//" in full_response_content:
                print("--- [ACTION] Detected CREATE_QUIZ ---")
                # Extract the JSON part of the quiz
                quiz_json_match = re.search(r'//QUIZ_JSON:\s*({.*?})//', full_response_content, re.DOTALL)
                if quiz_json_match:
                    quiz_json_str = quiz_json_match.group(1)
                    quizz_tool = QuizzTool()
                    quizz_tool.add_quiz(quiz_json_str)
                    print("--- [ACTION] Quiz created successfully ---")
                else:
                    print("--- [ACTION ERROR] CREATE_QUIZ detected, but no valid QUIZ_JSON found ---")
            
        except Exception as e:
            print(f"--- [ACTION ERROR] Failed to process AI action: {e} ---")
        # --- END: Action Processing ---

        # --- Temporarily disable memory.add to avoid credit errors ---
        # try:
        #     memory.add(
        #         messages=[
        #             {"role": "user", "content": str(latest_user_message)},
        #             {"role": "assistant", "content": full_response_content}
        #         ],
        #         user_id=user_id,
        #         run_id=session_id
        #     )
        # except Exception as e:
        #     print(f"Adding memory failed: {e}")
        
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