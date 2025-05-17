import React from 'react';

const BookmarksPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          My Bookmarks
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage your bookmarks directly in Notion
        </p>
      </div>

      <div className="w-full aspect-[3/2] bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <iframe
          src={import.meta.env.VITE_NOTION_DATABASE_URL}
          className="w-full h-full border-0"
          title="Notion Bookmarks"
        />
      </div>
    </div>
  );
};

export default BookmarksPage;