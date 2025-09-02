import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveManualFlashcard } from "@/services/api";
import { toast } from "sonner";

interface Deck {
  id: number;
  name: string;
}

interface AddFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  onFlashcardAdded: () => void; // To refetch data in the parent
}

export const AddFlashcardModal = ({
  isOpen,
  onClose,
  decks,
  onFlashcardAdded,
}: AddFlashcardModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setQuestion("");
      setAnswer("");
      setSelectedDeckId(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!question || !answer || !selectedDeckId) {
      toast.error("Please fill out all fields.");
      return;
    }

    setIsSaving(true);
    try {
      const flashcardData = {
        question,
        answer,
        deck_id: parseInt(selectedDeckId, 10),
      };
      await saveManualFlashcard(flashcardData);
      toast.success("Flashcard created successfully!");
      onFlashcardAdded(); // Notify parent to refetch
      onClose();
    } catch (error) {
      console.error("Failed to save flashcard:", error);
      toast.error("Failed to create flashcard. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Flashcard</DialogTitle>
          <DialogDescription>
            Create a new flashcard and add it to one of your decks.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="question" className="text-right">
              Question
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="col-span-3"
              placeholder="What is the powerhouse of the cell?"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="answer" className="text-right">
              Answer
            </Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="col-span-3"
              placeholder="Mitochondria"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="deck" className="text-right">
              Deck
            </Label>
            <Select
              value={selectedDeckId ?? undefined}
              onValueChange={setSelectedDeckId}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a deck" />
              </SelectTrigger>
              <SelectContent>
                {decks.map((deck) => (
                  <SelectItem key={deck.id} value={String(deck.id)}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Flashcard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};