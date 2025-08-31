import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ApiService from "@/services/api";

interface StudyCard {
  id: string;
  question: string;
  answer: string;
  concept: string;
  question_image?: string;
  answer_image?: string;
}

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckName: string;
  cards: StudyCard[];
}

export const StudyModal = ({ isOpen, onClose, deckName, cards }: StudyModalProps) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<string>>(new Set());

  const currentCard = cards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleDifficulty = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;
    
    try {
      // Send review to the backend
      await ApiService.reviewFlashcard(parseInt(currentCard.id), difficulty);
      
      setStudiedCards(prev => new Set([...prev, currentCard.id]));
      
      // Move to next card
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setIsFlipped(false);
      } else {
        // Study session complete
        toast.success("Study session completed! 🎉");
        onClose();
      }
    } catch (error) {
      toast.error("Failed to save review. Please try again.");
      console.error(error);
    }
  };

  const handleClose = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudiedCards(new Set());
    onClose();
  };

  if (!currentCard) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Studying: {deckName}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4 flex-grow overflow-y-auto pr-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Card {currentCardIndex + 1} of {cards.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Concept Badge */}
          <div className="text-center">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
              {currentCard.concept}
            </span>
          </div>

          {/* Flashcard */}
          <Card 
            className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 min-h-[250px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg"
            onClick={handleFlip}
          >
            <div className="text-center w-full">
              {!isFlipped ? (
                <div>
                  <div className="text-xs text-primary font-medium mb-4 tracking-wider">QUESTION</div>
                  <div className="text-lg text-foreground leading-relaxed prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {`${currentCard.question}${currentCard.question_image ? `\n\n![Question Image](${ApiService.getBaseUrl()}${currentCard.question_image})` : ''}`}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-6 text-sm text-muted-foreground">
                    Click to reveal answer
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-success font-medium mb-4 tracking-wider">ANSWER</div>
                  <div className="text-lg text-foreground leading-relaxed prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                     {`${currentCard.answer}${currentCard.answer_image ? `\n\n![Answer Image](${ApiService.getBaseUrl()}${currentCard.answer_image})` : ''}`}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-2">
            {!isFlipped ? (
              <Button onClick={handleFlip} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Show Answer
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleDifficulty('hard')}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  Hard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDifficulty('medium')}
                  className="border-warning/30 text-warning hover:bg-warning/10"
                >
                  Medium
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDifficulty('easy')}
                  className="border-success/30 text-success hover:bg-success/10"
                >
                  Easy
                </Button>
              </div>
            )}
          </div>

          {/* Navigation hint */}
          {isFlipped && (
            <p className="text-center text-sm text-muted-foreground">
              Rate how difficult this card was to remember
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};