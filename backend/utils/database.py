


class Database:
    
    def __init(self):
        self.tables = {
            "flash_cards": "./database/flash_cards.json"
        }

    def load_table(self, table_name):
        with open(self.tables[table_name], "r") as f:
            return json.load(f)