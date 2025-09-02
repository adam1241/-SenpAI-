import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, BookOpen, Calendar, TrendingUp, RefreshCw, Trash2, Pencil } from "lucide-react";
import { StudyModal } from "./StudyModal";
import { NewDeckModal } from "./NewDeckModal";
import { EditDeckModal } from "./EditDeckModal";
import { AddFlashcardModal } from "./AddFlashcardModal"; // Import the new modal
import { Input } from "@/components/ui/input";
import { getDecks, getFlashcards, saveManualDeck, deleteDeck, updateDeck, importDeck } from "@/services/api"; // Import API functions

// Interface for data coming from the backend
interface DeckFromAPI {
  id: number;
  name: string;
  description: string;
}

interface FlashcardFromAPI {
  id: number;
  question: string;
  answer: string;
  deck_id: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  last_reviewed: string;
  question_image_url?: string;
  answer_image_url?: string;
}

// Enriched interface for local state
interface Deck extends DeckFromAPI {
  cardCount: number;
  newCards: number; 
  reviewCards: number; 
  lastStudied?: Date; 
}

export const FlashcardDecksView = () => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allFlashcards, setAllFlashcards] = useState<FlashcardFromAPI[]>([]);
  const [cardsForStudy, setCardsForStudy] = useState<FlashcardFromAPI[]>([]);

  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [newDeckModalOpen, setNewDeckModalOpen] = useState(false);
  const [addFlashcardModalOpen, setAddFlashcardModalOpen] = useState(false); // State for the new modal
  const [editDeckModalOpen, setEditDeckModalOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || "";
  const importFileRef = useRef<HTMLInputElement>(null);

  const setSearchQuery = (value: string) => {
    setSearchParams(value ? { q: value } : {}, { replace: true });
  };

  const fetchData = useCallback(async () => {
    try {
      const [decksData, flashcardsData] = await Promise.all([
        getDecks(),
        getFlashcards(),
      ]);

      // Filter out decks with duplicate IDs to prevent React key errors
      const uniqueDecksData = decksData.filter((deck, index, self) =>
        index === self.findIndex((d) => d.id === deck.id)
      );
      
      setAllFlashcards(flashcardsData); 

      const enrichedDecks: Deck[] = uniqueDecksData.map(deck => {
        const cardsInDeck = flashcardsData.filter(card => card.deck_id === deck.id);
        const cardCount = cardsInDeck.length;
        
        let newCards = 0;
        let reviewCards = 0;
        const now = new Date();

        cardsInDeck.forEach(card => {
            const lastReviewed = new Date(card.last_reviewed);
            let dueDate = new Date(lastReviewed);

            switch (card.difficulty) {
                case "HARD":
                    newCards++;
                    dueDate.setDate(lastReviewed.getDate() + 1);
                    break;
                case "MEDIUM":
                    dueDate.setDate(lastReviewed.getDate() + 3);
                    break;
                case "EASY":
                    dueDate.setDate(lastReviewed.getDate() + 7);
                    break;
            }

            if (now >= dueDate) {
                reviewCards++;
            }
        });

        return {
          ...deck,
          cardCount: cardCount,
          newCards: newCards,
          reviewCards: reviewCards,
        };
      });

      setDecks(enrichedDecks);

    } catch (error) {
      console.error("Failed to fetch flashcard data:", error);
    }
  }, []);

  const filteredDecks = useMemo(() => {
    if (!searchQuery) {
      return decks;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return decks.filter(deck => {
      const deckMatches =
        deck.name.toLowerCase().includes(lowercasedQuery) ||
        deck.description.toLowerCase().includes(lowercasedQuery);

      const cardMatches = allFlashcards.some(
        card =>
          card.deck_id === deck.id &&
          (card.question.toLowerCase().includes(lowercasedQuery) ||
            card.answer.toLowerCase().includes(lowercasedQuery))
      );

      return deckMatches || cardMatches;
    });
  }, [searchQuery, decks, allFlashcards]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteDeck = async (deckId: number) => {
    if (window.confirm("Are you sure you want to delete this deck and all its cards?")) {
      try {
        await deleteDeck(deckId);
        toast.success("Deck deleted successfully!");
        fetchData(); // Refetch data to update the UI
      } catch (error) {
        console.error("Failed to delete deck:", error);
        toast.error("Failed to delete deck. Please try again.");
      }
    }
  };

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

  const handleCreateDeck = async (name: string, description: string) => {
    try {
      await saveManualDeck({ name, description });
      toast.success("Deck created successfully!");
      fetchData(); // Refetch all data
    } catch (error) {
      console.error("Failed to create deck:", error);
      toast.error("Failed to create deck. Please try again.");
    }
  };

  const handleUpdateDeck = async (deckId: number, name: string, description: string) => {
    try {
      await updateDeck(deckId, { name, description });
      toast.success("Deck updated successfully!");
      fetchData(); // Refetch all data
    } catch (error) {
      console.error("Failed to update deck:", error);
      toast.error("Failed to update deck. Please try again.");
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result;
            if (typeof content !== 'string') throw new Error("File content is not a string");
            const data = JSON.parse(content);

            // Basic validation
            if (!data.name || !Array.isArray(data.flashcards)) {
                throw new Error("Invalid file format: missing 'name' or 'flashcards' array.");
            }

            await importDeck(data);
            toast.success(`Deck "${data.name}" imported successfully!`);
            fetchData();
        } catch (error) {
            console.error("Failed to import deck:", error);
            if (error instanceof Error) {
                 toast.error(`Import failed: ${error.message}`);
            } else {
                 toast.error("An unknown error occurred during import.");
            }
        } finally {
            // Reset file input
            if (event.target) {
                event.target.value = "";
            }
        }
    };
    reader.readAsText(file);
  };

  const handleStudyDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    const studyCards = allFlashcards.filter(card => card.deck_id === deck.id);
    setCardsForStudy(studyCards);
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
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => importFileRef.current?.click()}>Import Deck</Button>
            <Input
                type="file"
                ref={importFileRef}
                className="hidden"
                accept=".json"
                onChange={handleFileImport}
            />
            <Button className="gap-2" onClick={() => setAddFlashcardModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Flashcard
            </Button>
            <Button className="gap-2" onClick={() => setNewDeckModalOpen(true)}>
              <Plus className="w-4 h-4" />
              New Deck
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
            <Input
                type="text"
                placeholder="Search decks or flashcards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
            />
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
                    {allFlashcards.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.map((deck) => (
          <Link to={`/decks/${deck.id}?q=${searchQuery}`} key={deck.id} className="no-underline">
            <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{deck.name}</CardTitle>
                    <CardDescription className="mt-1">{deck.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeckToEdit(deck);
                        setEditDeckModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteDeck(deck.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Cards:</span>
                        <span className="font-medium">{deck.cardCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Due for Review:</span>
                        <span className="font-medium text-primary">{deck.reviewCards}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Studied:</span>
                        <span className="font-medium">{formatLastStudied(deck.lastStudied)}</span>
                    </div>
                </div>
                
                <div className="pt-4 mt-auto">
                  <Button 
                    className="w-full" 
                    disabled={deck.reviewCards === 0}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleStudyDeck(deck);
                    }}
                  >
                    {deck.reviewCards > 0 ? "Study Now" : "No Cards Due"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Modals */}
      <StudyModal
        isOpen={studyModalOpen}
        onClose={() => {
            setStudyModalOpen(false);
            fetchData(); // Refetch data when the modal is closed
        }}
        deckName={selectedDeck?.name || ""}
        cards={cardsForStudy.map(card => ({ 
          id: card.id.toString(),
          question: card.question,
          answer: card.answer,
          concept: selectedDeck?.name || "Concept",
          question_image_url: card.question_image_url,
          answer_image_url: card.answer_image_url,
        }))}
      />

      <NewDeckModal
        isOpen={newDeckModalOpen}
        onClose={() => setNewDeckModalOpen(false)}
        onCreateDeck={handleCreateDeck}
      />

      <EditDeckModal
        isOpen={editDeckModalOpen}
        onClose={() => {
          setEditDeckModalOpen(false);
          setDeckToEdit(null);
        }}
        onUpdateDeck={handleUpdateDeck}
        deck={deckToEdit}
      />

      <AddFlashcardModal
        isOpen={addFlashcardModalOpen}
        onClose={() => setAddFlashcardModalOpen(false)}
        decks={decks}
        onFlashcardAdded={fetchData} // Pass the fetchData function to refetch data
      />
    </div>
  );
};