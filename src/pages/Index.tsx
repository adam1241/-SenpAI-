import { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
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
  const [activeSection, setActiveSection] = useState<"chat" | "notebook" | "quiz" | "history" | "flashcards">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const userId = "default_user";

  // Use localStorage to persist sessionId
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
      setIsLoadingHistory(true);
      try {
        const response = await axios.get(`http://localhost:5001/api/conversations?user_id=${userId}&session_id=${sessionId}`);
        if (response.data && response.data.length > 0) {
          const formattedHistory = response.data.map((msg: any, index: number) => ({
            id: `hist-${index}`,
            content: msg.content,
            isUser: msg.role === 'user',
            timestamp: new Date(),
          }));
          setMessages(formattedHistory);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Failed to fetch chat history:", error);
        setMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchChatHistory();
  }, [sessionId]); // Re-fetch when sessionId changes

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

  const handleNewChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('senpai-sessionId', newSessionId);
    setSessionId(newSessionId);
    // setMessages is now handled by the useEffect
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
            sessionId={sessionId}
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
