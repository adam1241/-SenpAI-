import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { LearningHeader } from "@/components/LearningHeader";
import { ChatInterface } from "@/components/ChatInterface";
import { NotebookView } from "@/components/NotebookView";
import { QuizView } from "@/components/QuizView";
import { HistoryView } from "@/components/HistoryView";
import { FlashcardModal } from "@/components/FlashcardModal";
import { FlashcardDecksView } from "@/components/FlashcardDecksView";
import ApiService, { Deck } from "@/services/api";

// Lifted the Message interface here from ChatInterface
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
}

const Index = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "history" | "flashcards">("chat");
  // Lifted the messages state here
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [decks, setDecks] = useState<Deck[]>([]);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [newCardsCount, setNewCardsCount] = useState(0);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);

  const [newFlashcardsCount, setNewFlashcardsCount] = useState(3);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [flashcardData, setFlashcardData] = useState<{
    concept: string;
    question: string;
    answer: string;
  }>({
    concept: "",
    question: "",
    answer: "",
  });

  const fetchDecks = async () => {
    setIsLoadingDecks(true);
    try {
      const decksData = await ApiService.getDecks();
      setDecks(decksData);
      const totalDue = decksData.reduce((sum, deck) => sum + deck.reviewCards, 0);
      const totalNew = decksData.reduce((sum, deck) => sum + deck.newCards, 0);
      setDueCardsCount(totalDue);
      setNewCardsCount(totalNew);
    } catch (error) {
      console.error("Failed to fetch decks:", error);
    } finally {
      setIsLoadingDecks(false);
    }
  };

  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveSection(location.state.defaultTab);
    }
    // Fetch decks initially for the badge count
    fetchDecks();
  }, [location.state]);

  const handleCreateFlashcard = (concept: string, question: string, answer: string) => {
    setFlashcardData({ concept, question, answer });
    setIsFlashcardModalOpen(true);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "chat":
        return (
          <ChatInterface 
            onCreateFlashcard={handleCreateFlashcard} 
            messages={messages}
            setMessages={setMessages}
          />
        );
      case "notebook":
        return <NotebookView />;
      case "quiz":
        return <QuizView />;
      case "history":
        return <HistoryView />;
      case "flashcards":
        return <FlashcardDecksView onDecksUpdate={fetchDecks} initialDecks={decks} isLoading={isLoadingDecks} />;
      default:
        return (
          <ChatInterface 
            onCreateFlashcard={handleCreateFlashcard} 
            messages={messages}
            setMessages={setMessages}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <LearningHeader 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
        dueCardsCount={dueCardsCount}
        newCardsCount={newCardsCount}
      />
      
      <main className="h-[calc(100vh-80px)]">
        {renderActiveSection()}
      </main>

      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => setIsFlashcardModalOpen(false)}
        initialConcept={flashcardData.concept}
        initialQuestion={flashcardData.question}
        initialAnswer={flashcardData.answer}
      />
    </div>
  );
};

export default Index;
