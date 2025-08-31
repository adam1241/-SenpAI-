import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Calendar, TrendingUp, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StudyModal } from "./StudyModal";
import { NewDeckModal } from "./NewDeckModal";
import ApiService, { Deck, Flashcard as FlashcardFromAPI } from "@/services/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";


interface FlashcardDecksViewProps {
  initialDecks: Deck[];
  isLoading: boolean;
  onDecksUpdate: () => void;
}

export const FlashcardDecksView = ({ initialDecks, isLoading, onDecksUpdate }: FlashcardDecksViewProps) => {
  const [decks, setDecks] = useState<Deck[]>(initialDecks);
  const [allFlashcards, setAllFlashcards] = useState<FlashcardFromAPI[]>([]);
  const [cardsForStudy, setCardsForStudy] = useState<FlashcardFromAPI[]>([]);

  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [newDeckModalOpen, setNewDeckModalOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<Deck | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    setDecks(initialDecks);
  }, [initialDecks]);

  useEffect(() => {
    // This effect handles searching. The initial load is handled by the parent.
    const handler = setTimeout(async () => {
      try {
        const decksData = await ApiService.getDecks(searchTerm);
        setDecks(decksData);
      } catch (error) {
        console.error("Failed to fetch searched decks:", error);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    // Fetch all flashcards once for the study modal functionality
    const fetchAllCards = async () => {
      if (allFlashcards.length === 0) {
        try {
          const flashcardsData = await ApiService.getFlashcards();
          setAllFlashcards(flashcardsData);
        } catch (error) {
          console.error("Failed to fetch flashcards:", error);
        }
      }
    };
    fetchAllCards();
  }, [allFlashcards.length]);

  // TODO: Fetch cards for the selected deck from the backend
  const sampleCards = [];

  const handleCreateDeck = async (name: string, description: string) => {
    try {
      await ApiService.createDeck(name, description);
      onDecksUpdate(); // Trigger refetch in parent
    } catch (error) {
      console.error("Failed to create deck:", error);
      throw error;
    }
  };

  const handleDeleteDeck = async () => {
    if (!deckToDelete) return;

    try {
      await ApiService.deleteDeck(deckToDelete.id);
      onDecksUpdate(); // Trigger refetch in parent
      toast.success(`Deck "${deckToDelete.name}" deleted.`);
    } catch (error) {
      console.error("Failed to delete deck:", error);
      toast.error("Failed to delete deck.");
    } finally {
      setDeckToDelete(null);
    }
  };

  const handleStudyDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    
    const today = new Date().toISOString().split('T')[0];

    // Filter for new cards (interval 0) and cards due for review
    const dueCards = allFlashcards.filter(card => {
      if (card.deck_id !== deck.id) return false;
      
      const isNew = !card.interval || card.interval === 0;
      const isDue = card.next_review_date && card.next_review_date <= today;

      return isNew || isDue;
    });

    setCardsForStudy(dueCards);
    setStudyModalOpen(true);
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

        <div className="mb-6">
          <Input
            type="text"
            placeholder="Search in decks and cards..."
            className="w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                    {decks.reduce((total, deck) => total + deck.cardCount, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Decks Grid */}
      {isLoading ? (
        <p>Loading...</p> // Replace with a skeleton loader later
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <div key={deck.id} className="relative">
              <Link
                to={`/decks/${deck.id}${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`}
                className="no-underline"
              >
                <Card className="hover:shadow-lg transition-shadow h-full">
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
                        <span className="font-medium">{formatLastStudied(deck.lastStudied as Date | undefined)}</span>
                      </div>
                      <div className="pt-2">
                        <Button
                          className="w-full"
                          disabled={deck.newCards === 0 && deck.reviewCards === 0}
                          onClick={(e) => {
                            e.preventDefault(); // Prevent navigation
                            handleStudyDeck(deck);
                          }}
                        >
                          {deck.reviewCards > 0 ? `Study ${deck.reviewCards} cards` : "No Cards to Study"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <div
                className="absolute top-2 right-2"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => alert("Edit clicked for " + deck.name)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeckToDelete(deck)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals & Dialogs */}
      <AlertDialog open={!!deckToDelete} onOpenChange={() => setDeckToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the deck "{deckToDelete?.name}" and all its associated cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeck}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StudyModal
        isOpen={studyModalOpen}
        onClose={() => setStudyModalOpen(false)}
        deckName={selectedDeck?.name || ""}
        cards={cardsForStudy.map(card => ({ 
          id: card.id.toString(),
          question: card.question,
          answer: card.answer,
          concept: selectedDeck?.name || "Concept",
          question_image: card.question_image,
          answer_image: card.answer_image,
        }))}
      />

      <NewDeckModal
        isOpen={newDeckModalOpen}
        onClose={() => setNewDeckModalOpen(false)}
        onCreateDeck={handleCreateDeck}
      />
    </div>
  );
};