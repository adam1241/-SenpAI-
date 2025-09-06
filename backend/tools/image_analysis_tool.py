import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def analyze_image_with_openrouter(image_url: str, question: str = "What is in this image?") -> str:
    """
    Analyzes an image using the Qwen 2.5 VL model from OpenRouter.

    Args:
        image_url: The URL of the image to analyze.
        question: The question to ask about the image.

    Returns:
        The text extracted from the image.
    """
    payload = {
        "model": "google/gemma-3-27b-it:free",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": question
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ]
    }
    print("Sending payload to OpenRouter:")
    print(json.dumps(payload, indent=2))

    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8080",
            "X-Title": "SenpAI",
        },
        data=json.dumps(payload)
    )
    
    if response.status_code != 200:
        print("Error from OpenRouter:")
        print(response.text)

    response.raise_for_status()
    return response.json()['choices'][0]['message']['content']