import React from 'react';
import { useAppSelector } from '../store/hooks';
import { removeNotification } from '../store/slices/uiSlice';
import { useAppDispatch } from '../store/hooks';
import Notification from './Notification';

const NotificationContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(state => state.ui.notifications);

  const handleClose = (id: string) => {
    dispatch(removeNotification(id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          id={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
