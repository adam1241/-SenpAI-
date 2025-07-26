import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConcept?: string;
  initialQuestion?: string;
  initialAnswer?: string;
}

export const FlashcardModal = ({ 
  isOpen, 
  onClose, 
  initialConcept = "", 
  initialQuestion = "", 
  initialAnswer = "" 
}: FlashcardModalProps) => {
  const [concept, setConcept] = useState(initialConcept);
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState(initialAnswer);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleSave = () => {
    if (!concept.trim() || !question.trim() || !answer.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Here you would save to your flashcard system
    toast.success("Flashcard saved successfully! 📚");
    onClose();
    
    // Reset form
    setConcept("");
    setQuestion("");
    setAnswer("");
    setIsFlipped(false);
  };

  const handlePreview = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Create Learning Flashcard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="concept" className="text-sm font-medium">
                Concept/Topic
              </Label>
              <Input
                id="concept"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="e.g., Photosynthesis, Quadratic Equations"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="question" className="text-sm font-medium">
                Question (Front of card)
              </Label>
              <Textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What question will help you remember this concept?"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="answer" className="text-sm font-medium">
                Answer (Back of card)
              </Label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="The complete answer or explanation"
                className="mt-1"
                rows={4}
              />
            </div>
          </div>

          {/* Preview Card */}
          {question && answer && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="gap-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Flip Card
                </Button>
              </div>
              
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 min-h-[120px] flex items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-lg" onClick={handlePreview}>
                <div className="text-center">
                  {!isFlipped ? (
                    <div>
                      <div className="text-xs text-primary font-medium mb-2">QUESTION</div>
                      <p className="text-foreground">{question}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-success font-medium mb-2">ANSWER</div>
                      <p className="text-foreground">{answer}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save Flashcard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};