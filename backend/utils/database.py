import json
import os

class Database:
    """
    A simple database implementation using JSON files.
    """

    # Get the directory where this script is located
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    # Go up two levels: utils -> backend -> project root, then into database
    _database_dir = os.path.join(os.path.dirname(os.path.dirname(_script_dir)), "database")
    
    tables = {
        "flash_cards": os.path.join(_database_dir, "flash_cards.json"),
        "decks": os.path.join(_database_dir, "decks.json"),
        "quizzes": os.path.join(_database_dir, "quizzes.json")
    }

    @staticmethod
    def load_table(table_name):
        """
        Loads the data from a table. If the table does not exist, returns an empty list.
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