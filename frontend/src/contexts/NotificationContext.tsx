import React, { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newNotification: Notification = {
        id,
        duration: 5000, // Default 5 seconds
        ...notification,
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto remove after duration (unless persistent)
      if (
        !newNotification.persistent &&
        newNotification.duration &&
        newNotification.duration > 0
      ) {
        setTimeout(() => {
          removeNotification(id);
        }, newNotification.duration);
      }
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      addNotification({ type: "success", message, title });
    },
    [addNotification]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      addNotification({
        type: "error",
        message,
        title,
        duration: 8000, // Longer duration for errors
        persistent: false,
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      addNotification({ type: "warning", message, title });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => {
      addNotification({ type: "info", message, title });
    },
    [addNotification]
  );

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle size={20} />;
      case "error":
        return <XCircle size={20} />;
      case "warning":
        return <AlertTriangle size={20} />;
      case "info":
        return <AlertTriangle size={20} />;
      default:
        return <AlertTriangle size={20} />;
    }
  };

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        {notification.title && (
          <div className="notification-title">{notification.title}</div>
        )}
        <div className="notification-message">{notification.message}</div>
      </div>
      <button className="notification-close" onClick={onRemove}>
        <X size={16} />
      </button>
    </div>
  );
};
