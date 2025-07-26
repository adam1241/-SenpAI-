from flask import Flask, request, Response
from flask_cors import CORS
import os
from cerebras.cloud.sdk import Cerebras
from dotenv import load_dotenv
from prompts.socratic_tutor import get_socratic_tutor_prompt

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

        # The first message is always the system prompt
        system_prompt = {
            "role": "system",
            "content": get_socratic_tutor_prompt()
        }
        
        # The history from the frontend is already formatted
        api_messages = [system_prompt] + conversation_history

        stream = client.chat.completions.create(
            messages=api_messages,
            model="qwen-3-235b-a22b",
            stream=True,
            max_completion_tokens=40000,
            temperature=0.6,
            top_p=0.95
        )

        buffer = ""
        in_think_block = False
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if not content:
                continue

            buffer += content

            while True:
                if in_think_block:
                    end_tag_pos = buffer.find("</think>")
                    if end_tag_pos != -1:
                        # End of think block. Update buffer and flip state.
                        buffer = buffer[end_tag_pos + len("</think>"):]
                        in_think_block = False
                    else:
                        # Still in a think block. Discard buffer and wait for
                        # more chunks to find the end tag.
                        buffer = ""
                        break
                else:  # not in_think_block
                    start_tag_pos = buffer.find("<think>")
                    if start_tag_pos != -1:
                        # Start of a think block. Yield content before it.
                        part_to_yield = buffer[:start_tag_pos]
                        if part_to_yield:
                            yield part_to_yield

                        # Update buffer to after the tag and flip state.
                        buffer = buffer[start_tag_pos + len("<think>"):]
                        in_think_block = True
                    else:
                        # No tags found. The whole buffer is valid content.
                        if buffer:
                            yield buffer
                        buffer = ""
                        break

    return Response(generate(), mimetype='text/plain')


if __name__ == '__main__':
    app.run(port=5001, debug=True) 