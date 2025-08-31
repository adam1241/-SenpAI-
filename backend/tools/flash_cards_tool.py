import json
from models import FlashCard
from utils import Database
from pydantic import ValidationError
from .decks_tool import DecksTool


class FlashCardsTool:

    def add_flash_cards(self, flash_cards_json_str: str):
        """
        Takes a JSON string representing a list of flashcards.
        For each card, it finds the corresponding deck or creates a new one,
        enriches the data, validates it, and adds it to the database.
        """
        try:
            # Convert JSON string to Python list of dicts
            flash_cards_data = json.loads(flash_cards_json_str)

            # Handle both single card (from manual entry) and list of cards (from AI)
            if not isinstance(flash_cards_data, list):
                flash_cards_data = [flash_cards_data]

            decks_tool = DecksTool()
            all_decks = decks_tool.get_decks()
            existing_cards = Database.load_table("flash_cards")
            next_card_id = (max(card['id'] for card in existing_cards) + 1) if existing_cards else 1

            for card_data in flash_cards_data:
                deck_id = card_data.get("deck_id")
                deck_name = card_data.get("deck_name")

                if not deck_id and deck_name:
                    found_deck = next((deck for deck in all_decks if deck['name'].lower() == deck_name.lower()), None)
                    
                    if found_deck:
                        deck_id = found_deck['id']
                    else:
                        # Create a new deck
                        print(f"Creating new deck named: {deck_name}")
                        new_deck_data = {"name": deck_name, "description": f"A deck for {deck_name}"}
                        new_deck = decks_tool.add_deck(new_deck_data)
                        deck_id = new_deck.id
                        # Add the new deck to our cached list to avoid re-creating it in the same batch
                        all_decks.append(new_deck.model_dump())

                if not deck_id:
                    raise ValueError("Flashcard must have a deck_id or a valid deck_name.")

                card_data['deck_id'] = deck_id
                card_data['id'] = next_card_id
                next_card_id += 1
                card_data['difficulty'] = card_data.get('difficulty', "EASY")

                validated_card = FlashCard.model_validate(card_data)
                Database.add_to_table(
                    "flash_cards", validated_card.model_dump(mode="json")
                )

        except ValidationError as e:
            print(f"Pydantic validation error for flashcard: {e}")
            print(f"Invalid flashcard data: {card_data}")
            raise ValueError(f"Pydantic validation error: {e}")
        except json.JSONDecodeError as e:
            print(f"Invalid JSON format for flashcard: {e}")
            print(f"Received JSON string: {flash_cards_json_str}")
            raise ValueError(f"Invalid JSON format: {e}")
        except Exception as e:
            print(f"An unexpected error occurred in add_flash_cards: {e}")
            raise e

    def get_flash_cards(self):
        """
        Retrieves all flashcards from the database.
        """
        return Database.load_table("flash_cards")

    def get_flash_cards_by_deck(self, deck_id: int):
        """
        Retrieves all flashcards for a specific deck.
        """
        all_cards = self.get_flash_cards()
        return [card for card in all_cards if card['deck_id'] == deck_id]


if __name__ == '__main__':
    # Example usage
    flash_cards_tool = FlashCardsTool()

    # Example 1: Add a flashcard to an existing deck by name
    flash_card_json_1 = '[{"deck_name": "My New Deck", "question": "What is 1+1?", "answer": "2"}]'
    try:
        flash_cards_tool.add_flash_cards(flash_card_json_1)
        print("Flashcard 1 added successfully.")
    except ValueError as e:
        print(e)

    # Example 2: Add a flashcard to a new deck by name
    flash_card_json_2 = '[{"deck_name": "Another Deck", "question": "What is the capital of France?", "answer": "Paris"}]'
    try:
        flash_cards_tool.add_flash_cards(flash_card_json_2)
        print("Flashcard 2 added successfully.")
    except ValueError as e:
        print(e)

    # Example 3: Add a flashcard using a deck_id
    flash_card_json_3 = '[{"deck_id": 1, "question": "What is Python?", "answer": "A programming language."}]'
    try:
        flash_cards_tool.add_flash_cards(flash_card_json_3)
        print("Flashcard 3 added successfully.")
    except ValueError as e:
        print(e)

    # Get all flashcards
    all_flash_cards = flash_cards_tool.get_flash_cards()
    print(f"All flashcards: {all_flash_cards}")

    # Get flashcards for a specific deck (e.g., deck_id 1)
    deck_1_cards = flash_cards_tool.get_flash_cards_by_deck(1)
    print(f"Flashcards in deck 1: {deck_1_cards}")
