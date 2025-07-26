


class FlashCardsTool:
    def __init__(self):
        self.flash_cards = []
    
    def add_flash_card(self, flash_card: FlashCard):
        self.flash_cards.append(flash_card)
    
    def remove_flash_card(self, flash_card):
        self.flash_cards.remove(flash_card)
    
    def get_flash_cards(self):
        return self.flash_cards