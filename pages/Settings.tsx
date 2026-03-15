import React, { useState, useRef, useMemo, memo } from 'react';
import { 
    User, Bell, Shield, Database, 
    RefreshCw, LogOut, ChevronRight, Moon, Sun, 
    Monitor, Palette, Eye, EyeOff, Download, Upload, 
    Trash2, Zap, Smartphone, FileText, Globe, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Transaction, DividendReceipt, ServiceMetric, AssetType } from '../types';
import { parseB3Excel } from '../services/excelService';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal } from '../components/Layout';

interface SettingsProps {
    onLogout: () => Promise<void>;
    user: any;
    transactions: Transaction[];
    onImportTransactions: (txs: Transaction[]) => void;
    dividends: DividendReceipt[];
    onImportDividends: (divs: DividendReceipt[]) => void;
    onResetApp: () => void;
    theme: 'light' | 'dark' | 'system';
    onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
    accentColor: string;
    onSetAccentColor: (color: string) => void;
    privacyMode: boolean;
    onSetPrivacyMode: (mode: boolean) => void;
    appVersion: string;
    updateAvailable: boolean;
    onCheckUpdates: () => Promise<boolean>;
    onShowChangelog: () => void;
    pushEnabled: boolean;
    onRequestPushPermission: () => void;
    onSyncAll: (force?: boolean) => Promise<void>;
    onForceUpdate: () => void;
    currentVersionDate: string | null;
    services: ServiceMetric[];
    onCheckConnection: () => Promise<void>;
    isCheckingConnection: boolean;
    showToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-indigo-500/50' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
    >
        <span
            className={`pointer-events-none relative inline-block h-6 w-6 transform rounded-full shadow-lg transition duration-200 ease-in-out -translate-y-0.5 ${
                enabled ? 'translate-x-5 bg-indigo-500' : 'translate-x-0 bg-white dark:bg-zinc-400'
            }`}
        />
    </button>
);

const SettingsGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
        <h3 className="text-[11px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] mb-3 px-6">{title}</h3>
        <div className="space-y-1">
            {children}
        </div>
    </div>
);

const SettingsItem = ({ 
    label, 
    description, 
    icon: Icon, 
    iconBg,
    onClick, 
    value, 
    badge, 
    danger,
    isLoading
}: { 
    label: string; 
    description?: string; 
    icon: React.ElementType;
    iconBg?: string;
    onClick?: () => void; 
    value?: React.ReactNode;
    badge?: string;
    danger?: boolean;
    isLoading?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={!onClick || isLoading}
        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-all active:bg-zinc-100 dark:active:bg-zinc-800/50 group ${
            danger ? 'text-rose-500' : ''
        }`}
    >
        <div className="flex items-center gap-5 flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                iconBg || (danger ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')
            }`}>
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" strokeWidth={2} />}
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className={`text-base font-medium ${danger ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        {label}
                    </span>
                    {badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-[8px] font-black text-white uppercase tracking-wider">
                            {badge}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 line-clamp-1">{description}</p>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
            {value ? value : (onClick && <ChevronRight className="w-5 h-5 text-zinc-300" />)}
        </div>
    </button>
);



export const Settings: React.FC<SettingsProps> = ({ 
    onLogout, user, transactions, onImportTransactions, 
    dividends, onImportDividends, onResetApp,
    theme, onSetTheme, accentColor, onSetAccentColor,
    privacyMode, onSetPrivacyMode, appVersion,
    updateAvailable, onCheckUpdates, onShowChangelog,
    pushEnabled, onRequestPushPermission, onSyncAll,
    onForceUpdate, currentVersionDate,
    services, onCheckConnection, isCheckingConnection,
    showToast
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const { transactions: importedTxs } = await parseB3Excel(file);
            if (importedTxs.length > 0) {
                onImportTransactions(importedTxs);
                showToast('success', `${importedTxs.length} ordens importadas!`);
            } else {
                showToast('error', 'Nenhuma ordem encontrada no arquivo.');
            }
        } catch (err) {
            showToast('error', 'Falha ao processar arquivo B3.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExport = () => {
        setIsExporting(true);
        try {
            const data = {
                version: appVersion,
                exportDate: new Date().toISOString(),
                transactions,
                dividends
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `investfiis_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('success', 'Backup gerado com sucesso!');
        } catch (err) {
            showToast('error', 'Falha ao exportar dados.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await onSyncAll(true);
            showToast('success', 'Sincronização concluída!');
        } catch (err) {
            showToast('error', 'Falha na sincronização.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCheckUpdates = async () => {
        const hasUpdate = await onCheckUpdates();
        if (!hasUpdate) {
            showToast('info', 'Você já está na versão mais recente.');
        } else {
            showToast('success', 'Nova versão disponível!');
        }
    };

    const handleTogglePush = async () => {
        if (!pushEnabled && 'Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                onRequestPushPermission();
                showToast('success', 'Notificações ativadas!');
            } else {
                showToast('error', 'Permissão de notificação negada.');
            }
        } else {
            onRequestPushPermission();
        }
    };

    return (
        <div className="pb-24 -mx-4">
            {/* Android Settings Header */}
            <div className="px-6 pt-4 pb-6 sticky top-0 bg-primary-light dark:bg-primary-dark z-20">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-normal text-zinc-900 dark:text-white">Configurações</h1>
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        {user?.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <User className="w-5 h-5 text-zinc-400" />
                        )}
                    </div>
                </div>

                {/* Android Search Bar */}
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        <Search className="w-5 h-5 text-zinc-400" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="Pesquisar nas configurações" 
                        className="w-full bg-zinc-100 dark:bg-zinc-800/50 border-none pl-12 pr-4 py-3.5 rounded-full text-sm font-normal outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                </div>
            </div>

            <div className="mt-2">
                {/* Perfil Android Style */}
                <button 
                    onClick={() => {}} 
                    className="w-full flex items-center gap-5 px-6 py-6 active:bg-zinc-100 dark:active:bg-zinc-800/50 transition-all border-b border-zinc-100 dark:border-zinc-800/50 mb-4"
                >
                    <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                        {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'I'}
                    </div>
                    <div className="flex-1 text-left">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Investidor'}
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Conta Google, serviços e backup</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-300" />
                </button>

                {/* Grupos de Configurações */}
                <SettingsGroup title="Conectividade e Sincronização">
                    <SettingsItem 
                        label="Sincronizar Agora" 
                        description="Atualizar dados com a nuvem"
                        icon={RefreshCw}
                        iconBg="bg-blue-100 dark:bg-blue-500/10 text-blue-500"
                        onClick={handleSync}
                        isLoading={isSyncing}
                    />
                    <SettingsItem 
                        label="Status dos Serviços" 
                        description="Verificar latência e conexão"
                        icon={Globe}
                        iconBg="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500"
                        onClick={onCheckConnection}
                        isLoading={isCheckingConnection}
                    />
                </SettingsGroup>

                <SettingsGroup title="Personalização">
                    <SettingsItem 
                        label="Tema do Dispositivo" 
                        description={theme === 'dark' ? 'Escuro' : theme === 'light' ? 'Claro' : 'Seguir sistema'}
                        icon={theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor}
                        iconBg="bg-purple-100 dark:bg-purple-500/10 text-purple-500"
                        onClick={() => {
                            const themes: ('light' | 'system' | 'dark')[] = ['light', 'system', 'dark'];
                            const next = themes[(themes.indexOf(theme) + 1) % themes.length];
                            onSetTheme(next);
                        }}
                    />
                    <SettingsItem 
                        label="Modo Privacidade" 
                        description="Ocultar valores sensíveis"
                        icon={privacyMode ? EyeOff : Eye}
                        iconBg="bg-amber-100 dark:bg-amber-500/10 text-amber-500"
                        value={<ToggleSwitch enabled={privacyMode} onToggle={() => onSetPrivacyMode(!privacyMode)} />}
                    />
                    <SettingsItem 
                        label="Notificações" 
                        description="Alertas de proventos e mercado"
                        icon={Bell}
                        iconBg="bg-rose-100 dark:bg-rose-500/10 text-rose-500"
                        value={<ToggleSwitch enabled={pushEnabled} onToggle={handleTogglePush} />}
                    />
                </SettingsGroup>

                <SettingsGroup title="Armazenamento e Backup">
                    <SettingsItem 
                        label="Importar Dados" 
                        description="Sincronizar ordens via Excel (.xlsx)"
                        icon={Upload}
                        iconBg="bg-indigo-100 dark:bg-indigo-500/10 text-indigo-500"
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={isImporting}
                    />
                    <SettingsItem 
                        label="Exportar Backup" 
                        description="Salvar dados em arquivo JSON"
                        icon={Download}
                        iconBg="bg-sky-100 dark:bg-sky-500/10 text-sky-500"
                        onClick={handleExport}
                        isLoading={isExporting}
                    />
                </SettingsGroup>

                <SettingsGroup title="Sobre o Aplicativo">
                    <SettingsItem 
                        label="Atualização do Sistema" 
                        description={`Versão ${appVersion} instalada`}
                        icon={Smartphone}
                        iconBg="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        onClick={handleCheckUpdates}
                        badge={updateAvailable ? 'Novo' : undefined}
                    />
                    <SettingsItem 
                        label="Notas da Versão" 
                        description={`Última atualização: ${currentVersionDate}`}
                        icon={FileText}
                        iconBg="bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        onClick={onShowChangelog}
                    />
                </SettingsGroup>

                <SettingsGroup title="Segurança e Privacidade">
                    <SettingsItem 
                        label="Resetar Aplicativo" 
                        description="Limpar cache e dados locais"
                        icon={Trash2}
                        danger
                        onClick={() => setShowResetConfirm(true)}
                    />
                    <SettingsItem 
                        label="Sair da Conta" 
                        description="Encerrar sessão no dispositivo"
                        icon={LogOut}
                        danger
                        onClick={onLogout}
                    />
                </SettingsGroup>

                <div className="text-center py-10 opacity-30">
                    <p className="text-xs font-medium text-zinc-400">InvestFiis v{appVersion}</p>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">Powered by Android Style</p>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => {
                    onResetApp();
                    setShowResetConfirm(false);
                }}
                title="Resetar App?"
                message="Isso limpará todas as configurações locais e cache. Seus dados na nuvem permanecerão salvos."
                confirmLabel="Resetar Tudo"
                confirmVariant="danger"
            />
        </div>
    );
};

export const MemoizedSettings = memo(Settings);
