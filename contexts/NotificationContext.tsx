import React, { createContext, useState, useMemo, useCallback } from 'react';
import { AppNotification } from '../types';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
// FIX: Import ConfirmationModal component
import { ConfirmationModal } from '../components/Layout';

interface Toast {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface NotificationContextType {
  toast: Toast | null;
  showToast: (type: Toast['type'], text: string) => void;
  confirmModal: ConfirmationModalState | null;
  setConfirmModal: (state: ConfirmationModalState | null) => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  addNotification: (notification: Omit<AppNotification, 'id'|'timestamp'|'read'>) => void;
  markNotificationsAsRead: () => void;
  unreadCount: number;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const showToast = useCallback((type: Toast['type'], text: string) => {
    setToast({ type, text });
    if (type !== 'info') {
      setTimeout(() => setToast(null), 3000);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id'|'timestamp'|'read'>) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === notification.title && (Date.now() - n.timestamp < 86400000))) {
        return prev; // Evita duplicatas recentes
      }
      return [{ ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false }, ...prev];
    });
  }, []);

  const markNotificationsAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const value = {
    toast,
    showToast,
    confirmModal,
    setConfirmModal,
    notifications,
    setNotifications,
    addNotification,
    markNotificationsAsRead,
    unreadCount,
    showNotifications,
    setShowNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] anim-fade-in-up is-visible w-auto max-w-[90%]">
          <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-full bg-slate-900/90 dark:bg-white/90 backdrop-blur-xl shadow-xl">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'info' ? 'bg-slate-800 dark:bg-slate-200' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              {toast.type === 'info' ? <Loader2 className="w-3 h-3 text-white dark:text-slate-900 animate-spin" /> : toast.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-white" /> : <AlertCircle className="w-3 h-3 text-white" />}
            </div>
            <span className="text-[10px] font-bold text-white dark:text-slate-900 tracking-wide truncate">{toast.text}</span>
          </div>
        </div>
      )}
      {confirmModal?.isOpen && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </NotificationContext.Provider>
  );
};