import { useOutletContext } from "react-router-dom";
import { ChatInterface } from "@/components/ChatInterface";
import { NotebookView } from "@/components/NotebookView";
import { QuizView } from "@/components/QuizView";
import { HistoryView } from "@/components/HistoryView";
import { FlashcardDecksView } from "@/components/FlashcardDecksView";
import { Message } from "./MainLayout";
import { Dispatch, SetStateAction } from "react";

interface IndexContext {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  userId: string;
  sessionId: string;
  activeSection: "chat" | "notebook" | "quiz" | "history" | "flashcards";
  handleSectionChange: (section: "chat" | "notebook" | "quiz" | "history" | "flashcards") => void;
  fetchNewFlashcardsCount: () => void;
  handleCreateFlashcard: (concept: string, question: string, answer: string) => void;
  handleLoadSession: (sessionId: string) => void;
}

const Index = () => {
  const { 
    messages, 
    setMessages, 
    userId, 
    sessionId,
    activeSection,
    handleSectionChange,
    fetchNewFlashcardsCount,
    handleCreateFlashcard,
    handleLoadSession
  } = useOutletContext<IndexContext>();

  if (activeSection === 'chat') {
    return (
      <ChatInterface 
        onCreateFlashcard={handleCreateFlashcard} 
        messages={messages}
        setMessages={setMessages}
        userId={userId}
        sessionId={sessionId}
        onActionProcessed={fetchNewFlashcardsCount}
      />
    );
  }
  if (activeSection === 'notebook') return <NotebookView onSectionChange={handleSectionChange} />;
  if (activeSection === 'quiz') return <QuizView onSectionChange={handleSectionChange} />;
  if (activeSection === 'history') return <HistoryView userId={userId} onSelectSession={handleLoadSession} />;
  if (activeSection === 'flashcards') return <FlashcardDecksView onDataChange={fetchNewFlashcardsCount} onSectionChange={handleSectionChange}/>;

  return (
    <ChatInterface 
      onCreateFlashcard={handleCreateFlashcard} 
      messages={messages}
      setMessages={setMessages}
      userId={userId}
      sessionId={sessionId}
      onActionProcessed={fetchNewFlashcardsCount}
    />
  );
};

export default Index;
