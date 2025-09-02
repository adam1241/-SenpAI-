
from pydantic import BaseModel 


class Deck(BaseModel):
    id: int
    name: str
    description: str = ""
    
    
