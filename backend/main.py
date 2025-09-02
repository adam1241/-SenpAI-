from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import os
import re
import json
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
# This configuration uses the new, correct structure from the documentation.
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
# CORRECTED: The class is named Memory, not Mem0
memory = Memory.from_config(config)
# --- END: Corrected Mem0 Initialization ---


@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_id = data.get("user_id", "default_user")
    session_id = data.get("session_id", "default_session")
    conversation_history = data.get('messages', [])

    if not conversation_history:
        return Response("No messages provided", status=400)

    latest_user_message = conversation_history[-1]['content']

    # 1. Search for relevant memories
    try:
        # CORRECTED: The search results are a dictionary with a "results" key
        search_results = memory.search(
            query=latest_user_message,
            user_id=user_id # NOTE: user_id is a direct argument, not in filters
        )
        if search_results and search_results.get("results"):
            # CORRECTED: The memory text is in the 'memory' field
            relevant_memories = [entry['memory'] for entry in search_results["results"]]
        else:
            relevant_memories = []
    except Exception as e:
        print(f"Memory search failed: {e}")
        relevant_memories = []

    # 2. Augment the prompt with retrieved memories
    memory_context = "\n".join(relevant_memories)
    print(memory_context)

    def generate():
        # BUG FIX: Initialize full_response_content to accumulate the response
        full_response_content = ""
        
        client = Cerebras(
            api_key=os.environ.get("CEREBRAS_API_KEY")
        )

        # Load available decks to provide context to the LLM
        decks = Database.load_table("decks")
        decks_json_string = json.dumps(decks, indent=2)

        # CORRECTED: Inject the retrieved memory_context into the system prompt
        system_prompt_content = get_socratic_tutor_prompt(
            user_memory=memory_context, # Pass the memories here
            flashcard_decks=decks_json_string
        )
        system_prompt = {
            "role": "system",
            "content": system_prompt_content
        }
        
        # The history from the frontend is already formatted
        api_messages = [system_prompt] + conversation_history

        # 3. Call the main LLM (Inference)
        stream = client.chat.completions.create(
            messages=api_messages,
            model="qwen-3-235b-a22b-instruct-2507",
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
            r"//ACTION: CREATE_FLASHCARDS// //FLASHCARDS_JSON: (.*?)\\/"
        )
        quiz_action_regex = re.compile(
            r"//ACTION: CREATE_QUIZ// //QUIZ_JSON: (.*?)\\/"
        )
        deck_action_regex = re.compile(
            r"//ACTION: CREATE_DECK// //DECK_JSON: (.*?)\\/"
        )

        def process_buffer(buf):
            # This function is preserved as is
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
            
            full_response_content += content
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

        # 4. Add to AI's long-term memory
        try:
            # CORRECTED: Using run_id for session, as shown in new docs
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
        
        # 5. Save transcript to chat_history.json
        try:
            timestamp = datetime.utcnow().isoformat()
            user_message_entry = { "user_id": user_id, "session_id": session_id, "role": "user", "content": latest_user_message, "timestamp": timestamp }
            ai_message_entry = { "user_id": user_id, "session_id": session_id, "role": "assistant", "content": full_response_content, "timestamp": timestamp }
            Database.add_to_table("chat_history", user_message_entry)
            Database.add_to_table("chat_history", ai_message_entry)
        except Exception as e:
            print(f"Saving chat history transcript failed: {e}")

    return Response(generate(), mimetype='text/plain')


@app.route('/api/decks', methods=['GET'])
def get_decks():
    """
    Endpoint to retrieve all flashcard decks.
    """
    decks = Database.load_table("decks")
    return jsonify(decks)


@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    """
    Endpoint to retrieve all flashcards.
    """
    flashcards = Database.load_table("flash_cards")
    return jsonify(flashcards)

@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    user_id = request.args.get('user_id')
    session_id = request.args.get('session_id') # New parameter

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    all_history = Database.load_table("chat_history")
    user_history = [msg for msg in all_history if msg.get('user_id') == user_id]
    
    if not user_history:
        return jsonify([])

    target_session_id = session_id
    if not target_session_id:
        # If no session_id is provided, fall back to the latest one
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
        
        # Create a preview of the conversation
        preview_content = " ".join(msg['content'] for msg in messages)
        
        history_items.append({
            "id": session_id,
            "title": first_user_message[:50],
            "preview": preview_content[:200],
            "timestamp": messages[-1]['timestamp'],
            "type": "conversation",
            "masteryMoments": 0, # Placeholder
            "topics": [] # Placeholder
        })
        
    # Sort sessions by the timestamp of the last message
    history_items.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return jsonify(history_items)

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


@app.route('/api/decks/<int:deck_id>', methods=['DELETE'])
def delete_deck(deck_id):
    """
    Endpoint to delete a deck and its associated flashcards.
    """
    try:
        decks_tool = DecksTool()
        decks_tool.delete_deck(deck_id)
        return jsonify({"message": f"Deck with ID {deck_id} and its flashcards have been deleted."} ), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"Error deleting deck: {e}")
        return jsonify({"error": "An unexpected error occurred."} ), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
