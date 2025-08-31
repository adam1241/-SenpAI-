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
            deck_data['id'] = len(existing_decks) + 1

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
