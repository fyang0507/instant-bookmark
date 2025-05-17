import React, { useState } from 'react';
import { ExternalLink, Trash2, Edit2 } from 'lucide-react';
import Card, { CardContent, CardFooter } from './ui/Card';
import Button from './ui/Button';
import { useToast } from './ui/Toast';
import { Bookmark } from '../types/bookmark';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      onDelete(bookmark.id);
      toast.success('Bookmark deleted successfully');
    } catch (error) {
      toast.error('Failed to delete bookmark');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const getSourceIcon = () => {
    if (bookmark.source === 'url') {
      return <ExternalLink className="w-4 h-4 text-blue-500" />;
    } else {
      return (
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z" stroke="currentColor" strokeWidth="2" />
          <path d="M4 8H20" stroke="currentColor" strokeWidth="2" />
          <path d="M9 4V8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    }
  };

  return (
    <Card className="w-full transition-all duration-300 transform hover:-translate-y-1">
      <CardContent>
        <div className="flex items-start">
          <div className="flex-shrink-0 p-2 mt-1 rounded-md bg-gray-100 dark:bg-gray-700">
            {getSourceIcon()}
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {bookmark.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {new Date(bookmark.createdAt).toLocaleString()}
            </p>
            <div 
              className={`mt-2 text-gray-700 dark:text-gray-300 overflow-hidden transition-all duration-300 ${
                isExpanded ? 'max-h-96' : 'max-h-20'
              }`}
            >
              <p>{bookmark.content}</p>
            </div>
            {bookmark.content.length > 100 && (
              <button
                onClick={toggleExpand}
                className="mt-2 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
            {bookmark.source === 'url' && bookmark.url && (
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Visit Website
                <ExternalLink className="ml-1 w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          icon={<Edit2 className="w-4 h-4" />}
        >
          Edit
        </Button>
        <Button 
          variant="danger" 
          size="sm" 
          isLoading={isDeleting}
          onClick={handleDelete}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookmarkCard;