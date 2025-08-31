from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import os
import re
import json
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from prompts.socratic_tutor import get_socratic_tutor_prompt
from tools.flash_cards_tool import FlashCardsTool
from tools.quizz_tool import QuizzTool
from utils.database import Database

load_dotenv()

app = Flask(__name__)
CORS(app)


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
        
        flashcard_action_regex = re.compile(
            r"//ACTION: CREATE_FLASHCARD// //FLASHCARD_JSON: (.*?)\/\/"
        )
        quiz_action_regex = re.compile(
            r"//ACTION: CREATE_QUIZ// //QUIZ_JSON: (.*?)\/\/"
        )

        def process_buffer(buf):
            nonlocal in_think_block
            # First, handle flashcard actions
            match = flashcard_action_regex.search(buf)
            if match:
                json_payload = match.group(1)
                try:
                    flash_card_tool.add_flash_card(json_payload)
                except Exception as e:
                    print(f"Error processing flashcard action: {e}")
                # Remove the action text regardless of success
                buf = flashcard_action_regex.sub("", buf)

            # Second, handle quiz actions
            match = quiz_action_regex.search(buf)
            if match:
                json_payload = match.group(1)
                try:
                    quizz_tool.add_quiz(json_payload)
                except Exception as e:
                    print(f"Error processing quiz action: {e}")
                # Remove the action text regardless of success
                buf = quiz_action_regex.sub("", buf)

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

            with open("ai_output.log", "a") as f:
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


@app.route('/api/quizzes', methods=['GET'])
def get_quizzes():
    """
    Endpoint to retrieve all quizzes.
    """
    quizzes = Database.load_table("quizzes")
    return jsonify(quizzes)


if __name__ == '__main__':
    app.run(port=5001, debug=True) 