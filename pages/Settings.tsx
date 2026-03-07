import React, { useState, useRef, useMemo, memo } from 'react';
import { 
    User, Settings as SettingsIcon, Bell, Shield, Database, 
    Cloud, RefreshCw, LogOut, ChevronRight, Moon, Sun, 
    Monitor, Palette, Eye, EyeOff, Download, Upload, 
    Trash2, Info, CheckCircle2, AlertTriangle, Zap,
    Smartphone, FileText, Globe, Clock, Calculator,
    Search, X, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

const ToggleSwitch = ({ enabled, onToggle, icon: Icon }: { enabled: boolean; onToggle: () => void; icon?: any }) => (
    <button
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            enabled ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-800'
        }`}
    >
        <span
            className={`pointer-events-none relative inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
        >
            {Icon && <Icon className={`w-3.5 h-3.5 ${enabled ? 'text-indigo-500' : 'text-zinc-400'}`} />}
        </span>
    </button>
);

const SettingsGroup = ({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: any }) => (
    <div className="mb-8 last:mb-0">
        <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">{title}</h3>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
            {children}
        </div>
    </div>
);

const SettingsItem = ({ 
    label, 
    description, 
    icon: Icon, 
    onClick, 
    value, 
    badge, 
    danger,
    isLoading
}: { 
    label: string; 
    description?: string; 
    icon: any; 
    onClick?: () => void; 
    value?: React.ReactNode;
    badge?: string;
    danger?: boolean;
    isLoading?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={!onClick || isLoading}
        className={`w-full flex items-center justify-between p-5 text-left transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 group ${
            danger ? 'hover:bg-rose-50 dark:hover:bg-rose-500/5' : ''
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                danger 
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' 
                    : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10'
            }`}>
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${danger ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                        {label}
                    </span>
                    {badge && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-[10px] font-black text-white uppercase tracking-wider">
                            {badge}
                        </span>
                    )}
                </div>
                {description && (
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">{description}</p>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <div className="text-sm font-bold text-zinc-500">{value}</div>}
            {onClick && !value && <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-indigo-500 transition-colors" />}
        </div>
    </button>
);

const CeilingPriceTool = ({ showToast }: { showToast: any }) => {
    const [ticker, setTicker] = useState('');
    const [yieldTarget, setYieldTarget] = useState(6);
    const [result, setResult] = useState<{ price: number; dy: number; ceiling: number } | null>(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        if (!ticker) return;
        setLoading(true);
        try {
            const results = await triggerScraperUpdate([ticker], false);
            const data = results[0];
            if (data.status === 'success' && data.details) {
                const price = data.details.price || 0;
                const dy = data.details.dy || 0;
                const dividendPerShare = (price * dy) / 100;
                const ceiling = dividendPerShare / (yieldTarget / 100);
                setResult({ price, dy, ceiling });
            } else {
                showToast('error', 'Ativo não encontrado ou erro na busca.');
            }
        } catch (e) {
            showToast('error', 'Erro ao calcular.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Preço Teto (Graham/Bazin)</h4>
            </div>
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    placeholder="TICKER" 
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="relative w-24">
                    <input 
                        type="number" 
                        value={yieldTarget}
                        onChange={e => setYieldTarget(Number(e.target.value))}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">%</span>
                </div>
                <button 
                    onClick={calculate}
                    disabled={loading || !ticker}
                    className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl px-4 py-2 transition-colors"
                >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
            </div>

            {result && (
                <div className="grid grid-cols-2 gap-3 anim-fade-in">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Cotação Atual</p>
                        <p className="text-sm font-black text-zinc-900 dark:text-white">R$ {result.price.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Preço Teto ({yieldTarget}%)</p>
                        <p className={`text-sm font-black ${result.price > result.ceiling ? 'text-rose-500' : 'text-emerald-500'}`}>
                            R$ {result.ceiling.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

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
        <div className="pb-20">
            {/* Perfil Header */}
            <div className="relative mb-10 px-2">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 blur-3xl rounded-full -z-10"></div>
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-900 shadow-xl">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                                <User className="w-10 h-10 text-zinc-400" />
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-indigo-500 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-white shadow-lg">
                            <Zap className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Investidor'}
                            </h2>
                            <span className="px-2 py-0.5 rounded-lg bg-indigo-500 text-[10px] font-black text-white uppercase tracking-widest">PRO</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-400 mb-3">{user?.email}</p>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ordens</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white">{transactions.length}</span>
                            </div>
                            <div className="w-px h-6 bg-zinc-100 dark:bg-zinc-800"></div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ativos</span>
                                <span className="text-sm font-black text-zinc-900 dark:text-white">
                                    {new Set(transactions.map(t => t.ticker)).size}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                {/* Aparência */}
                <SettingsGroup title="Aparência" icon={Palette}>
                    <div className="p-5 flex items-center justify-between border-b border-zinc-50 dark:border-zinc-800/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                                {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                            </div>
                            <div>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white">Tema do App</span>
                                <p className="text-xs text-zinc-400 font-medium mt-0.5">Escolha o visual preferido</p>
                            </div>
                        </div>
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            {(['light', 'system', 'dark'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => onSetTheme(t)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                        theme === t 
                                            ? 'bg-white dark:bg-zinc-700 text-indigo-500 shadow-sm' 
                                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                                    }`}
                                >
                                    {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <SettingsItem 
                        label="Modo Privacidade" 
                        description="Ocultar valores sensíveis na tela"
                        icon={privacyMode ? EyeOff : Eye}
                        value={<ToggleSwitch enabled={privacyMode} onToggle={() => onSetPrivacyMode(!privacyMode)} />}
                    />
                </SettingsGroup>

                {/* Preferências */}
                <SettingsGroup title="Preferências" icon={SettingsIcon}>
                    <SettingsItem 
                        label="Notificações Push" 
                        description="Alertas de proventos e mercado"
                        icon={Bell}
                        value={<ToggleSwitch enabled={pushEnabled} onToggle={handleTogglePush} />}
                    />
                    <div className="p-5">
                        <CeilingPriceTool showToast={showToast} />
                    </div>
                </SettingsGroup>

                {/* Dados e Backup */}
                <SettingsGroup title="Dados & Backup" icon={Database}>
                    <SettingsItem 
                        label="Importar Planilha B3" 
                        description="Sincronizar ordens via Excel (.xlsx)"
                        icon={Upload}
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={isImporting}
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        accept=".xlsx" 
                        className="hidden" 
                    />
                    <SettingsItem 
                        label="Exportar Backup" 
                        description="Salvar dados em arquivo JSON"
                        icon={Download}
                        onClick={handleExport}
                        isLoading={isExporting}
                    />
                    <SettingsItem 
                        label="Sincronizar Agora" 
                        description="Forçar atualização com a nuvem"
                        icon={RefreshCw}
                        onClick={handleSync}
                        isLoading={isSyncing}
                    />
                </SettingsGroup>

                {/* Sistema */}
                <SettingsGroup title="Sistema" icon={Globe}>
                    <SettingsItem 
                        label="Status dos Serviços" 
                        description="Verificar latência e conexão"
                        icon={Globe}
                        onClick={onCheckConnection}
                        isLoading={isCheckingConnection}
                    />
                    {services.length > 0 && (
                        <div className="px-5 pb-5 space-y-3">
                            {services.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            s.status === 'operational' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                                            s.status === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                                        }`} />
                                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{s.label}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-400">{s.latency ? `${s.latency}ms` : '--'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <SettingsItem 
                        label="Verificar Updates" 
                        description={`Versão atual: ${appVersion}`}
                        icon={Smartphone}
                        onClick={handleCheckUpdates}
                        badge={updateAvailable ? 'Novo' : undefined}
                    />
                    <SettingsItem 
                        label="Notas da Versão" 
                        description={`Atualizado em ${currentVersionDate}`}
                        icon={FileText}
                        onClick={onShowChangelog}
                    />
                </SettingsGroup>

                {/* Danger Zone */}
                <SettingsGroup title="Zona de Perigo" icon={Shield}>
                    <SettingsItem 
                        label="Resetar Aplicativo" 
                        description="Limpar cache e dados locais"
                        icon={Trash2}
                        danger
                        onClick={() => setShowResetConfirm(true)}
                    />
                    <SettingsItem 
                        label="Sair da Conta" 
                        description="Encerrar sessão atual"
                        icon={LogOut}
                        danger
                        onClick={onLogout}
                    />
                </SettingsGroup>

                <div className="text-center pt-4 opacity-30">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">InvestFiis © 2024</p>
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
