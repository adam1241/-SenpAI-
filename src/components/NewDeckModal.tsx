import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface NewDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeck: (name: string, description: string) => Promise<void>;
}

export const NewDeckModal = ({ isOpen, onClose, onCreateDeck }: NewDeckModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a deck name");
      return;
    }

    setIsSaving(true);
    try {
      await onCreateDeck(name.trim(), description.trim());
      
      // The success toast is now shown in the parent component
      // to ensure it only shows after a successful API call.
      
      // Reset form and close
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      // The error toast is handled by the parent component (FlashcardDecksView)
      // No need to show another one here.
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Deck
          </DialogTitle>
          <DialogDescription>
            Create a new deck to organize your flashcards.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="deck-name" className="text-sm font-medium">
              Deck Name *
            </Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spanish Vocabulary, Physics Formulas"
              className="mt-1"
              maxLength={50}
            />
          </div>
          
          <div>
            <Label htmlFor="deck-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="deck-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this deck covers..."
              className="mt-1"
              rows={3}
              maxLength={200}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Creating..." : "Create Deck"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};