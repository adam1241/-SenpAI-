import json
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_BASE_DIR))


class Database:
    """
    A simple database implementation using JSON files.
    """

    tables = {
        "flash_cards": os.path.join(
            _PROJECT_ROOT, "database", "flash_cards.json"
        ),
        "decks": os.path.join(_PROJECT_ROOT, "database", "decks.json"),
        "quizzes": os.path.join(_PROJECT_ROOT, "database", "quizzes.json")
    }

    @staticmethod
    def load_table(table_name):
        """
        Loads data from a table.
        If the table doesn't exist, returns an empty list.
        """
        if os.path.exists(Database.tables[table_name]):
            with open(Database.tables[table_name], "r") as f:
                return json.load(f)
        return []

    @staticmethod
    def add_to_table(table_name, data):
        """
        Adds data to a table.
        """
        # Load existing data
        existing_data = Database.load_table(table_name)
        # Append new data
        existing_data.append(data)
        # Write back the complete list
        with open(Database.tables[table_name], "w") as f:
            json.dump(existing_data, f, indent=2)

    @staticmethod
    def save_table(table_name, data):
        """
        Saves data to a table, overwriting the existing content.
        """
        with open(Database.tables[table_name], "w") as f:
            json.dump(data, f, indent=2)