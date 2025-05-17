import React, { useState } from 'react';
import { Link2, Upload } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Card, { CardContent, CardFooter } from './ui/Card';
import { useToast } from './ui/Toast';
import { processUrl, processScreenshot, saveToNotion } from '../services/bookmarkService';

const BookmarkForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<{ title: string; content: string } | null>(null);
  const toast = useToast();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (e.target.value && file) {
      setFile(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (url) {
        setUrl('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPreview(null);

    try {
      let result;

      if (url) {
        result = await processUrl(url);
        toast.success('URL processed successfully');
      } else if (file) {
        result = await processScreenshot(file);
        toast.success('Screenshot processed successfully');
      } else {
        toast.error('Please provide a URL or upload a screenshot');
        setIsProcessing(false);
        return;
      }

      setPreview(result);
    } catch (error) {
      toast.error('Error processing content: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    setIsProcessing(true);
    try {
      await saveToNotion({
        title: preview.title,
        content: preview.content,
        source: url ? 'url' : 'screenshot',
        url: url || undefined,
      });
      
      toast.success('Saved to Notion successfully');
      setUrl('');
      setFile(null);
      setPreview(null);
    } catch (error) {
      toast.error('Error saving to Notion: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent>
        <h2 className="text-2xl font-bold mb-6">Create Bookmark</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="relative">
              <Input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="Enter URL to bookmark"
                disabled={isProcessing}
                fullWidth
                label="Website URL"
                id="url-input"
                icon={<Link2 className="w-5 h-5 text-gray-400" />}
              />
            </div>
            
            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-gray-400">OR</span>
              <div className="flex-grow h-px bg-gray-300 dark:bg-gray-700"></div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Upload Screenshot
              </label>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-medium text-blue-500 hover:text-blue-400 focus-within:outline-none"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected file: {file.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={(!url && !file) || isProcessing}
              isLoading={isProcessing && !preview}
            >
              Process
            </Button>
          </div>
        </form>
      </CardContent>

      {preview && (
        <CardFooter className="bg-gray-50 dark:bg-gray-900 flex flex-col items-start">
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 mb-4">
            <h4 className="font-bold">{preview.title}</h4>
            <p className="text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
              {preview.content}
            </p>
          </div>
          <div className="flex justify-end w-full">
            <Button
              variant="outline"
              className="mr-2"
              onClick={() => setPreview(null)}
              disabled={isProcessing}
            >
              Edit
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              isLoading={isProcessing && preview}
            >
              Save to Notion
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default BookmarkForm;