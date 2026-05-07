import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const NotificationContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showNotification = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
                {notifications.map(notification => (
                    <div 
                        key={notification.id}
                        className={`
                            pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-lg border-l-4 transform transition-all duration-300 animate-slide-in
                            flex items-start gap-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100
                            ${notification.type === 'success' ? 'border-green-500' : 
                              notification.type === 'error' ? 'border-red-500' : 
                              'border-blue-500'}
                        `}
                    >
                        <div className={`mt-0.5 ${
                            notification.type === 'success' ? 'text-green-500' : 
                            notification.type === 'error' ? 'text-red-500' : 
                            'text-blue-500'
                        }`}>
                            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
                            {notification.type === 'error' && <AlertCircle className="h-5 w-5" />}
                            {notification.type === 'info' && <Info className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-sm">{notification.message}</p>
                        </div>
                        <button 
                            onClick={() => removeNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>
        </NotificationContext.Provider>
    );
};
