import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { ApiService } from "@/services/api";
import { LearningHeader } from "@/components/LearningHeader";
import { ChatInterface } from "@/components/ChatInterface";
import { NotebookView } from "@/components/NotebookView";
import { QuizView } from "@/components/QuizView";
import { HistoryView } from "@/components/HistoryView";
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
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "history" | "flashcards">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // --- Persistent User and Session IDs --- //
  const [userId] = useState(() => {
    let storedUserId = localStorage.getItem('senpai-userId');
    if (!storedUserId) {
      storedUserId = uuidv4();
      localStorage.setItem('senpai-userId', storedUserId);
    }
    return storedUserId;
  });

  const [sessionId, setSessionId] = useState(() => {
    let storedSessionId = localStorage.getItem('senpai-sessionId');
    if (!storedSessionId) {
      storedSessionId = uuidv4();
      localStorage.setItem('senpai-sessionId', storedSessionId);
    }
    return storedSessionId;
  });

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!userId || !sessionId) return;
      setIsLoadingHistory(true);
      try {
        const history = await ApiService.getConversations(userId, sessionId);
        if (history && history.length > 0) {
          const formattedHistory = history.map((msg: any, index: number) => ({
            id: `hist-${index}`,
            content: msg.content,
            isUser: msg.role === 'user',
            timestamp: new Date(), // Note: timestamp from DB is not used yet
          }));
          setMessages(formattedHistory);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        setMessages([]); // Clear messages on error
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchChatHistory();
  }, [userId, sessionId]); // Re-fetch when IDs change

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#quiz') {
      setActiveSection('quiz');
    } else if (hash === '#history') {
      setActiveSection('history');
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

  const handleNewChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('senpai-sessionId', newSessionId);
    setSessionId(newSessionId);
    setMessages([]); // Immediately clear messages for a new chat
    setActiveSection('chat'); // Switch to chat view for the new chat
  };

  const handleLoadSession = (newSessionId: string) => {
    localStorage.setItem('senpai-sessionId', newSessionId);
    setSessionId(newSessionId);
    setActiveSection('chat'); // Switch to chat view to see the loaded conversation
  };

  const renderActiveSection = () => {
    if (isLoadingHistory && activeSection === 'chat') {
      return (
        <div className="flex items-center justify-center h-full">
          <p>Loading conversation...</p>
        </div>
      );
    }

    switch (activeSection) {
      case "chat":
        return (
          <ChatInterface 
            onCreateFlashcard={handleCreateFlashcard} 
            messages={messages}
            setMessages={setMessages}
            userId={userId}
            sessionId={sessionId}
          />
        );
      case "notebook":
        return <NotebookView />;
      case "quiz":
        return <QuizView />;
      case "history":
        return <HistoryView userId={userId} onSelectSession={handleLoadSession} />;
      case "flashcards":
        return <FlashcardDecksView />;
      default:
        return (
          <ChatInterface 
            onCreateFlashcard={handleCreateFlashcard} 
            messages={messages}
            setMessages={setMessages}
            userId={userId}
            sessionId={sessionId}
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
        onNewChat={handleNewChat}
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
