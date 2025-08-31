import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { BookOpen, Save } from "lucide-react";
import { toast } from "sonner";
import { Flashcard } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ApiService from "@/services/api";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface FlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: string, answer: string, questionImage?: string, answerImage?: string) => Promise<void>;
  deckName?: string;
  initialData?: Flashcard | null;
}

export const FlashcardModal = ({
  isOpen,
  onClose,
  onSave,
  deckName = "this deck",
  initialData = null
}: FlashcardModalProps) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [questionImage, setQuestionImage] = useState<string | null>(null);
  const [answerImage, setAnswerImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'question' | 'answer' | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setQuestion(initialData.question);
        setAnswer(initialData.answer);
        setQuestionImage(initialData.question_image || null);
        setAnswerImage(initialData.answer_image || null);
      } else {
        // Reset form for creation
        setQuestion("");
        setAnswer("");
        setQuestionImage(null);
        setAnswerImage(null);
      }
    }
  }, [isOpen, initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'question' | 'answer') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    try {
      const response = await ApiService.uploadImage(file);
      // The backend returns a relative URL, we need to prepend the base for display
      const fullUrl = `${ApiService.getBaseUrl()}${response.url}`;
      if (type === 'question') {
        setQuestionImage(fullUrl);
      } else {
        setAnswerImage(fullUrl);
      }
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Image upload failed.");
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSaving(true);
    try {
      // We need to pass the relative URL back to the backend
      const relativeQuestionImage = questionImage ? questionImage.replace(ApiService.getBaseUrl(), '') : undefined;
      const relativeAnswerImage = answerImage ? answerImage.replace(ApiService.getBaseUrl(), '') : undefined;

      await onSave(question, answer, relativeQuestionImage, relativeAnswerImage);
      toast.success(`Flashcard ${initialData ? 'updated' : 'saved to ' + deckName}! 📚`);
      onClose();
    } catch (error) {
      // The calling component will show a more specific error
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    setIsFlipped(!isFlipped);
  };

  const removeImage = (type: 'question' | 'answer') => {
    if (type === 'question') {
      setQuestionImage(null);
    } else {
      setAnswerImage(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {initialData ? 'Edit Flashcard' : 'Create Flashcard'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">
                Deck
              </Label>
              <Card className="mt-1 p-2 bg-muted text-muted-foreground border-none">{deckName}</Card>
            </div>
            
            <Tabs defaultValue="question-edit">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="question-edit">Question</TabsTrigger>
                <TabsTrigger value="question-preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="question-edit">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What question will help you remember this concept?"
                  className="mt-1"
                  rows={4}
                />
                <div className="mt-2">
                  {!questionImage ? (
                    <>
                      <Label htmlFor="question-image-upload" className="text-sm font-medium text-primary hover:underline cursor-pointer">
                        {isUploading === 'question' ? 'Uploading...' : 'Add Image'}
                      </Label>
                      <Input id="question-image-upload" type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'question')} disabled={isUploading === 'question'} accept="image/png, image/jpeg, image/gif" />
                    </>
                  ) : (
                    <div className="relative">
                      <img src={questionImage} alt="Question preview" className="rounded-md max-h-32" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeImage('question')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="question-preview">
                <Card className="mt-1 p-4 min-h-[105px] prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {`${question}${questionImage ? `\n\n![Question Image](${questionImage})` : ''}` || "Nothing to preview yet."}
                  </ReactMarkdown>
                </Card>
              </TabsContent>
            </Tabs>
            
            <Tabs defaultValue="answer-edit">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="answer-edit">Answer</TabsTrigger>
                <TabsTrigger value="answer-preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="answer-edit">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="The complete answer or explanation"
                  className="mt-1"
                  rows={5}
                />
                <div className="mt-2">
                  {!answerImage ? (
                    <>
                      <Label htmlFor="answer-image-upload" className="text-sm font-medium text-primary hover:underline cursor-pointer">
                        {isUploading === 'answer' ? 'Uploading...' : 'Add Image'}
                      </Label>
                      <Input id="answer-image-upload" type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'answer')} disabled={isUploading === 'answer'} accept="image/png, image/jpeg, image/gif" />
                    </>
                  ) : (
                    <div className="relative">
                      <img src={answerImage} alt="Answer preview" className="rounded-md max-h-32" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeImage('answer')}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="answer-preview">
                <Card className="mt-1 p-4 min-h-[124px] prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {`${answer}${answerImage ? `\n\n![Answer Image](${answerImage})` : ''}` || "Nothing to preview yet."}
                  </ReactMarkdown>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
              {isSaving ? "Saving..." : <><Save className="w-4 h-4" /> Save Flashcard</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};