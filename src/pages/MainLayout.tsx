import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import { ApiService, getFlashcards } from "@/services/api";
import { AppSidebar } from "@/components/AppSidebar";
import { FlashcardModal } from "@/components/FlashcardModal";
import { toast } from "sonner";

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
  isEdited?: boolean;
  originalContent?: string;
  editedMessageId?: string;
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

  const fetchChatHistory = useCallback(async (currentSessionId: string) => {
    if (!userId || !currentSessionId) return;
    try {
      const history = await ApiService.getConversations(userId, currentSessionId);
      const list = Array.isArray(history) ? history : [];
      if (list.length > 0) {
        const formattedHistory = list.map((msg: any, index: number) => ({
          id: msg.id || `hist-${index}`,
          content: msg.content,
          isUser: msg.role === 'user',
          timestamp: new Date(),
          isEdited: msg.isEdited || false,
          originalContent: msg.originalContent || undefined,
          editedMessageId: msg.editedMessageId || undefined,
        }));
        setMessages(formattedHistory);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      setMessages([]); // Clear messages on error
    }
  }, [userId, setMessages]);

  useEffect(() => {
    fetchChatHistory(sessionId);
  }, [fetchChatHistory, sessionId]); // Re-fetch when sessionId changes

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

  const handleDeleteConversation = useCallback(async (sessionIdToDelete: string) => {
    if (!userId) {
      toast.error("User ID is not available. Cannot delete conversation.");
      return;
    }

    if (sessionIdToDelete === sessionId) {
      // If the currently active conversation is deleted, start a new chat
      toast.info("Current conversation deleted. Starting a new chat...");
      handleNewChat();
    } else {
      // Otherwise, just re-fetch the history to update the sidebar
      toast.success("Conversation deleted successfully!");
    }
    
    try {
      console.log("Attempting to delete conversation with sessionId:", sessionIdToDelete, "for userId:", userId); // Debug log
      await ApiService.deleteConversation(userId, sessionIdToDelete);
      console.log("Conversation deleted successfully from API."); // Debug log

      // After deletion, we need to refresh the history list in the sidebar.
      // We can achieve this by having AppSidebar re-fetch its history.
      // For now, `fetchHistory` is called by AppSidebar's useEffect on sessionId/userId
      // A more robust solution might involve passing a direct refresh function or using context API.

      // If the deleted session was the currently active one, start a new chat.
      if (sessionIdToDelete === sessionId) {
        console.log("Deleted active session. Calling handleNewChat()."); // Debug log
        handleNewChat();
      } else {
        console.log("Deleted non-active session. Re-fetching sidebar history."); // Debug log
        // If the deleted session was not active, we still need to refresh the sidebar's history.
        // AppSidebar's useEffect on `sessionId` or `userId` should trigger a re-fetch.
        // If not, we might need a more direct way to trigger fetchHistory in AppSidebar.
      }
      toast.success("Conversation deleted successfully!");
    } catch (error) {
      console.error("Failed to delete conversation:", error); // Debug log
      toast.error("Failed to delete conversation. Please try again.");
    }
  }, [userId, sessionId, handleNewChat]);

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
        onDeleteConversation={handleDeleteConversation} // Pass the delete handler
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
