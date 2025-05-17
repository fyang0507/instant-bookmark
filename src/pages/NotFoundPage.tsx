import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Home } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      <div className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</div>
      <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Page not found</h1>
      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
        Sorry, we couldn't find the page you're looking for.
      </p>
      <Button 
        className="mt-8"
        onClick={() => navigate('/')}
        icon={<Home className="w-5 h-5" />}
      >
        Go back home
      </Button>
    </div>
  );
};

export default NotFoundPage;