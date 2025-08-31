import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import ApiService, { Deck, Flashcard } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, MoreVertical, BookOpen } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FlashcardModal } from "./FlashcardModal";
import { StudyModal } from "./StudyModal";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const DeckDetailView = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('search');

  const [deck, setDeck] = useState<Deck | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<Flashcard | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);

  useEffect(() => {
    const fetchDeckDetails = async () => {
      if (!deckId) return;
      setIsLoading(true);
      try {
        const allDecks = await ApiService.getDecks();
        const currentDeck = allDecks.find(d => d.id === parseInt(deckId));
        setDeck(currentDeck || null);

        const allFlashcards = await ApiService.getFlashcards();
        let cardsInDeck = allFlashcards.filter(fc => fc.deck_id === parseInt(deckId));
        
        if (searchTerm) {
          cardsInDeck = cardsInDeck.filter(card => 
            card.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.answer.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setFlashcards(cardsInDeck);
      } catch (error) {
        toast.error("Failed to load deck details.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeckDetails();
  }, [deckId, searchTerm]);

  const handleSaveCard = async (
    question: string, 
    answer: string, 
    question_image?: string, 
    answer_image?: string
  ) => {
    if (cardToEdit) {
      // Editing existing card
      try {
        await ApiService.updateFlashcard(cardToEdit.id, { question, answer, question_image, answer_image });
        setFlashcards(prev => prev.map(fc => 
          fc.id === cardToEdit.id ? { ...fc, question, answer, question_image, answer_image } : fc
        ));
      } catch (error) {
        toast.error("Failed to update the card.");
        console.error(error);
        throw error; // Re-throw to be caught by the modal
      }
    } else {
      // Creating new card
      if (!deckId) return;
      try {
        const newCard = await ApiService.createFlashcard(
          parseInt(deckId), 
          question, 
          answer, 
          question_image, 
          answer_image
        );
        setFlashcards(prev => [...prev, newCard]);
        if (deck) {
          setDeck(prevDeck => ({ ...prevDeck!, cardCount: prevDeck!.cardCount + 1 }));
        }
      } catch (error) {
        toast.error("Failed to save the new card.");
        console.error(error);
        throw error;
      }
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await ApiService.deleteFlashcard(cardToDelete.id);
      setFlashcards(prev => prev.filter(fc => fc.id !== cardToDelete.id));
      if (deck) {
        setDeck(prevDeck => ({ ...prevDeck!, cardCount: prevDeck!.cardCount - 1 }));
      }
      toast.success("Flashcard deleted.");
    } catch (error) {
      toast.error("Failed to delete the card.");
      console.error(error);
    } finally {
      setCardToDelete(null);
    }
  };

  const openEditModal = (card: Flashcard) => {
    setCardToEdit(card);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setCardToEdit(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCardToEdit(null);
  };

  const openStudyModal = () => {
    if (flashcards.length === 0) {
      toast.info("This deck has no cards to study.");
      return;
    }
    setIsStudyModalOpen(true);
  };

  if (isLoading) {
    return <div>Loading...</div>; // TODO: Replace with a nice skeleton loader
  }

  if (!deck) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Deck not found</h2>
        <Button asChild>
          <Link to="/" state={{ defaultTab: "flashcards" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Decks
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/" state={{ defaultTab: "flashcards" }}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Decks
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{deck.name}</h1>
            <p className="text-muted-foreground mt-1">{deck.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={openStudyModal}>
              <BookOpen className="w-4 h-4" />
              Study All
            </Button>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="w-4 h-4" />
              Add New Card
            </Button>
          </div>
        </div>
        {searchTerm && (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
            Showing cards matching: <span className="font-semibold">"{searchTerm}"</span>. 
            <Link to={`/decks/${deck.id}`} className="ml-2 font-semibold underline">Clear filter</Link>
          </div>
        )}
      </div>

      {/* Flashcards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flashcards.length > 0 ? (
          flashcards.map((card) => (
            <Card key={card.id} className="relative group">
              <CardHeader>
                <CardTitle className="text-sm font-medium">QUESTION</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {`${card.question}${card.question_image ? `\n\n![Question Image](${ApiService.getBaseUrl()}${card.question_image})` : ''}`}
                </ReactMarkdown>
              </CardContent>
              <div className="border-t mt-4">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-success">ANSWER</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {`${card.answer}${card.answer_image ? `\n\n![Answer Image](${ApiService.getBaseUrl()}${card.answer_image})` : ''}`}
                  </ReactMarkdown>
                </CardContent>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => openEditModal(card)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setCardToDelete(card)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center text-muted-foreground mt-8">
            {searchTerm ? (
              <p>No cards found matching your search.</p>
            ) : (
              <>
                <p>This deck is empty.</p>
                <Button className="mt-4 gap-2" onClick={openCreateModal}>
                  <Plus className="w-4 h-4" />
                  Add the first card
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this flashcard. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FlashcardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveCard}
        deckName={deck.name}
        initialData={cardToEdit}
      />

      {deck && (
        <StudyModal
          isOpen={isStudyModalOpen}
          onClose={() => setIsStudyModalOpen(false)}
          deckName={deck.name}
          cards={flashcards.map(card => ({
            id: card.id.toString(),
            question: card.question,
            answer: card.answer,
            concept: deck.name,
            question_image: card.question_image,
            answer_image: card.answer_image,
          }))}
        />
      )}
    </div>
  );
};
