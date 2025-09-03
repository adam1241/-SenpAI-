import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

import { updateFlashcard } from "@/services/api";
import { ImageUploader } from "./ImageUploader";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
  question_image_url?: string;
  answer_image_url?: string;
}

interface EditFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcard: Flashcard | null;
  onFlashcardUpdated: () => void;
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

export const EditFlashcardModal = ({ isOpen, onClose, flashcard, onFlashcardUpdated }: EditFlashcardModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [answerImageUrl, setAnswerImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flashcard) {
      setQuestion(flashcard.question);
      setAnswer(flashcard.answer);
      setQuestionImageUrl(flashcard.question_image_url || "");
      setAnswerImageUrl(flashcard.answer_image_url || "");
    }
  }, [flashcard]);

  const handleSave = async () => {
    if (!flashcard) return;

    if (!question.trim() || !answer.trim()) {
      toast.error("Please fill in the question and answer.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        question,
        answer,
        question_image_url: questionImageUrl,
        answer_image_url: answerImageUrl,
      };

      await updateFlashcard(flashcard.id, updatedData);
      toast.success("Flashcard updated successfully!");
      onFlashcardUpdated();
      onClose();
    } catch (error) {
      toast.error("Failed to update flashcard. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Update the content of your flashcard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 flex-grow min-h-0">
          {/* Form Section */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
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
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};