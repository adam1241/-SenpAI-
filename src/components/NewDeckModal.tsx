import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

interface NewDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeck: (name: string, description: string) => void;
}

export const NewDeckModal = ({ isOpen, onClose, onCreateDeck }: NewDeckModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a deck name");
      return;
    }

    onCreateDeck(name.trim(), description.trim());
    toast.success("New deck created successfully! 📚");
    
    // Reset form
    setName("");
    setDescription("");
    onClose();
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
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Create Deck
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};