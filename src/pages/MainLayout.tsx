import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { ApiService, getFlashcards } from "@/services/api";
import { AppSidebar } from "@/components/AppSidebar";
import { FlashcardModal } from "@/components/FlashcardModal";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  deck_id: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  last_reviewed: string;
}

// Lifted the Message interface here from ChatInterface
export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
}

const MainLayout = () => {
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "history" | "flashcards">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newFlashcardsCount, setNewFlashcardsCount] = useState(0);

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

  const fetchNewFlashcardsCount = useCallback(async () => {
    try {
      const allFlashcards: Flashcard[] = await getFlashcards();
      const newCards = allFlashcards.filter(card => card.difficulty === 'HARD').length;
      setNewFlashcardsCount(newCards);
    } catch (error) {
      console.error("Failed to fetch new flashcards count:", error);
    }
  }, []);

  useEffect(() => {
    fetchNewFlashcardsCount();
  }, [fetchNewFlashcardsCount]);

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!userId || !sessionId) return;
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
      }
    };
    fetchChatHistory();
  }, [userId, sessionId]); // Re-fetch when IDs change

  useEffect(() => {
    const hash = window.location.hash.substring(1); // remove #
    if (hash === 'quiz' || hash === 'notebook' || hash === 'flashcards' || hash === 'chat' || hash === 'history') {
      setActiveSection(hash);
    }
  }, []);

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

  const navigate = useNavigate();

  const handleSectionChange = (section: "chat" | "notebook" | "quiz" | "history" | "flashcards") => {
    setActiveSection(section);
    navigate('/'); // Navigate back to the root to show the main view
  };

  const handleNewChat = () => {
    navigate('/'); // Ensure we are on the main page before creating a new chat
    const newSessionId = uuidv4();
    localStorage.setItem('senpai-sessionId', newSessionId);
    setSessionId(newSessionId);
    setMessages([]); // Immediately clear messages for a new chat
    setActiveSection('chat'); // Switch to chat view for the new chat
  };

  const handleLoadSession = (newSessionId: string) => {
    navigate('/'); // Ensure we are on the main page before loading a session
    localStorage.setItem('senpai-sessionId', newSessionId);
    setSessionId(newSessionId);
    setActiveSection('chat'); // Switch to chat view to see the loaded conversation
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        newFlashcardsCount={newFlashcardsCount}
        onNewChat={handleNewChat}
        userId={userId}
        sessionId={sessionId}
        onSelectSession={handleLoadSession}
      />
      
      <main className="flex-1 h-screen overflow-auto">
        <div className="h-full">
          <Outlet context={{ 
              messages, 
              setMessages, 
              userId, 
              sessionId,
              activeSection,
              handleSectionChange,
              newFlashcardsCount,
              fetchNewFlashcardsCount,
              handleCreateFlashcard: (concept: string, question: string, answer: string) => {
                setFlashcardData({ concept, question, answer });
                setIsFlashcardModalOpen(true);
              },
              handleLoadSession,
           }} />
        </div>
      </main>

      <FlashcardModal
        isOpen={isFlashcardModalOpen}
        onClose={() => {
          setIsFlashcardModalOpen(false);
          fetchNewFlashcardsCount();
        }}
        initialConcept={flashcardData.concept}
        initialQuestion={flashcardData.question}
        initialAnswer={flashcardData.answer}
      />
    </div>
  );
};

export default MainLayout;
