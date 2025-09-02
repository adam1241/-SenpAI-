# --- START OF FILE backend/seed_database.py ---

import os
import json
import shutil
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Add the backend directory to the path to allow importing our modules
import sys
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from mem0 import Memory
from utils.database import Database

load_dotenv()

# --- 1. Define the Sample Conversation Data ---
# We use one user_id across multiple session_ids to simulate a long-term user history.
TEST_USER_ID = "default_user"

sample_conversations = [
    # Conversation 1: Biology (with a specific mistake)
    {
        "session_id": "session_biology_1",
        "messages": [
            {"role": "user", "content": "Can you help me understand photosynthesis?"},
            {"role": "assistant", "content": "Of course! To start, where do you think photosynthesis primarily happens in a plant?"},
            {"role": "user", "content": "I think it's in the chlorophyll."},
            {"role": "assistant", "content": "That's a great guess, you're very close! Chlorophyll is the green pigment that captures light, but it's located inside a specific part of the cell. Does the word 'chloroplast' ring a bell?"},
            {"role": "user", "content": "Oh, right! So the chlorophyll is inside the chloroplast, and the chloroplast is where photosynthesis happens."},
            {"role": "assistant", "content": "Exactly! You've got it. That's a key concept."}
        ]
    },
    # Conversation 2: JavaScript (with a learning preference)
    {
        "session_id": "session_javascript_1",
        "messages": [
            {"role": "user", "content": "I'm struggling with JavaScript closures."},
            {"role": "assistant", "content": "Closures can be tricky! How do you prefer to learn new programming concepts? Through code examples, or maybe an analogy?"},
            {"role": "user", "content": "I learn best with analogies."},
            {"role": "assistant", "content": "Perfect. Think of a closure like a backpack. A function carries this backpack with it wherever it goes, and inside that backpack are all the variables it needs from the place it was created."}
        ]
    },
    # Conversation 3: History (with a specific interest)
    {
        "session_id": "session_history_1",
        "messages": [
            {"role": "user", "content": "Tell me about the Roman Empire."},
            {"role": "assistant", "content": "That's a huge topic! Is there any specific area that interests you? For example, their military, their government, or maybe their engineering?"},
            {"role": "user", "content": "I'm particularly interested in their engineering feats, like the aqueducts."},
            {"role": "assistant", "content": "An excellent choice. The aqueducts were marvels of engineering. What problem do you think they were trying to solve by building such massive structures?"}
        ]
    }
]

def seed_database():
    print("--- Starting Database Seeding Process ---")

    # --- 2. Reset Existing History ---
    print("Resetting databases...")

    # Reset AI Memory (Vector Store)
    chroma_db_path = "./mem0_chroma_db"
    if os.path.exists(chroma_db_path):
        try:
            shutil.rmtree(chroma_db_path)
            print(f"  - Successfully deleted ChromaDB directory: {chroma_db_path}")
        except OSError as e:
            print(f"  - Error deleting ChromaDB directory: {e.strerror}")
    else:
        print("  - ChromaDB directory not found, skipping deletion.")

    # Reset Chat Transcript (JSON file)
    history_file_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'chat_history.json')
    try:
        with open(history_file_path, 'w') as f:
            json.dump([], f)
        print(f"  - Successfully cleared chat history file: {history_file_path}")
    except Exception as e:
        print(f"  - Error clearing chat history file: {e}")

    print("Reset complete.")

    # --- 3. Initialize Memory System ---
    print("Initializing memory system...")
    config = {
        "vector_store": { "provider": "chroma", "config": { "collection_name": "senpai_memories", "path": chroma_db_path }},
        "embedder": { "provider": "huggingface", "config": { "model": "sentence-transformers/all-MiniLM-L6-v2" }},
        "llm": { "provider": "openai", "config": { "api_key": os.environ.get("CEREBRAS_API_KEY"), "openai_base_url": "https://api.cerebras.ai/v1", "model": "qwen-3-235b-a22b-instruct-2507" }}
    }
    memory = Memory.from_config(config)
    print("Memory system initialized.")

    # --- 4. Populate Databases with Sample Data ---
    print("Populating databases with sample conversations...")
    total_messages = 0
    # Start timestamps from a few days ago
    base_timestamp = datetime.now(timezone.utc) - timedelta(days=len(sample_conversations))

    for conv_index, conversation in enumerate(sample_conversations):
        session_id = conversation["session_id"]
        messages = conversation["messages"]
        print(f"  - Processing session: {session_id} ({len(messages)} messages)")

        # Each conversation happens on a subsequent day
        session_timestamp = base_timestamp + timedelta(days=conv_index)

        for i in range(0, len(messages), 2):
            user_msg = messages[i]
            ai_msg = messages[i+1]
            
            # Increment timestamp for each message pair
            msg_timestamp = (session_timestamp + timedelta(minutes=i*2)).isoformat()
            user_msg_with_ts = {**user_msg, "timestamp": msg_timestamp}
            ai_msg_with_ts = {**ai_msg, "timestamp": msg_timestamp}

            # Add to AI Memory
            memory.add(
                messages=[user_msg, ai_msg],
                user_id=TEST_USER_ID,
                run_id=session_id
            )

            # Add to Chat Transcript
            user_transcript_entry = { "user_id": TEST_USER_ID, "session_id": session_id, **user_msg_with_ts }
            ai_transcript_entry = { "user_id": TEST_USER_ID, "session_id": session_id, **ai_msg_with_ts }
            Database.add_to_table("chat_history", user_transcript_entry)
            Database.add_to_table("chat_history", ai_transcript_entry)
            total_messages += 2
            
    print(f"Seeding complete. Added {len(sample_conversations)} conversations ({total_messages} messages) for user '{TEST_USER_ID}'.")
    print("--- Seeding Process Finished ---")

if __name__ == '__main__':
    seed_database()

# --- END OF FILE backend/seed_database.py ---