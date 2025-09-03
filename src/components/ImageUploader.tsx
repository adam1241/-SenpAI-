import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/services/api';

interface ImageUploaderProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  className?: string;
}

export const ImageUploader = ({ imageUrl, setImageUrl, className }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const response = await uploadImage(file);
      setImageUrl(response.filePath);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload image. Please try again.');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  }, [setImageUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleUpload(acceptedFiles[0]);
    }
  }, [handleUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    multiple: false,
  });

  const handlePaste = async (event: React.ClipboardEvent<HTMLInputElement>) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            if (file) {
                handleUpload(file);
            }
            return;
        }
        if (items[i].kind === 'string') {
            items[i].getAsString((pastedString) => {
                // Basic URL validation
                if (pastedString.startsWith('http')) {
                    setImageUrl(pastedString);
                } else {
                    toast.info("Pasted text is not a valid image URL.");
                }
            });
            return;
        }
    }
  };


  if (imageUrl) {
    return (
      <div className={`relative ${className}`}>
        <img src={imageUrl} alt="Preview" className="w-full h-auto rounded-md object-cover" />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => setImageUrl('')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}
        ${className}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <UploadCloud className="w-8 h-8" />
        {isUploading ? (
          <p>Uploading...</p>
        ) : isDragActive ? (
          <p>Drop the image here...</p>
        ) : (
          <div>
            <p className="font-semibold">Drag & drop an image here</p>
            <p className="text-sm">or click to select a file</p>
          </div>
        )}
         <Input
            placeholder="or paste an image or URL here"
            onPaste={handlePaste}
            className="mt-4 text-center"
            onClick={(e) => e.stopPropagation()} // Prevent dropzone click event
          />
      </div>
    </div>
  );
};
