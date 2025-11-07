import toast from 'react-hot-toast';
import React from 'react';

export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 4000,
    position: 'top-right',
  });
};

export const showError = (message: string) => {
  toast.error(message, {
    duration: 6000,
    position: 'top-right',
  });
};

export const showWarning = (message: string) => {
  toast(message, {
    duration: 5000,
    position: 'top-right',
    icon: '⚠️',
    style: {
      background: '#fbbf24',
      color: '#fff',
    },
  });
};

export const showUndoToast = (message: string, onUndo: () => void, duration: number = 5000) => {
  const toastId = toast(
    (t) => React.createElement('div', { className: 'flex items-center space-x-3' },
      React.createElement('span', null, message),
      React.createElement('button', {
        onClick: () => {
          onUndo();
          toast.dismiss(t.id);
        },
        className: 'px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none'
      }, 'Undo'),
      React.createElement('button', {
        onClick: () => toast.dismiss(t.id),
        className: 'text-gray-400 hover:text-gray-600'
      }, '×')
    ),
    {
      duration,
      position: 'top-right',
      icon: '🗑️',
    }
  );
  return toastId;
};

export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};

export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) => {
  return toast.promise(promise, messages, {
    position: 'top-right',
  });
};
