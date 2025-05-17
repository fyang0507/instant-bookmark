import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { ToastContainer } from './ui/Toast';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};

export default Layout;