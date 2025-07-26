
from dataclasses import dataclass 
from typing import Literal
from datetime import datetime

@dataclass
class FlashCard:
    id: int
    question: str
    answer: str
    deck_id: int
    difficulty: Literal["EASY", "MEDIUM", "HARD"]
    last_reviewed: datetime
