import React from 'react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Configure your preferences and connections
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center">
              {theme === 'dark' ? (
                <Moon className="h-5 w-5 text-purple-500 mr-2" />
              ) : (
                <Sun className="h-5 w-5 text-yellow-500 mr-2" />
              )}
              <h2 className="text-xl font-semibold">Appearance</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex items-center">
                <span className="mr-3 text-sm text-gray-600 dark:text-gray-300">
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </span>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    theme === 'dark' ? 'bg-purple-600' : 'bg-yellow-500'
                  }`}
                  role="switch"
                  aria-checked={theme === 'dark'}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">About</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              Instant Bookmark helps you save and organize content from around the web. Created with ❤️ by <a href="https://github.com/fyang0507" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Fred Yang</a>.
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Version 0.2.1
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;