#!/usr/bin/env python3

import sys
import os
import json

# Add the backend directory to Python path so we can import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools import FlashCardsTool
from models import FlashCard

def test_flashcard_tool():
    """Test the FlashCardsTool functionality"""
    
    # Create tool instance
    tool = FlashCardsTool()
    
    # Test JSON string
    flashcard_json = '''
    {
        "id": 1,
        "question": "What is Python?",
        "answer": "Python is a high-level programming language known for its simplicity and readability.",
        "deck_id": 1,
        "difficulty": "EASY",
        "last_reviewed": "2025-07-26T16:08:30.123456"
    }
    '''
    
    print("Testing FlashCard validation and saving...")
    print(f"JSON input: {flashcard_json}")
    
    try:
        # Test the add_flash_card function
        tool.add_flash_card(flashcard_json)
        print("✅ Flashcard added successfully!")
        
        # Verify it was saved by checking the database file
        from utils.database import Database
        saved_cards = Database.load_table("flash_cards")
        print(f"✅ Total flashcards in database: {len(saved_cards)}")
        print(f"✅ Last saved card: {saved_cards[-1] if saved_cards else 'None'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def test_invalid_flashcard():
    """Test with invalid data"""
    
    tool = FlashCardsTool()
    
    # Test with invalid JSON
    invalid_json = '''
    {
        "id": "not_a_number",
        "question": "",
        "answer": "Some answer",
        "deck_id": 1,
        "difficulty": "INVALID_DIFFICULTY"
    }
    '''
    
    print("\nTesting invalid flashcard...")
    print(f"Invalid JSON input: {invalid_json}")
    
    try:
        tool.add_flash_card(invalid_json)
        print("❌ This should have failed!")
    except Exception as e:
        print(f"✅ Correctly caught error: {e}")

if __name__ == "__main__":
    print("=== FlashCard Tool Test ===")
    test_flashcard_tool()
    test_invalid_flashcard()
    print("=== Test Complete ===")
