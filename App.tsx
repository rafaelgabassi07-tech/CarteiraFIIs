import React, { useState } from 'react';
import { Header, BottomNav, NotificationsModal, LockScreen, ConfirmationModal } from './components/Layout';
import { Home } from './pages/Home';
import { Portfolio } from './pages/Portfolio';
import { Transactions } from './pages/Transactions';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Loader2 } from 'lucide-react';
import { AppProviders } from './components/Providers';
import { useAuth } from './hooks/useAuth';
import { useNotifications } from './hooks/useNotifications';
import { useData } from './hooks/useData';

const APP_VERSION = '7.0.7';

const AppContent: React.FC = () => {
  const { session, isGuest, isLocked, savedPasscode, isBiometricsEnabled, setIsLocked, isAuthLoading } = useAuth();
  const { notifications, unreadCount, showNotifications, setShowNotifications, markNotificationsAsRead, setNotifications } = useNotifications();
  const { isRefreshing, isAiLoading, isCloudSyncing, syncAll } = useData();
  
  const [currentTab, setCurrentTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);

  if (isAuthLoading) {
    return <div className="min-h-screen bg-slate-100 dark:bg-[#020617] flex items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  }
  
  if (isLocked && savedPasscode) {
    return <LockScreen isOpen={true} correctPin={savedPasscode} onUnlock={() => setIsLocked(false)} isBiometricsEnabled={isBiometricsEnabled} />;
  }

  if (!session && !isGuest) {
    return <Login />;
  }

  return (
    <>
      <Header 
        title={showSettings ? 'Ajustes' : currentTab === 'home' ? 'Visão Geral' : currentTab === 'portfolio' ? 'Custódia' : 'Histórico'} 
        showBack={showSettings} 
        onBack={() => setShowSettings(false)} 
        onSettingsClick={() => setShowSettings(true)} 
        onRefresh={() => syncAll(true)} 
        isRefreshing={isRefreshing || isAiLoading || isCloudSyncing} 
        onNotificationClick={() => { setShowNotifications(true); markNotificationsAsRead(); }} 
        notificationCount={unreadCount} 
        appVersion={APP_VERSION} 
      />
      <main className="max-w-screen-md mx-auto pt-2">
        {showSettings ? (
          <Settings appVersion={APP_VERSION} />
        ) : (
          <div key={currentTab} className="anim-fade-in is-visible">
            {currentTab === 'home' && <Home />}
            {currentTab === 'portfolio' && <Portfolio />}
            {currentTab === 'transactions' && <Transactions />}
          </div>
        )}
      </main>
      {!showSettings && <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />}
      <NotificationsModal 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={notifications} 
        onClear={() => setNotifications([])} 
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
};

export default App;