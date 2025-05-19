import React from 'react';
import { Bookmark, Image, ArrowRight } from 'lucide-react';
import BookmarkForm from '../components/BookmarkForm';

const HomePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Bookmark Anything, Instantly
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Save URLs or screenshots with automatic content extraction, organized directly in your Notion workspace.
        </p>
      </div>
      
      <div className="mb-16">
        <BookmarkForm />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">URL Bookmarking</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Enter any URL and we'll automatically extract the title and content for easy reference.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Image className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Screenshot Capture</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Upload screenshots and our AI will analyze the content and create a searchable bookmark.
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e9/Notion-logo.svg" alt="Notion Logo" className="h-8 w-8 opacity-65" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Notion Integration</h3>
          <p className="text-gray-600 dark:text-gray-400">
            All your bookmarks are automatically saved to your Notion database for easy organization.
          </p>
        </div>
      </div>
      
      <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-lg mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Ready to organize your digital life?
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Fork this repo and start bookmarking webpages and images effortlessly.
            </p>
          </div>
          <a
            href="https://github.com/fyang0507/instant-bookmark"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center transition-colors no-underline"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HomePage;