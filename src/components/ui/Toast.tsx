import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 300); // Start exit animation before actual removal

    const removeTimer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500',
    error: 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500',
  };

  return (
    <div 
      className={`
        w-full max-w-sm p-4 mb-3 rounded-md shadow-md 
        ${bgColors[type]}
        flex items-center justify-between
        transition-all duration-300 ease-in-out transform
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{message}</p>
        </div>
      </div>
      <button
        onClick={() => setIsExiting(true)}
        className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

// Toast Container and Context

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = (id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    // Expose the addToast function globally
    (window as any).addToast = (type: ToastType, message: string, duration?: number) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prevToasts) => [...prevToasts, { id, type, message, duration }]);
      return id;
    };

    return () => {
      delete (window as any).addToast;
    };
  }, []);

  return createPortal(
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={removeToast}
        />
      ))}
    </div>,
    document.body
  );
};

// Hook for using toast
export const useToast = () => {
  const addToast = (type: ToastType, message: string, duration?: number) => {
    return (window as any).addToast?.(type, message, duration);
  };

  return {
    success: (message: string, duration?: number) => addToast('success', message, duration),
    error: (message: string, duration?: number) => addToast('error', message, duration),
    info: (message: string, duration?: number) => addToast('info', message, duration),
  };
};