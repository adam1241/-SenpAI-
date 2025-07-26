from pydantic import BaseModel
from typing import List, Literal

class Question(BaseModel):
    question_text: str
    options: List[str]  # List of possible answers
    correct_answer: str

class Quizz(BaseModel):
    id: int
    title: str
    questions: List[Question]  # Now properly typed as list of Question objects
    difficulty: Literal["EASY", "MEDIUM", "HARD"]
    description: str
    time: int  # Time limit in minutes
    completed_times: int = 0  # Number of times completed
    best_score: int = 0  # Best score achieved 
