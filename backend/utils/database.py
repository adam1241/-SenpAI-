import json
import os

class Database:
    def __init__(self):
        self.tables = {
            "flash_cards": "./database/flash_cards.json"
        }

    def load_table(self, table_name):
        if os.path.exists(self.tables[table_name]):
            with open(self.tables[table_name], "r") as f:
                return json.load(f)
        return []

    def add_to_table(self, table_name, data):
        # Load existing data
        existing_data = self.load_table(table_name)
        # Append new data
        existing_data.append(data)
        # Write back the complete list
        with open(self.tables[table_name], "w") as f:
            json.dump(existing_data, f, indent=2)