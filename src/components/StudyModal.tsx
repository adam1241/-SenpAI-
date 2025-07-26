import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";

interface StudyCard {
  id: string;
  question: string;
  answer: string;
  concept: string;
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

  const handleDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;
    
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
      <DialogContent className="max-w-2xl">
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
        
        <div className="space-y-6 pt-4">
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
                  <p className="text-lg text-foreground leading-relaxed">{currentCard.question}</p>
                  <div className="mt-6 text-sm text-muted-foreground">
                    Click to reveal answer
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-success font-medium mb-4 tracking-wider">ANSWER</div>
                  <p className="text-lg text-foreground leading-relaxed">{currentCard.answer}</p>
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