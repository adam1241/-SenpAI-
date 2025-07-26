import { useState } from "react";
import { LearningHeader } from "@/components/LearningHeader";
import { ChatInterface } from "@/components/ChatInterface";
import { NotebookView } from "@/components/NotebookView";
import { QuizView } from "@/components/QuizView";
import { HistoryView } from "@/components/HistoryView";
import { FlashcardModal } from "@/components/FlashcardModal";

const Index = () => {
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "history">("chat");
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
        return <ChatInterface onCreateFlashcard={handleCreateFlashcard} />;
      case "notebook":
        return <NotebookView />;
      case "quiz":
        return <QuizView />;
      case "history":
        return <HistoryView />;
      default:
        return <ChatInterface onCreateFlashcard={handleCreateFlashcard} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <LearningHeader 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
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
