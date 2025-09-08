import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Upload, RefreshCw, Pencil, Trash2, Download, CreditCard, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { StudyModal } from "./StudyModal";
import { NewDeckModal } from "./NewDeckModal";
import { EditDeckModal } from "./EditDeckModal";
import { AddFlashcardModal } from "./AddFlashcardModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDecks, getFlashcards, saveManualDeck, deleteDeck, updateDeck, importDeck, exportDecksBatch, exportDeck } from "@/services/api";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GenerateDeckPromptModal } from "./GenerateDeckPromptModal";
import ApiService from '@/services/api';

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

interface Deck extends DeckFromAPI {
  cardCount: number;
  newCards: number;
  reviewCards: number;
  lastStudied?: Date;
}

interface FlashcardDecksViewProps {
  onDataChange: (counts: { newCount: number; reviewCount: number }) => void;
  onSectionChange: (section: string) => void;
}

export const FlashcardDecksView = ({ onDataChange, onSectionChange }: FlashcardDecksViewProps) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [allFlashcards, setAllFlashcards] = useState<FlashcardFromAPI[]>([]);
  const [cardsForStudy, setCardsForStudy] = useState<FlashcardFromAPI[]>([]);
  const [studyModalOpen, setStudyModalOpen] = useState(false);
  const [newDeckModalOpen, setNewDeckModalOpen] = useState(false);
  const [addFlashcardModalOpen, setAddFlashcardModalOpen] = useState(false);
  const [editDeckModalOpen, setEditDeckModalOpen] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [deckToEdit, setDeckToEdit] = useState<Deck | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || "";
  const difficultyFilter = searchParams.get('difficulty') || "ALL";
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedDeckIds, setSelectedDeckIds] = useState<number[]>([]);

  const setSearchQuery = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set('q', value);
    else newParams.delete('q');
    setSearchParams(newParams, { replace: true });
  };

  const setDifficultyFilter = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "ALL") newParams.set('difficulty', value);
    else newParams.delete('difficulty');
    setSearchParams(newParams, { replace: true });
  };

  const fetchData = useCallback(async () => {
    try {
      const [decksData, flashcardsData] = await Promise.all([getDecks(), getFlashcards()]);
      const uniqueDecksData = decksData.filter((deck, index, self) => index === self.findIndex((d) => d.id === deck.id));
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
        return { ...deck, cardCount, newCards, reviewCards };
      });
      setDecks(enrichedDecks);
      // onDataChange();
    } catch (error) {
      console.error("Failed to fetch flashcard data:", error);
    }
  }, []);

  const filteredDecks = useMemo(() => {
    return decks.filter(deck => {
      const lowercasedQuery = searchQuery.toLowerCase();
      const deckMatches = deck.name.toLowerCase().includes(lowercasedQuery) || deck.description.toLowerCase().includes(lowercasedQuery);
      const cardsInDeck = allFlashcards.filter(card => card.deck_id === deck.id);
      const cardContentMatches = cardsInDeck.some(card => card.question.toLowerCase().includes(lowercasedQuery) || card.answer.toLowerCase().includes(lowercasedQuery));
      const difficultyMatches = difficultyFilter === "ALL" || cardsInDeck.some(card => card.difficulty === difficultyFilter);
      return (deckMatches || cardContentMatches) && difficultyMatches;
    });
  }, [searchQuery, decks, allFlashcards, difficultyFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteDeck = async (deckId: number) => {
    if (window.confirm("Are you sure you want to delete this deck and all its cards?")) {
      try {
        await deleteDeck(deckId);
        toast.success("Deck deleted successfully!");
        fetchData();
        setSelectedDeckIds(prev => prev.filter(id => id !== deckId)); // <-- Add this line
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

  const getTotalNewCards = () => decks.reduce((total, deck) => total + deck.newCards, 0);
  const getTotalReviewCards = () => decks.reduce((total, deck) => total + deck.reviewCards, 0);

  const handleCreateDeck = async (name: string, description: string) => {
    try {
      await saveManualDeck({ name, description });
      toast.success("Deck created successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to create deck:", error);
      toast.error("Failed to create deck. Please try again.");
    }
  };

  const handleUpdateDeck = async (deckId: number, name: string, description: string) => {
    try {
      await updateDeck(deckId, { name, description });
      toast.success("Deck updated successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to update deck:", error);
      toast.error("Failed to update deck. Please try again.");
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedExtensions = ['.json', '.csv'];
    const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error("Invalid file type. Please select a JSON or CSV file.");
      if (event.target) event.target.value = "";
      return;
    }
    try {
      await importDeck(file);
      toast.success("Deck imported successfully!");
      fetchData();
    } catch (error: any) {
      console.error("Failed to import deck:", error);
      toast.error(`Import failed: ${error.message || "An unknown error occurred"}`);
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const handleStudyDeck = (deck: Deck) => {
    setSelectedDeck(deck);
    
    const now = new Date();
    const cardsToReview = allFlashcards.filter(card => {
        if (card.deck_id !== deck.id) return false;

        const lastReviewed = new Date(card.last_reviewed);
        let dueDate = new Date(lastReviewed);

        switch (card.difficulty) {
            case "HARD":
                dueDate.setDate(lastReviewed.getDate() + 1);
                break;
            case "MEDIUM":
                dueDate.setDate(lastReviewed.getDate() + 3);
                break;
            case "EASY":
                dueDate.setDate(lastReviewed.getDate() + 7);
                break;
            default:
                return true; // If no difficulty, always include for review
        }
        return now >= dueDate;
    });

    if (cardsToReview.length === 0) {
        toast.info(`No cards are currently due for review in "${deck.name}".`);
        return;
    }

    setCardsForStudy(cardsToReview);
    setStudyModalOpen(true);
  };

  const handleEditDeck = (deck: Deck) => {
    setDeckToEdit(deck);
    setEditDeckModalOpen(true);
  };

  const handleSingleDeckExport = async (deckId: number, format: 'json' | 'csv') => {
    try {
      await exportDeck(deckId, format);
      toast.success(`Deck successfully exported as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error(`Failed to export deck as ${format}:`, error);
      toast.error(`Failed to export deck. Please try again.`);
    }
  };

  const handleToggleDeckSelection = (deckId: number, isSelected: boolean) => {
    setSelectedDeckIds(prev =>
      isSelected ? [...prev, deckId] : prev.filter(id => id !== deckId)
    );
  };
  
  const handleSelectAllDecks = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedDeckIds(filteredDecks.map(deck => deck.id));
    } else {
      setSelectedDeckIds([]);
    }
  };

  const handleBatchExport = async (format: 'json' | 'csv') => {
    if (selectedDeckIds.length === 0) {
      toast.error("No decks selected for export.");
      return;
    }
    try {
      await exportDecksBatch(selectedDeckIds, format);
      toast.success(`${selectedDeckIds.length} deck(s) are being exported as ${format.toUpperCase()}.`);
    } catch (error: any) {
      console.error(`Failed to export decks as ${format}:`, error);
      toast.error(`Export failed: ${error.message || "An unknown error occurred"}`);
    }
  };

  const handleGenerateDeck = async (prompt: string) => {
    try {
      // We use the chat service, as the backend will detect the action
      const response = await ApiService.streamSocraticTutor(
        [{ role: 'user', content: `Please create a flashcard deck about: ${prompt}` }],
        'user-id', // Replace with actual user ID in a real app
        'session-id' // Replace with actual session ID in a real app
      );
      
      // We must consume the stream to ensure the server-side action is complete
      // before we refresh the data.
      await response.text();

      toast.success('Deck generated successfully! Your new deck is now available.');
      fetchData(); // Refreshes the deck list
    } catch (error) {
      console.error('Failed to generate deck:', error);
      toast.error('Failed to generate deck. Please check the console for details.');
    }
  };

  return (
    <div className="h-full overflow-auto relative">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Flashcard Decks</h1>
                <p className="text-muted-foreground">Organize and study your knowledge with spaced repetition</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
              <GenerateDeckPromptModal onGenerate={handleGenerateDeck}>
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate with AI
                </Button>
              </GenerateDeckPromptModal>
              <Button onClick={() => importFileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Import Deck
              </Button>
              <Input type="file" ref={importFileRef} className="hidden" accept=".json,.csv" onChange={handleFileImport} />
              <Button className="gap-2" onClick={() => setNewDeckModalOpen(true)}><Plus className="w-4 h-4" /> New Deck</Button>
              {selectedDeckIds.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            Export Selected ({selectedDeckIds.length})
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBatchExport('json')}>
                            As JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBatchExport('csv')}>
                            As CSV
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg"><Plus className="w-5 h-5 text-warning" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">New Cards</p>
                  <p className="text-2xl font-bold text-warning">{getTotalNewCards()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Calendar className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Due for Review</p>
                  <p className="text-2xl font-bold text-primary">{getTotalReviewCards()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg"><TrendingUp className="w-5 h-5 text-success" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cards</p>
                  <p className="text-2xl font-bold text-success">{allFlashcards.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mb-6 flex gap-4">
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Difficulties</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
              </SelectContent>
            </Select>
            <Input type="text" placeholder="Search decks or flashcards..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
            <Checkbox
                id="select-all"
                checked={filteredDecks.length > 0 && selectedDeckIds.length === filteredDecks.length}
                onCheckedChange={(checked) => handleSelectAllDecks(!!checked)}
                aria-label="Select all decks"
                disabled={filteredDecks.length === 0}
            />
            <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <div key={deck.id} className="relative">
              <div className="absolute top-3 left-3 z-20">
                  <Checkbox
                      checked={selectedDeckIds.includes(deck.id)}
                      onCheckedChange={(isSelected) => handleToggleDeckSelection(deck.id, !!isSelected)}
                      aria-label={`Select deck ${deck.name}`}
                      onClick={(e) => e.stopPropagation()}
                  />
              </div>
              <Link to={`/decks/${deck.id}?q=${searchQuery}&difficulty=${difficultyFilter}`} className="no-underline">
                <Card className={`hover:shadow-lg transition-shadow h-full flex flex-col ${selectedDeckIds.includes(deck.id) ? 'border-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="pl-6">
                        <CardTitle className="text-lg">{deck.name}</CardTitle>
                        <CardDescription className="mt-1">{deck.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                    <Download className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                <DropdownMenuItem onClick={() => handleSingleDeckExport(deck.id, 'json')}>
                                    Export as JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSingleDeckExport(deck.id, 'csv')}>
                                    Export as CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditDeck(deck); }}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteDeck(deck.id); }}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Cards:</span><span className="font-medium">{deck.cardCount}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Due for Review:</span><span className="font-medium text-primary">{deck.reviewCards}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last Studied:</span><span className="font-medium">{formatLastStudied(deck.lastStudied)}</span></div>
                    </div>
                    <div className="pt-4 mt-auto">
                      <Button className="w-full" disabled={deck.reviewCards === 0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleStudyDeck(deck); }}>
                        {deck.reviewCards > 0 ? `Study ${deck.reviewCards} card(s) now` : "No Cards Due"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </div>

        <StudyModal isOpen={studyModalOpen} onClose={() => { setStudyModalOpen(false); fetchData(); }} deckName={selectedDeck?.name || ""} cards={cardsForStudy.map(card => ({ id: card.id.toString(), question: card.question, answer: card.answer, concept: selectedDeck?.name || "Concept", question_image_url: card.question_image_url, answer_image_url: card.answer_image_url, }))} />
        <NewDeckModal isOpen={newDeckModalOpen} onClose={() => setNewDeckModalOpen(false)} onCreateDeck={handleCreateDeck} />
        <EditDeckModal isOpen={editDeckModalOpen} onClose={() => { setEditDeckModalOpen(false); setDeckToEdit(null); }} onUpdateDeck={handleUpdateDeck} deck={deckToEdit} />
        <AddFlashcardModal isOpen={addFlashcardModalOpen} onClose={() => setAddFlashcardModalOpen(false)} decks={decks} onFlashcardAdded={fetchData} />
      </div>
    </div>
  );
};