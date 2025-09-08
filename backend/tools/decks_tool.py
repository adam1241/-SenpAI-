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

    def get_deck_by_id(self, deck_id: int):
        """
        Retrieves a single deck by its ID.
        """
        decks = self.get_decks()
        for deck in decks:
            if deck['id'] == deck_id:
                return deck
        return None

    def update_deck(self, deck_id: int, deck_update_data: dict):
        """
        Updates a deck with new data.
        """
        try:
            decks = self.get_decks()
            deck_found = False
            updated_decks = []
            for deck in decks:
                if deck['id'] == deck_id:
                    deck_found = True
                    # Update the deck's data
                    deck['name'] = deck_update_data.get('name', deck['name'])
                    deck['description'] = deck_update_data.get('description', deck['description'])
                    
                    # Validate the updated data
                    validated_deck = Deck.model_validate(deck)
                    updated_decks.append(validated_deck.model_dump(mode="json"))
                else:
                    updated_decks.append(deck)

            if not deck_found:
                raise ValueError(f"Deck with ID {deck_id} not found.")

            Database.save_table("decks", updated_decks)
            
            # Find and return the updated deck data
            for updated_deck in updated_decks:
                if updated_deck['id'] == deck_id:
                    return updated_deck

        except ValidationError as e:
            raise ValueError(f"Pydantic validation error: {e}")


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

    def find_or_create_deck(self, deck_name: str, all_decks: list, description: str = None):
        """
        Finds a deck by name or creates it if it doesn't exist.
        Returns the deck object and the updated list of all decks.
        """
        found_deck = next((deck for deck in all_decks if deck['name'].lower() == deck_name.lower()), None)
        if found_deck:
            return found_deck, all_decks
        
        print(f"--- [TOOL] Deck '{deck_name}' not found. Creating it. ---")
        
        deck_description = description if description else f"A deck about {deck_name}."

        new_deck_obj = self.add_deck({
            "name": deck_name,
            "description": deck_description
        })
        # Add the new deck to our cached list to avoid re-creating it in the same batch
        all_decks.append(new_deck_obj.model_dump())
        return new_deck_obj.model_dump(), all_decks
