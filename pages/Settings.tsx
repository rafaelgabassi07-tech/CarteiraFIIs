import React, { useState } from 'react';
import { Download, Upload, ShieldAlert, ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCcw, Eye, EyeOff, Palette, Database, Info, LogOut, User, Activity, Cloud, Loader2 } from 'lucide-react';
import { SwipeableModal, ConfirmationModal } from '../components/Layout';

export const Settings: React.FC<any> = ({ 
  user, onLogout, onResetApp, theme, onSetTheme, privacyMode, onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, onShowChangelog,
  pushEnabled, onRequestPushPermission, lastAiStatus, onForceUpdate, handleExport, handleImportClick, handleClearQuoteCache, handleClearDivCache
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'details'>('menu');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const Section = ({ title, children }: any) => (
    <div className="mb-8">
        {title && <h3 className="px-4 mb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{title}</h3>}
        <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden">{children}</div>
    </div>
  );

  const MenuItem = ({ icon: Icon, label, value, onClick, isDestructive, hasUpdate }: any) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-4">
            <Icon className={`w-5 h-5 ${isDestructive ? 'text-rose-500' : 'text-zinc-400'}`} strokeWidth={1.5} />
            <span className={`text-sm font-medium ${isDestructive ? 'text-rose-500' : 'text-zinc-200'}`}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs text-zinc-500">{value}</span>}
            {hasUpdate && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
            <ChevronRight className="w-4 h-4 text-zinc-700" />
        </div>
    </button>
  );

  return (
    <div className="pt-20 pb-32 px-4 max-w-lg mx-auto">
        <div className="mb-8 px-4">
            <h2 className="text-2xl font-bold text-white mb-1">Ajustes</h2>
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{user?.email}</p>
        </div>

        <Section>
            <MenuItem icon={Palette} label="Aparência" onClick={() => onSetTheme(theme === 'dark' ? 'light' : 'dark')} value={theme === 'dark' ? 'Escuro' : 'Claro'} />
            <MenuItem icon={privacyMode ? EyeOff : Eye} label="Privacidade" onClick={() => onSetPrivacyMode(!privacyMode)} value={privacyMode ? 'Ativo' : 'Inativo'} />
            <MenuItem icon={Bell} label="Notificações" onClick={onRequestPushPermission} value={pushEnabled ? 'On' : 'Off'} />
        </Section>

        <Section title="Dados">
            <MenuItem icon={Database} label="Backup & Cache" onClick={() => setActiveSection('details')} />
            <MenuItem icon={RefreshCcw} label="Atualizações" onClick={onCheckUpdates} hasUpdate={updateAvailable} value={`v${appVersion}`} />
        </Section>

        <Section>
            <MenuItem icon={LogOut} label="Sair da Conta" onClick={() => setShowLogoutConfirm(true)} isDestructive />
        </Section>

        <p className="text-center text-[10px] text-zinc-700 font-mono mt-8">Build {appVersion}</p>

        {/* Confirmation Modal */}
        <ConfirmationModal
            isOpen={showLogoutConfirm}
            title="Sair?"
            message="Seus dados locais serão limpos."
            onConfirm={() => { setShowLogoutConfirm(false); onLogout(); }}
            onCancel={() => setShowLogoutConfirm(false)}
        />
    </div>
  );
};