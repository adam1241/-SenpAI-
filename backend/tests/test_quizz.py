#!/usr/bin/env python3

import sys
import os
import json

# Add the backend directory to Python path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools import QuizzTool
from models import Quizz, Question

def test_quizz_tool():
    """Test the QuizzTool functionality"""
    
    # Create tool instance
    tool = QuizzTool()
    
    # Test JSON string for a valid quiz
    quiz_json = '''
    {
        "id": 1,
        "title": "Python Basics Quiz",
        "questions": [
            {
                "question_text": "What is Python?",
                "options": ["A programming language", "A snake", "A web framework", "A database"],
                "correct_answer": "A programming language"
            },
            {
                "question_text": "Which of these is a Python web framework?",
                "options": ["Django", "React", "Angular", "Vue"],
                "correct_answer": "Django"
            }
        ],
        "difficulty": "EASY",
        "description": "A basic quiz about Python programming language",
        "time": 10,
        "completed_times": 0,
        "best_score": 0
    }
    '''
    
    print("Testing Quizz validation and saving...")
    print(f"JSON input: {quiz_json}")
    
    try:
        # Test the add_quiz function
        tool.add_quiz(quiz_json)
        print("✅ Quiz added successfully!")
        
        # Verify it was saved by checking the database file
        from utils.database import Database
        saved_quizzes = Database.load_table("quizzes")
        print(f"✅ Total quizzes in database: {len(saved_quizzes)}")
        print(f"✅ Last saved quiz: {saved_quizzes[-1] if saved_quizzes else 'None'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def test_invalid_quizz():
    """Test with invalid quiz data"""
    
    # Create tool instance
    tool = QuizzTool()
    
    # Test with invalid data - missing required fields and invalid difficulty
    invalid_quiz_json = '''
    {
        "id": "not_a_number",
        "title": "",
        "questions": [],
        "difficulty": "INVALID_DIFFICULTY",
        "description": "Test quiz",
        "time": -5
    }
    '''
    
    print("Testing invalid quiz...")
    print(f"Invalid JSON input: {invalid_quiz_json}")
    
    try:
        tool.add_quiz(invalid_quiz_json)
        print("❌ Should have failed but didn't!")
    except Exception as e:
        print(f"✅ Correctly caught error: {e}")

def test_question_model():
    """Test the Question model validation"""
    
    print("Testing Question model...")
    
    # Test valid question
    try:
        valid_question = Question(
            question_text="What is 2+2?",
            options=["3", "4", "5", "6"],
            correct_answer="4"
        )
        print(f"✅ Valid question created: {valid_question.question_text}")
    except Exception as e:
        print(f"❌ Error creating valid question: {e}")
    

def test_quizz_model():
    """Test the Quizz model validation"""
    
    print("Testing Quizz model...")
    
    # Test valid quiz
    try:
        valid_questions = [
            Question(
                question_text="What is Python?",
                options=["Language", "Snake", "Framework"],
                correct_answer="Language"
            )
        ]
        
        valid_quiz = Quizz(
            id=1,
            title="Test Quiz",
            questions=valid_questions,
            difficulty="MEDIUM",
            description="A test quiz",
            time=15
        )
        print(f"✅ Valid quiz created: {valid_quiz.title}")
        print(f"✅ Quiz has {len(valid_quiz.questions)} questions")
    except Exception as e:
        print(f"❌ Error creating valid quiz: {e}")
    
    # Test invalid quiz - invalid difficulty
    try:
        invalid_quiz = Quizz(
            id=1,
            title="Test Quiz",
            questions=[],
            difficulty="SUPER_HARD",  # Invalid difficulty
            description="A test quiz",
            time=15
        )
        print("❌ Should have failed for invalid difficulty!")
    except Exception as e:
        print(f"✅ Correctly caught error for invalid difficulty: {e}")

if __name__ == "__main__":
    print("=== Quizz Tool Test ===")
    test_quizz_tool()
    print("\n" + "="*50 + "\n")
    test_invalid_quizz()
    print("\n" + "="*50 + "\n")
    test_question_model()
    print("\n" + "="*50 + "\n")
    test_quizz_model()
    print("=== Test Complete ===")
