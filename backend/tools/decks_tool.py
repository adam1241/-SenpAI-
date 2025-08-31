import json
from models import Deck
from utils import Database
from pydantic import ValidationError


class DecksTool:

    def add_deck(self, deck_data: dict):
        """
        Takes a dictionary, enriches it with an ID,
        validates it, and adds it to the database.
        """
        try:
            # Enrich the data with an ID
            existing_decks = Database.load_table("decks")
            new_id = (max(deck['id'] for deck in existing_decks) + 1) if existing_decks else 1
            deck_data['id'] = new_id

            # Validate the complete data object
            validated_deck = Deck.model_validate(deck_data)

            # Add the validated data (as a dict) to the database
            Database.add_to_table(
                "decks", validated_deck.model_dump(mode="json")
            )
            return validated_deck
        except ValidationError as e:
            raise ValueError(f"Pydantic validation error: {e}")

    def get_decks(self):
        """
        Retrieves all decks from the database.
        """
        return Database.load_table("decks")

    def delete_deck(self, deck_id: int):
        """
        Deletes a deck and all its associated flashcards.
        """
        # Delete the deck
        decks = self.get_decks()
        initial_decks_length = len(decks)
        updated_decks = [deck for deck in decks if deck['id'] != deck_id]
        if len(updated_decks) == initial_decks_length:
            raise ValueError(f"Deck with ID {deck_id} not found.")
        Database.save_table("decks", updated_decks)

        # Delete associated flashcards
        flash_cards = Database.load_table("flash_cards")
        updated_flash_cards = [card for card in flash_cards if card['deck_id'] != deck_id]
        Database.save_table("flash_cards", updated_flash_cards)
