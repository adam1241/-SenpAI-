from dataclasses import dataclass 

@dataclass
class Quizz:
    id: int
    title: str
    questions: list
