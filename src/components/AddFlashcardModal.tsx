import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // import styles
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { saveManualFlashcard } from "@/services/api";
import { ImageUploader } from "./ImageUploader";

interface Deck {
  id: number;
  name: string;
}

interface AddFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: Deck[];
  onFlashcardAdded: () => void;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{'list': 'ordered'}, {'list': 'bullet'}],
    ['link'],
    ['clean']
  ],
};

export const AddFlashcardModal = ({ isOpen, onClose, decks, onFlashcardAdded }: AddFlashcardModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [answerImageUrl, setAnswerImageUrl] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(String(decks[0].id));
    }
  }, [decks, selectedDeckId]);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim() || !selectedDeckId) {
      toast.error("Please fill in the question, answer, and select a deck.");
      return;
    }

    setIsSaving(true);
    try {
      const flashcardData = {
        question,
        answer,
        deck_id: parseInt(selectedDeckId, 10),
        difficulty: "HARD",
        last_reviewed: new Date(0).toISOString(), // Set to epoch
        question_image_url: questionImageUrl,
        answer_image_url: answerImageUrl,
      };

      await saveManualFlashcard(flashcardData);
      toast.success("Flashcard added successfully!");
      onFlashcardAdded();
      handleClose();
    } catch (error) {
      toast.error("Failed to save flashcard. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setQuestion("");
    setAnswer("");
    setQuestionImageUrl("");
    setAnswerImageUrl("");
    setSelectedDeckId(decks.length > 0 ? String(decks[0].id) : undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add a New Flashcard</DialogTitle>
          <DialogDescription>
            Create a new flashcard with rich text and images.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 flex-grow min-h-0">
          {/* Form Section */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
              <Label htmlFor="deck-select">Deck *</Label>
              <Select value={selectedDeckId} onValueChange={setSelectedDeckId}>
                <SelectTrigger id="deck-select">
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

            <div>
              <Label>Question *</Label>
              <ReactQuill theme="snow" value={question} onChange={setQuestion} modules={quillModules} />
            </div>

            <div>
              <Label>Question Image</Label>
              <ImageUploader imageUrl={questionImageUrl} setImageUrl={setQuestionImageUrl} />
            </div>
            
            <div>
              <Label>Answer *</Label>
               <ReactQuill theme="snow" value={answer} onChange={setAnswer} modules={quillModules} />
            </div>

            <div>
              <Label>Answer Image</Label>
              <ImageUploader imageUrl={answerImageUrl} setImageUrl={setAnswerImageUrl} />
            </div>
          </div>

          {/* Preview Section */}
          <div className="flex flex-col">
            <Label className="mb-2">Live Preview</Label>
            <Card className="flex-grow flex flex-col items-center justify-center p-4">
              <CardContent className="w-full">
                <div className="prose dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold">Question:</h3>
                  <div dangerouslySetInnerHTML={{ __html: question }} />
                  {questionImageUrl && <img src={questionImageUrl} alt="Question" className="max-w-full rounded-md my-2" />}
                  <hr className="my-4" />
                  <h3 className="text-lg font-semibold">Answer:</h3>
                  <div dangerouslySetInnerHTML={{ __html: answer }} />
                  {answerImageUrl && <img src={answerImageUrl} alt="Answer" className="max-w-full rounded-md my-2" />}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-auto">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Flashcard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};