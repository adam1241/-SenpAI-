import json
from models import FlashCard
from utils import Database
from pydantic import ValidationError


class FlashCardsTool:

    def add_flash_card(self, flash_card_json_str: str):
        """
        Takes a JSON string, enriches it with required fields
        (id, difficulty), validates it, and adds it to the database.
        """
        try:
            # Convert JSON string to Python dict
            flash_card_data = json.loads(flash_card_json_str)

            # Enrich the data with fields required by the model
            existing_cards = Database.load_table("flash_cards")
            flash_card_data['id'] = len(existing_cards) + 1
            # Set a default difficulty if not provided
            flash_card_data['difficulty'] = flash_card_data.get('difficulty', "EASY")

            # Validate the complete data object
            validated_card = FlashCard.model_validate(flash_card_data)

            # Add the validated data (as a dict) to the database
            Database.add_to_table(
                "flash_cards", validated_card.model_dump(mode="json")
            )
        except ValidationError as e:
            raise ValueError(f"Pydantic validation error: {e}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")    
    