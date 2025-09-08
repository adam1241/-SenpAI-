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
            
            cards_to_add = []

            for card_data in flash_cards_data:
                deck_name = card_data.get("deck_name")
                if not deck_name:
                    print(f"Skipping flashcard due to missing 'deck_name': {card_data}")
                    continue

                deck_description = card_data.get("deck_description")

                # Find or create the deck
                deck, all_decks = decks_tool.find_or_create_deck(deck_name, all_decks, description=deck_description)
                deck_id = deck['id']
                
                # Prepare the new flashcard data
                new_card = card_data.copy()
                new_card['id'] = next_card_id
                new_card['deck_id'] = deck_id
                new_card.setdefault('difficulty', "EASY")
                new_card.setdefault('last_reviewed', "1970-01-01T00:00:00Z")

                try:
                    # Validate and store the card for batch adding
                    validated_card = FlashCard.model_validate(new_card)
                    cards_to_add.append(validated_card.model_dump(mode="json"))
                    next_card_id += 1
                except ValidationError as e:
                    print(f"Pydantic validation error for flashcard: {e}")
                    print(f"Invalid flashcard data: {new_card}")
                    # Optionally skip this card and continue with others
                    continue
            
            # Batch add all validated cards to the database
            if cards_to_add:
                Database.add_to_table("flash_cards", cards_to_add, batch=True)

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

    def update_flash_card(self, card_id: int, card_update_data: dict):
        """
        Updates a flashcard with new data.
        """
        try:
            all_cards = self.get_flash_cards()
            card_found = False
            updated_cards = []
            for card in all_cards:
                if card['id'] == card_id:
                    card_found = True
                    # Update fields if provided
                    card['question'] = card_update_data.get('question', card['question'])
                    card['answer'] = card_update_data.get('answer', card['answer'])
                    card['question_image_url'] = card_update_data.get('question_image_url', card.get('question_image_url'))
                    card['answer_image_url'] = card_update_data.get('answer_image_url', card.get('answer_image_url'))
                    card['difficulty'] = card_update_data.get('difficulty', card['difficulty'])
                    card['last_reviewed'] = card_update_data.get('last_reviewed', card['last_reviewed'])
                    
                    # Validate the updated data
                    validated_card = FlashCard.model_validate(card)
                    updated_cards.append(validated_card.model_dump(mode="json"))
                else:
                    updated_cards.append(card)

            if not card_found:
                raise ValueError(f"Flashcard with ID {card_id} not found.")

            Database.save_table("flash_cards", updated_cards)
            
            for updated_card in updated_cards:
                if updated_card['id'] == card_id:
                    return updated_card
        
        except ValidationError as e:
            raise ValueError(f"Pydantic validation error: {e}")

    def delete_flash_card(self, card_id: int):
        """
        Deletes a single flashcard by its ID.
        """
        all_cards = self.get_flash_cards()
        initial_cards_length = len(all_cards)
        updated_cards = [card for card in all_cards if card['id'] != card_id]

        if len(updated_cards) == initial_cards_length:
            raise ValueError(f"Flashcard with ID {card_id} not found.")
            
        Database.save_table("flash_cards", updated_cards)


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
