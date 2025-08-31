from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime, date

class FlashCard(BaseModel):
    id: int
    question: str
    answer: str
    deck_id: int
    # SRS Fields
    difficulty: Literal["EASY", "MEDIUM", "HARD"] # This might be deprecated by ease_factor
    last_reviewed: Optional[datetime] = None
    next_review_date: date = date.today()
    interval: int = 0  # in days
    ease_factor: float = 2.5  # Standard starting ease
    
    question_image: Optional[str] = None
    answer_image: Optional[str] = None