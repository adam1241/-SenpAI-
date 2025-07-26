from flask import Flask, jsonify, request
from flask_cors import CORS
from services.content_generator import (
    get_all_quizzes,
    generate_quiz,
    get_all_flashcard_decks,
    generate_flashcard_deck,
    generate_chat_response
)

app = Flask(__name__)
# In a real app, you'd want to restrict the origin.
# For development, '*' is fine.
CORS(app) 

@app.route('/api/quizzes', methods=['GET'])
def list_quizzes():
    """Endpoint to get all available quizzes."""
    quizzes = get_all_quizzes()
    return jsonify(quizzes)

@app.route('/api/quizzes', methods=['POST'])
def create_quiz():
    """Endpoint to generate a new quiz."""
    data = request.get_json()
    if not data or 'topic' not in data:
        return jsonify({"error": "Topic is required"}), 400
    
    topic = data['topic']
    new_quiz = generate_quiz(topic)
    return jsonify(new_quiz), 201

@app.route('/api/flashcards', methods=['GET'])
def list_flashcards():
    """Endpoint to get all available flashcard decks."""
    decks = get_all_flashcard_decks()
    return jsonify(decks)

@app.route('/api/flashcards', methods=['POST'])
def create_flashcards():
    """Endpoint to generate a new flashcard deck."""
    data = request.get_json()
    if not data or 'topic' not in data:
        return jsonify({"error": "Topic is required"}), 400
        
    topic = data['topic']
    new_deck = generate_flashcard_deck(topic)
    return jsonify(new_deck), 201

@app.route('/api/chat', methods=['POST'])
def chat():
    """Endpoint to handle chat messages."""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Message is required"}), 400

    message = data['message']
    history = data.get('history', [])
    response = generate_chat_response(message, history)
    return jsonify({"reply": response})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
from flask import Flask, request, Response
from flask_cors import CORS
import os
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route('/api/chat', methods=['POST'])
def chat():
    
    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return Response("No message provided", status=400)

    def generate():
        client = Cerebras(
            api_key=os.environ.get("CEREBRAS_API_KEY")
        )

        stream = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant."
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            model="qwen-3-235b-a22b",
            stream=True,
            max_completion_tokens=40000,
            temperature=0.6,
            top_p=0.95
        )

        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    return Response(generate(), mimetype='text/plain')


if __name__ == '__main__':
    app.run(port=5001, debug=True) 