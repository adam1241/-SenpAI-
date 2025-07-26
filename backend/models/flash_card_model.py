
from dataclasses import dataclass 
from typing import Literal

@dataclass
class FlashCard:
    id: int
    question: str
    answer: str
    category: str
    difficulty: Literal["easy", "medium", "hard"]
    
