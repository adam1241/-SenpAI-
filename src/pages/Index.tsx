import { useState, useEffect } from "react";
import { LearningHeader } from "@/components/LearningHeader";
import { ChatInterface } from "@/components/ChatInterface";
import { NotebookView } from "@/components/NotebookView";
import { QuizView } from "@/components/QuizView";

import { FlashcardModal } from "@/components/FlashcardModal";
import { FlashcardDecksView } from "@/components/FlashcardDecksView";

// Lifted the Message interface here from ChatInterface
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
}

const Index = () => {
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "flashcards">("chat");
  // Lifted the messages state here
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#quiz') {
      setActiveSection('quiz');
    }
  }, []);

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
      
      case "flashcards":
        return <FlashcardDecksView />;
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
        newFlashcardsCount={newFlashcardsCount}
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
