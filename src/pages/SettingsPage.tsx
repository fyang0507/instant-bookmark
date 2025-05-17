import React, { useState } from 'react';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Moon, Sun, Key, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [notionDatabaseUrl, setNotionDatabaseUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      localStorage.setItem('notionDatabaseUrl', notionDatabaseUrl);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="flex items-center">
              <Key className="h-5 w-5 text-blue-500 mr-2" />
              <h2 className="text-xl font-semibold">Notion Integration</h2>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Notion Database URL"
                value={notionDatabaseUrl}
                onChange={(e) => setNotionDatabaseUrl(e.target.value)}
                placeholder="Enter your public Notion database URL"
                fullWidth
              />
              
              <div className="pt-4 flex justify-end">
                <Button
                  type="submit"
                  isLoading={isSaving}
                  disabled={!notionDatabaseUrl || isSaving}
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">About</h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              Bookmark.io helps you save and organize content from around the web. Created with ❤️
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Version 1.0.0
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;