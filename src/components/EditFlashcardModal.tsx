import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { updateFlashcard, uploadImage } from "@/services/api";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

export const EditFlashcardModal = ({
  isOpen,
  onClose,
  flashcard,
  onFlashcardUpdated,
}: EditFlashcardModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImageUrl, setQuestionImageUrl] = useState("");
  const [answerImageUrl, setAnswerImageUrl] = useState("");
  const [questionImageMethod, setQuestionImageMethod] = useState<'url' | 'upload'>('url');
  const [answerImageMethod, setAnswerImageMethod] = useState<'url' | 'upload'>('url');
  const [isUploadingQuestion, setIsUploadingQuestion] = useState(false);
  const [isUploadingAnswer, setIsUploadingAnswer] = useState(false);
  const questionFileRef = useRef<HTMLInputElement>(null);
  const answerFileRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && flashcard) {
      setQuestion(flashcard.question);
      setAnswer(flashcard.answer);
      const qImageUrl = flashcard.question_image_url || "";
      const aImageUrl = flashcard.answer_image_url || "";
      setQuestionImageUrl(qImageUrl);
      setAnswerImageUrl(aImageUrl);
      setQuestionImageMethod(qImageUrl ? 'url' : 'upload');
      setAnswerImageMethod(aImageUrl ? 'url' : 'upload');
    }
  }, [isOpen, flashcard]);

  const handleSave = async () => {
    if (!question || !answer || !flashcard) {
      toast.error("Please fill out all fields.");
      return;
    }

    setIsSaving(true);
    try {
      const flashcardData = {
        question,
        answer,
        question_image_url: questionImageUrl,
        answer_image_url: answerImageUrl,
      };
      await updateFlashcard(flashcard.id, flashcardData);
      toast.success("Flashcard updated successfully!");
      onFlashcardUpdated();
      onClose();
    } catch (error) {
      console.error("Failed to save flashcard:", error);
      toast.error("Failed to update flashcard. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'question' | 'answer'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const setter = type === 'question' ? setQuestionImageUrl : setAnswerImageUrl;
    const uploaderSetter = type === 'question' ? setIsUploadingQuestion : setIsUploadingAnswer;

    uploaderSetter(true);
    try {
      const response = await uploadImage(file);
      setter(response.filePath);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Image upload failed. Please try again.");
    } finally {
      uploaderSetter(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Flashcard</DialogTitle>
          <DialogDescription>
            Update the question and answer for your flashcard.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="question-edit" className="text-right">
              Question
            </Label>
            <Textarea
              id="question-edit"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="col-span-3"
              placeholder="What is the powerhouse of the cell?"
            />
            <p className="col-span-4 text-xs text-muted-foreground text-right">Markdown supported</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="question-image-url-edit" className="text-right">
                Image
            </Label>
            <div className="col-span-3 space-y-2">
                <ToggleGroup
                    type="single"
                    value={questionImageMethod}
                    onValueChange={(value: 'url' | 'upload') => {
                        if (value) {
                            setQuestionImageMethod(value);
                            setQuestionImageUrl("");
                        }
                    }}
                >
                    <ToggleGroupItem value="url">URL</ToggleGroupItem>
                    <ToggleGroupItem value="upload">Upload</ToggleGroupItem>
                </ToggleGroup>
                
                {questionImageMethod === 'url' ? (
                    <Input
                        id="question-image-url-edit"
                        value={questionImageUrl}
                        onChange={(e) => setQuestionImageUrl(e.target.value)}
                        className="col-span-3"
                        placeholder="Optional: https://..."
                    />
                ) : (
                    <div>
                        <Input
                            id="question-image-upload-edit"
                            type="file"
                            accept="image/*"
                            ref={questionFileRef}
                            onChange={(e) => handleFileChange(e, 'question')}
                            className="hidden"
                        />
                        {!questionImageUrl && (
                            <Button
                                variant="outline"
                                onClick={() => questionFileRef.current?.click()}
                                disabled={isUploadingQuestion}
                                className="w-full"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {isUploadingQuestion ? "Uploading..." : "Upload Image"}
                            </Button>
                        )}
                    </div>
                )}

                {questionImageUrl && (
                    <div className="relative mt-2">
                        <img src={questionImageUrl} alt="Question Preview" className="rounded-md object-cover w-full h-auto max-h-40" />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setQuestionImageUrl("")}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="answer-edit" className="text-right">
              Answer
            </Label>
            <Textarea
              id="answer-edit"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="col-span-3"
              placeholder="Mitochondria"
            />
            <p className="col-span-4 text-xs text-muted-foreground text-right">Markdown supported</p>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="answer-image-url-edit" className="text-right">
                Image
            </Label>
            <div className="col-span-3 space-y-2">
                 <ToggleGroup
                    type="single"
                    value={answerImageMethod}
                    onValueChange={(value: 'url' | 'upload') => {
                        if (value) {
                            setAnswerImageMethod(value);
                            setAnswerImageUrl("");
                        }
                    }}
                >
                    <ToggleGroupItem value="url">URL</ToggleGroupItem>
                    <ToggleGroupItem value="upload">Upload</ToggleGroupItem>
                </ToggleGroup>

                {answerImageMethod === 'url' ? (
                    <Input
                        id="answer-image-url-edit"
                        value={answerImageUrl}
                        onChange={(e) => setAnswerImageUrl(e.target.value)}
                        className="col-span-3"
                        placeholder="Optional: https://..."
                    />
                ) : (
                    <div>
                        <Input
                            id="answer-image-upload-edit"
                            type="file"
                            accept="image/*"
                            ref={answerFileRef}
                            onChange={(e) => handleFileChange(e, 'answer')}
                            className="hidden"
                        />
                        {!answerImageUrl && (
                            <Button
                                variant="outline"
                                onClick={() => answerFileRef.current?.click()}
                                disabled={isUploadingAnswer}
                                className="w-full"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                {isUploadingAnswer ? "Uploading..." : "Upload Image"}
                            </Button>
                        )}
                    </div>
                )}

                {answerImageUrl && (
                    <div className="relative mt-2">
                        <img src={answerImageUrl} alt="Answer Preview" className="rounded-md object-cover w-full h-auto max-h-40" />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => setAnswerImageUrl("")}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};