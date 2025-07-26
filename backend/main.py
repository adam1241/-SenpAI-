from flask import Flask, request, Response
from flask_cors import CORS
import os
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from database import Database

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

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


@app.route('/api/flashcards', methods=['GET'])
def get_flashcards():
    return Response(Database.load_table("flash_cards"), status=200)


if __name__ == '__main__':
    app.run(port=5001, debug=True) 