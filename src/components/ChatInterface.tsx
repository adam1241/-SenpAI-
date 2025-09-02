import { useState, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Lightbulb, HelpCircle, MessageSquare, Sparkles, Star, BookOpen } from "lucide-react";
import { toast } from "sonner";
import senpaiLogo from "./logo/SenpAI2.png";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
}

interface ChatInterfaceProps {
  onCreateFlashcard: (concept: string, question: string, answer: string) => void;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  sessionId: string;
}

export const ChatInterface = ({ onCreateFlashcard, messages, setMessages, sessionId }: ChatInterfaceProps) => {
  const [inputMessage, setInputMessage] = useState("");
  const userId = "default_user";

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage("");

    // Prepare the history for the API
    const apiHistory = [...messages, userMessage].map(({ id, timestamp, isMastery, isUser, ...rest }) => ({
      ...rest,
      role: isUser ? 'user' : 'assistant'
    }));


    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiHistory, user_id: userId, session_id: sessionId }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (!lastMessage.isUser) {
              lastMessage.content += chunk;
            }
            return [...prev];
          });
        }
      }
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting to the AI. Please try again later.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    }
  };

  const handleLifelineClick = (type: string) => {
    const lifelines = {
      hint: "Here's a hint: Think about the fundamental principles we discussed earlier.",
      simpler: "Let me ask a simpler question: What's the most basic element of this concept?",
      clarify: "What I mean is: Let's break this down into smaller, more manageable parts.",
      lesson: "Let me create a structured lesson plan based on our conversation so far. Here's how we can organize this learning journey into clear steps with objectives and activities."
    };

    const aiMessage: Message = {
      id: Date.now().toString(),
      content: lifelines[type as keyof typeof lifelines],
      isUser: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);
    toast.info("Lifeline used! 💡");
  };

  const handleCreateFlashcard = () => {
    onCreateFlashcard(
      "Sample Concept",
      "What is the key principle we just discussed?",
      "The principle that learning is most effective when guided through self-discovery."
    );
    toast.success("Flashcard created! 📚");
  };

  

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages or Idle State */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 ? (
            /* Idle State with Logo */
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center justify-center w-96 h-96 rounded-full bg-gradient-learning mb-0 p-2">
                  <img src={senpaiLogo} alt="SenpAI" className="w-full h-full object-contain" />
                </div>
                <p className="text-muted-foreground text-lg mb-4">Your AI Learning Companion</p>
                <p className="text-muted-foreground max-w-md">
                  Ready to explore? Ask me anything you'd like to learn about. I'll guide you through discovery using the Socratic method.
                </p>
              </div>

              <div className="flex justify-center mb-6">
                <video 
                  controls 
                  className="w-full max-w-3xl rounded-lg shadow-lg"
                >
                  <source src="/promotion.mp4" type="video/mp4" />
                  Votre navigateur ne supporte pas la balise vidéo.
                </video>
              </div>
              
              {/* Quick Start Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("How does photosynthesis work?")}
                >
                  <div>
                    <div className="font-medium">🌱 Science</div>
                    <div className="text-sm text-muted-foreground">How does photosynthesis work?</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("Explain the quadratic formula")}
                >
                  <div>
                    <div className="font-medium">📐 Math</div>
                    <div className="text-sm text-muted-foreground">Explain the quadratic formula</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("What causes gravity?")}
                >
                  <div>
                    <div className="font-medium">🔬 Physics</div>
                    <div className="text-sm text-muted-foreground">What causes gravity?</div>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className="p-4 h-auto text-left justify-start"
                  onClick={() => setInputMessage("How do chemical bonds form?")}
                >
                  <div>
                    <div className="font-medium">⚗️ Chemistry</div>
                    <div className="text-sm text-muted-foreground">How do chemical bonds form?</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <Card className={`max-w-[80%] p-4 ${
                  message.isUser 
                    ? "bg-primary text-primary-foreground" 
                    : message.isMastery
                    ? "bg-success-light border-success animate-celebration"
                    : "bg-card"
                }`}>
                  {message.isMastery && (
                    <div className="flex items-center gap-2 mb-2 text-success">
                      <Star className="w-4 h-4 animate-sparkle" />
                      <span className="text-sm font-semibold">Moment of Mastery!</span>
                      <Sparkles className="w-4 h-4 animate-sparkle" />
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.isMastery && (
                      <Button
                        variant="mastery"
                        size="lifeline"
                        onClick={handleCreateFlashcard}
                        className="ml-2"
                      >
                        Save as Flashcard
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            ))
          )}
          
        </div>
      </ScrollArea>

      {/* Lifeline Buttons - Only show when there are messages */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <div className="flex justify-center gap-2 max-w-4xl mx-auto">
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("hint")}
              className="gap-1"
            >
              <Lightbulb className="w-3 h-3" />
              Give me a hint
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("simpler")}
              className="gap-1"
            >
              <MessageSquare className="w-3 h-3" />
              Simpler question
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("clarify")}
              className="gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              What do you mean?
            </Button>
            <Button
              variant="lifeline"
              size="lifeline"
              onClick={() => handleLifelineClick("lesson")}
              className="gap-1"
            >
              <BookOpen className="w-3 h-3" />
              Make lesson plan
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything you'd like to learn about..."
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
