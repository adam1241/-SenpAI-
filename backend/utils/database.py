import json
import os

class Database:
    """
    A simple database implementation using JSON files.
    """

    tables = {
        "flash_cards": "../database/flash_cards.json",
        "decks": "../database/decks.json",
        "quizzes": "../database/quizzes.json"
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