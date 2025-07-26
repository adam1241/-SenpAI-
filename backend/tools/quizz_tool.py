

from models.quizz_model import Quizz
from utils.database import Database
from pydantic import ValidationError

class QuizzTool:

    def add_quiz(self, quiz):
        try:
            Quizz.model_validate_json(quiz)
            Database.add_to_table("quizzes", quiz)
        except ValidationError as e:
            raise ValueError(f"Validation error: {e}")