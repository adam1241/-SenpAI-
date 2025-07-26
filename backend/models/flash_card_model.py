from pydantic import BaseModel
from typing import Literal
from datetime import datetime

class FlashCard(BaseModel):
    id: int
    question: str
    answer: str
    deck_id: int
    difficulty: Literal["EASY", "MEDIUM", "HARD"]
    last_reviewed: datetime = datetime.now()