

import json
from models.quizz_model import Quizz
from utils.database import Database
from pydantic import ValidationError

class QuizzTool:

    def add_quiz(self, quiz_json_string):
        try:
            # 1. Parse the incoming JSON string into a Python dictionary.
            quiz_data = json.loads(quiz_json_string)

            # 2. Load existing quizzes to determine the next ID.
            quizzes = Database.load_table("quizzes")
            if not quizzes:
                next_id = 1
            else:
                # Find the maximum existing ID and add 1
                max_id = max(q['id'] for q in quizzes)
                next_id = max_id + 1

            # 3. Add the new id to the quiz dictionary.
            quiz_data['id'] = next_id

            # 4. Create a Quizz object from the dictionary to validate it.
            validated_quiz = Quizz(**quiz_data)

            # 5. Use Database.add_to_table to save the new quiz dictionary.
            Database.add_to_table("quizzes", validated_quiz.model_dump())

        except ValidationError as e:
            raise ValueError(f"Validation error: {e}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {e}")