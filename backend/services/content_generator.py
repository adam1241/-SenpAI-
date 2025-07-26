import json
import os
import uuid
import anthropic
from dotenv import load_dotenv

load_dotenv()

DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'content.json')

# It's good practice to handle the case where the API key is not set.
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY environment variable not set.")

client = anthropic.Anthropic(api_key=api_key)

def _read_data():
    """Reads the content from the JSON data file."""
    if not os.path.exists(DATA_FILE):
        return {"quizzes": [], "flashcard_decks": []}
    try:
        with open(DATA_FILE, 'r') as f:
            content = f.read()
            if not content:
                return {"quizzes": [], "flashcard_decks": []}
            return json.loads(content)
    except (json.JSONDecodeError, FileNotFoundError):
        return {"quizzes": [], "flashcard_decks": []}

def _write_data(data):
    """Writes the given data to the JSON data file."""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def get_all_quizzes():
    """Returns all quizzes from the data file."""
    data = _read_data()
    return data.get("quizzes", [])

def get_all_flashcard_decks():
    """Returns all flashcard decks from the data file."""
    data = _read_data()
    return data.get("flashcard_decks", [])

def generate_quiz(topic: str):
    """
    Generates a new quiz based on a topic using Anthropic's Claude Sonnet.
    """
    prompt = f"""Please generate a quiz about '{topic}'.
The quiz should have 2 multiple-choice questions.
Return the output as a single JSON object with the following structure: {{ "title": "...", "description": "...", "difficulty": "...", "category": "...", "questions": [{{ "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": index, "explanation": "..." }}] }}.
Ensure the JSON is valid and complete."""

    try:
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        ).content[0].text

        quiz_data = json.loads(message)

        data = _read_data()
        new_quiz = {
            "id": str(uuid.uuid4()),
            "title": quiz_data.get("title", f"{topic.title()} Quiz"),
            "description": quiz_data.get("description", f"A quiz about {topic}."),
            "difficulty": quiz_data.get("difficulty", "medium"),
            "category": quiz_data.get("category", topic.title()),
            "estimatedTime": 5,
            "completedCount": 0,
            "questions": quiz_data.get("questions", [])
        }

        for q in new_quiz["questions"]:
            q['id'] = str(uuid.uuid4())

        if "quizzes" not in data:
            data["quizzes"] = []
        data["quizzes"].append(new_quiz)
        _write_data(data)
        return new_quiz

    except (json.JSONDecodeError, IndexError) as e:
        print(f"Error generating or parsing quiz: {e}")
        # Fallback to a simple structure if LLM fails
        return {"error": "Failed to generate quiz from LLM.", "details": str(e)}

def generate_flashcard_deck(topic: str):
    """
    Generates a new flashcard deck using Anthropic's Claude Sonnet.
    """
    prompt = f"""Please generate a flashcard deck about '{topic}'.
The deck should contain 2 flashcards.
Return the output as a single JSON object with the following structure: {{ "name": "...", "description": "...", "cards": [{{ "concept": "...", "question": "...", "answer": "..." }}] }}.
Ensure the JSON is valid and complete."""

    try:
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        ).content[0].text

        deck_data = json.loads(message)

        data = _read_data()
        new_deck = {
            "id": str(uuid.uuid4()),
            "name": deck_data.get("name", f"{topic.title()} Flashcards"),
            "description": deck_data.get("description", f"Flashcards about {topic}."),
            "cardCount": len(deck_data.get("cards", [])),
            "newCards": len(deck_data.get("cards", [])),
            "reviewCards": 0,
            "lastStudied": None,
            "cards": deck_data.get("cards", [])
        }

        for card in new_deck["cards"]:
            card['id'] = str(uuid.uuid4())

        if "flashcard_decks" not in data:
            data["flashcard_decks"] = []
        data["flashcard_decks"].append(new_deck)
        _write_data(data)
        return new_deck

    except (json.JSONDecodeError, IndexError) as e:
        print(f"Error generating or parsing flashcard deck: {e}")
        return {"error": "Failed to generate flashcard deck from LLM.", "details": str(e)}

def generate_chat_response(message: str, history: list):
    """
    Generates a chat response using Anthropic's Claude Sonnet.
    """
    system_prompt = "You are SenpAI, a friendly and encouraging AI learning assistant. Guide users to discover answers themselves rather than giving direct answers. Use the Socratic method. Occasionally, when a user shows understanding, create a 'Moment of Mastery'."
    
    messages = []
    for msg in history:
        messages.append({"role": "user" if msg.get('isUser') else "assistant", "content": msg.get('content')})
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=512,
            system=system_prompt,
            messages=messages
        ).content[0].text
        return response
    except Exception as e:
        print(f"Error generating chat response: {e}")
        return "I'm sorry, I encountered an error. Please try again."
