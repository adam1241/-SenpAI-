

from models import FlashCard
from utils import Database
from pydantic import ValidationError

class FlashCardsTool:

    def add_flash_card(self, flash_card: str):
        try:
            FlashCard.model_validate_json(flash_card)
            Database.add_to_table("flash_cards", flash_card)
        except ValidationError as e:
            raise ValueError(f"Validation error: {e}")    
    