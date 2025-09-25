import React, { useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  translationKey?: string;
  messageTranslationKey?: string;
  duration?: number;
  onClose: (id: string) => void;
  className?: string;
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type,
  title,
  message,
  translationKey,
  messageTranslationKey,
  duration = 5000,
  onClose,
  className = ''
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const displayTitle = translationKey ? t(translationKey) : title;
  const displayMessage = messageTranslationKey ? t(messageTranslationKey) : message;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className={`
      relative flex items-start space-x-3 p-4 rounded-lg border shadow-sm
      ${getBackgroundColor()}
      ${className}
    `}>
      <div className="flex-shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium ${getTextColor()}`}>
          {displayTitle}
        </h4>
        <p className={`mt-1 text-sm ${getTextColor()}`}>
          {displayMessage}
        </p>
      </div>
      
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label={t('common.close')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
