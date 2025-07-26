import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Send, Lightbulb, HelpCircle, MessageSquare, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isMastery?: boolean;
}

interface ChatInterfaceProps {
  onCreateFlashcard: (concept: string, question: string, answer: string) => void;
}

export const ChatInterface = ({ onCreateFlashcard }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI learning companion. I'm here to guide you through your learning journey using the Socratic method. What would you like to explore today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response with potential mastery moment
    setTimeout(() => {
      const responses = [
        "That's an interesting point! Let me ask you this: Can you think of a real-world example where this concept applies?",
        "Great question! Instead of giving you the answer directly, let me guide you: What do you think might happen if we change one variable?",
        "I can see you're thinking deeply about this. What patterns do you notice?",
        "Excellent insight! You've just demonstrated mastery of this concept. Would you like to save this as a flashcard?"
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      const isMastery = randomResponse.includes("mastery");

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: randomResponse,
        isUser: false,
        timestamp: new Date(),
        isMastery,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);

      if (isMastery) {
        toast.success("🎉 Concept Mastered!", {
          description: "You've shown great understanding! Ready to create a flashcard?",
          duration: 5000,
        });
      }
    }, 1500);
  };

  const handleLifelineClick = (type: string) => {
    const lifelines = {
      hint: "Here's a hint: Think about the fundamental principles we discussed earlier.",
      simpler: "Let me ask a simpler question: What's the most basic element of this concept?",
      clarify: "What I mean is: Let's break this down into smaller, more manageable parts."
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
      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
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
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <Card className="max-w-[80%] p-4 bg-muted">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Lifeline Buttons */}
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
        </div>
      </div>

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