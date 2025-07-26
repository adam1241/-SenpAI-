import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Calendar, TrendingUp } from "lucide-react";
import { StudyModal } from "./StudyModal";
import { NewDeckModal } from "./NewDeckModal";

interface Deck {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  newCards: number;
  reviewCards: number;
  lastStudied?: Date;
}

export const FlashcardDecksView = () => {
  const [decks, setDecks] = useState<Deck[]>([
    {
      id: "1",
      name: "Mathematics Fundamentals",
      description: "Basic algebra, geometry, and calculus concepts",
      cardCount: 45,
      newCards: 3,
      reviewCards: 12,
      lastStudied: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    },
    {
      id: "2", 
      name: "Physics Concepts",
      description: "Classical mechanics and thermodynamics",
      cardCount: 32,
      newCards: 0,
      reviewCards: 8,
      lastStudied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: "3",
      name: "Chemistry Basics",
      description: "Periodic table, chemical bonds, and reactions",
      cardCount: 28,
      newCards: 0,
      reviewCards: 5,
      lastStudied: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
  ]);

  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [newDeckModalOpen, setNewDeckModalOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);

  // Sample cards for demo
  const sampleCards = [
    {
      id: "1",
      concept: "Algebra",
      question: "What is the quadratic formula?",
      answer: "x = (-b ± √(b² - 4ac)) / 2a, where a, b, and c are coefficients of ax² + bx + c = 0"
    },
    {
      id: "2", 
      concept: "Geometry",
      question: "What is the area of a circle?",
      answer: "A = πr², where r is the radius of the circle"
    },
    {
      id: "3",
      concept: "Calculus", 
      question: "What is the derivative of sin(x)?",
      answer: "The derivative of sin(x) is cos(x)"
    }
  ];

  const formatLastStudied = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getTotalNewCards = () => {
    return decks.reduce((total, deck) => total + deck.newCards, 0);
  };

  const getTotalReviewCards = () => {
    return decks.reduce((total, deck) => total + deck.reviewCards, 0);
  };

  const handleCreateDeck = (name: string, description: string) => {
    const newDeck: Deck = {
      id: (decks.length + 1).toString(),
      name,
      description,
      cardCount: 0,
      newCards: 0,
      reviewCards: 0,
    };
    setDecks([...decks, newDeck]);
  };

  const handleStudyDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    setStudyModalOpen(true);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Flashcard Decks</h1>
            <p className="text-muted-foreground">Organize and study your knowledge with spaced repetition</p>
          </div>
          <Button className="gap-2" onClick={() => setNewDeckModalOpen(true)}>
            <Plus className="w-4 h-4" />
            New Deck
          </Button>
        </div>

        {/* Study Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <BookOpen className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Cards</p>
                  <p className="text-2xl font-bold text-warning">{getTotalNewCards()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due for Review</p>
                  <p className="text-2xl font-bold text-primary">{getTotalReviewCards()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cards</p>
                  <p className="text-2xl font-bold text-success">
                    {decks.reduce((total, deck) => total + deck.cardCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <Card key={deck.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{deck.name}</CardTitle>
                  <CardDescription className="mt-1">{deck.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  {deck.newCards > 0 && (
                    <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                      {deck.newCards} new
                    </Badge>
                  )}
                  {deck.reviewCards > 0 && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {deck.reviewCards} due
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Cards:</span>
                  <span className="font-medium">{deck.cardCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Studied:</span>
                  <span className="font-medium">{formatLastStudied(deck.lastStudied)}</span>
                </div>
                
                <div className="pt-2">
                  <Button 
                    className="w-full" 
                    disabled={deck.newCards === 0 && deck.reviewCards === 0}
                    onClick={() => handleStudyDeck(deck)}
                  >
                    {deck.newCards > 0 || deck.reviewCards > 0 ? "Study Now" : "No Cards Due"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals */}
      <StudyModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        deckName={selectedDeck?.name || ""}
        cards={sampleCards}
      />

      <NewDeckModal
        isOpen={newDeckModalOpen}
        onClose={() => setNewDeckModalOpen(false)}
        onCreateDeck={handleCreateDeck}
      />
    </div>
  );
};