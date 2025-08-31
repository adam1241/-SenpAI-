import json
from models import FlashCard
from utils import Database
from pydantic import ValidationError
from .decks_tool import DecksTool


class FlashCardsTool:

    def add_flash_card(self, flash_card_json_str: str):
        """
        Takes a JSON string that can contain either 'deck_id' or 'deck_name'.
        If 'deck_name' is provided, it finds the corresponding deck or creates a new one.
        Then, it enriches the flashcard data with required fields, validates it,
        and adds it to the database.
        """
        try:
            # Convert JSON string to Python dict
            flash_card_data = json.loads(flash_card_json_str)
            
            deck_id = flash_card_data.get("deck_id")
            deck_name = flash_card_data.get("deck_name")

            if not deck_id and deck_name:
                decks_tool = DecksTool()
                all_decks = decks_tool.get_decks()
                
                found_deck = None
                for deck in all_decks:
                    if deck['name'].lower() == deck_name.lower():
                        found_deck = deck
                        break
                
                if found_deck:
                    deck_id = found_deck['id']
                else:
                    # Create a new deck
                    new_deck_data = {"name": deck_name, "description": f"A deck for {deck_name}"}
                    new_deck = decks_tool.add_deck(new_deck_data)
                    deck_id = new_deck.id

            if not deck_id:
                raise ValueError("Flashcard must have a deck_id or a valid deck_name.")

            flash_card_data['deck_id'] = deck_id

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