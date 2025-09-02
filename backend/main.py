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
from utils.database import Database

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.after_request
def after_request(response):
    header = response.headers
    header['Access-Control-Allow-Origin'] = 'http://localhost:8080'
    header['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    header['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

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
        action_regex = re.compile(
            r"//ACTION: CREATE_FLASHCARD// //FLASHCARD_JSON: (.*?)\/\/"
        )

        def process_buffer(buf):
            # This function is preserved as is
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
            
            full_response_content += content
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

if __name__ == '__main__':
    app.run(port=5001, debug=True)
