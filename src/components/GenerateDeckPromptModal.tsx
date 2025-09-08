import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

interface GenerateDeckPromptModalProps {
  onGenerate: (prompt: string) => Promise<void>;
  children: React.ReactNode;
}

export function GenerateDeckPromptModal({ onGenerate, children }: GenerateDeckPromptModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateClick = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      await onGenerate(prompt);
      setIsOpen(false);
      setPrompt('');
    } catch (error) {
      console.error('Failed to generate deck:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Deck with AI</DialogTitle>
          <DialogDescription>
            Describe the topic for your new flashcard deck.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prompt" className="text-right">
              Topic
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 'Capitals of Europe'"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleGenerateClick}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? 'Generating...' : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
