import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit, Save } from "lucide-react";
import { toast } from "sonner";

interface Deck {
    id: number;
    name: string;
    description: string;
}

interface EditDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateDeck: (deckId: number, name: string, description: string) => void;
  deck: Deck | null;
}

export const EditDeckModal = ({ isOpen, onClose, onUpdateDeck, deck }: EditDeckModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (deck) {
      setName(deck.name);
      setDescription(deck.description);
    }
  }, [deck]);


  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a deck name");
      return;
    }
    if (!deck) {
        toast.error("No deck selected for editing");
        return;
    }

    onUpdateDeck(deck.id, name.trim(), description.trim());
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-primary" />
            Edit Deck
          </DialogTitle>
          <DialogDescription>
            Update the name and description of your deck.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div>
            <Label htmlFor="deck-name-edit" className="text-sm font-medium">
              Deck Name *
            </Label>
            <Input
              id="deck-name-edit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spanish Vocabulary, Physics Formulas"
              className="mt-1"
              maxLength={50}
            />
          </div>
          
          <div>
            <Label htmlFor="deck-description-edit" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="deck-description-edit"
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
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};