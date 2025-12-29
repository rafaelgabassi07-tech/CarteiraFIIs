import React, { createContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { AppNotification } from '../types';
import { CheckCircle2, AlertCircle, Loader2, PlusCircle, Pencil, XCircle } from 'lucide-react';
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

type SyncToastType = 'add' | 'update' | 'delete';
interface SyncToast {
  id: string;
  message: string;
  type: SyncToastType;
  position: 'top-left' | 'top-right';
}

interface NotificationContextType {
  toast: Toast | null;
  showToast: (type: Toast['type'], text: string) => void;
  confirmModal: ConfirmationModalState | null;
  setConfirmModal: (state: ConfirmationModalState | null) => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  addNotification: (notification: Omit<AppNotification, 'id'|'timestamp'|'read'>) => void;
  addSyncToast: (message: string, type: SyncToastType) => void;
  markNotificationsAsRead: () => void;
  unreadCount: number;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const SyncToastComponent: React.FC<{ toast: SyncToast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out animation
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const icons = {
    add: <PlusCircle className="w-4 h-4 text-emerald-500" />,
    update: <Pencil className="w-4 h-4 text-blue-500" />,
    delete: <XCircle className="w-4 h-4 text-rose-500" />,
  };

  const positionClasses = toast.position === 'top-left' ? 'left-4' : 'right-4';

  return (
    <div
      className={`fixed top-20 ${positionClasses} z-[9000] flex items-center gap-3 pl-3 pr-4 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg border border-slate-200/50 dark:border-white/10 transition-all duration-300 ease-out-quint ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      {icons[toast.type]}
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{toast.message}</span>
    </div>
  );
};


export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [syncToasts, setSyncToasts] = useState<SyncToast[]>([]);
  const lastPosition = useRef<'top-left' | 'top-right'>('top-right');

  const showToast = useCallback((type: Toast['type'], text: string) => {
    setToast({ type, text });
    if (type !== 'info') {
      setTimeout(() => setToast(null), 3000);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id'|'timestamp'|'read'>) => {
    setNotifications(prev => {
      if (prev.some(n => n.title === notification.title && (Date.now() - n.timestamp < 86400000))) {
        return prev;
      }
      return [{ ...notification, id: crypto.randomUUID(), timestamp: Date.now(), read: false }, ...prev];
    });
  }, []);

  const addSyncToast = useCallback((message: string, type: SyncToastType) => {
    lastPosition.current = lastPosition.current === 'top-left' ? 'top-right' : 'top-left';
    const newToast: SyncToast = {
      id: crypto.randomUUID(),
      message,
      type,
      position: lastPosition.current,
    };
    setSyncToasts(prev => [...prev, newToast]);
  }, []);

  const removeSyncToast = (id: string) => {
    setSyncToasts(prev => prev.filter(t => t.id !== id));
  };


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
    addSyncToast,
    markNotificationsAsRead,
    unreadCount,
    showNotifications,
    setShowNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {syncToasts.map(toast => (
        <SyncToastComponent key={toast.id} toast={toast} onDismiss={() => removeSyncToast(toast.id)} />
      ))}
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