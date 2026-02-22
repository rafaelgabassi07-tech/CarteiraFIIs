import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    User, LogOut, Moon, Sun, Monitor, Shield, Bell, RefreshCw, 
    Upload, Trash2, ChevronRight, Check, Loader2, Search, 
    Calculator, Palette, ChevronDown, ChevronUp, Download, 
    History, Activity, FileJson, FileSpreadsheet, Database,
    Smartphone, Mail, ExternalLink, Info, Zap, Sliders, LifeBuoy, AlertTriangle
} from 'lucide-react';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal } from '../components/Layout';
import { ThemeType, ServiceMetric, Transaction, DividendReceipt } from '../types';
import { parseB3Excel } from '../services/excelService';

const ACCENT_COLORS = [
    { hex: '#0ea5e9', name: 'Sky' },
    { hex: '#10b981', name: 'Emerald' },
    { hex: '#6366f1', name: 'Indigo' },
    { hex: '#8b5cf6', name: 'Violet' },
    { hex: '#f43f5e', name: 'Rose' },
    { hex: '#f59e0b', name: 'Amber' },
];

// --- Components ---

const SettingsGroup = ({ 
    icon: Icon, 
    title, 
    description, 
    children, 
    defaultOpen = false 
}: { 
    icon: React.ElementType, 
    title: string, 
    description?: string, 
    children: React.ReactNode, 
    defaultOpen?: boolean 
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isOpen ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                        <Icon className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-zinc-900 dark:text-white leading-tight">{title}</h3>
                        {description && <p className="text-xs font-medium text-zinc-500 mt-0.5">{description}</p>}
                    </div>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-zinc-100 dark:bg-zinc-800 rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                </div>
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                        <div className="border-t border-zinc-100 dark:border-zinc-800">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface SettingsItemProps {
    icon: React.ElementType;
    label: string;
    value?: string | React.ReactNode;
    onClick?: () => void;
    isDanger?: boolean;
    rightElement?: React.ReactNode;
    description?: string;
    className?: string;
    disabled?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
    icon: Icon, label, value, onClick, isDanger, rightElement, description, className, disabled 
}) => (
    <motion.button 
        whileTap={onClick && !disabled ? { scale: 0.99 } : {}}
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`w-full flex items-center justify-between p-4 transition-all group text-left 
            ${onClick && !disabled ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'} 
            ${isDanger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : ''} 
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${className || ''}`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm border border-zinc-100 dark:border-zinc-800 
                ${isDanger 
                    ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:border-rose-900/30' 
                    : 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700'
                }`}>
                <Icon className={`w-5 h-5 ${isDanger ? 'text-rose-500' : 'text-current'}`} strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-bold block tracking-tight ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>
                    {label}
                </span>
                {description && (
                    <span className="text-[11px] text-zinc-400 font-medium leading-tight mt-0.5 block">
                        {description}
                    </span>
                )}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{value}</span>}
            {rightElement}
            {onClick && !rightElement && !disabled && (
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-0.5 transition-transform" />
            )}
        </div>
    </motion.button>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-spring 
            ${checked ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <motion.div 
            layout
            transition={{ type: "spring", stiffness: 700, damping: 30 }}
            className={`w-4 h-4 bg-white rounded-full shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0'}`} 
        />
    </div>
);

// --- Main Component ---

interface SettingsProps {
  onLogout: () => void;
  user: any;
  transactions: Transaction[];
  onImportTransactions: (t: Transaction[]) => void;
  dividends: DividendReceipt[];
  onImportDividends: (d: DividendReceipt[]) => void;
  onResetApp: () => void;
  theme: ThemeType;
  onSetTheme: (t: ThemeType) => void;
  accentColor: string;
  onSetAccentColor: (c: string) => void;
  privacyMode: boolean;
  onSetPrivacyMode: (v: boolean) => void;
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
  onCheckConnection: () => void;
  isCheckingConnection: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
    onLogout, user, transactions, onImportTransactions, dividends, onImportDividends, onResetApp,
    theme, onSetTheme, accentColor, onSetAccentColor, privacyMode, onSetPrivacyMode, appVersion,
    updateAvailable, onCheckUpdates, onShowChangelog, pushEnabled, onRequestPushPermission, onSyncAll,
    onForceUpdate, currentVersionDate, services, onCheckConnection, isCheckingConnection
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Optimized Handlers
    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsImporting(true);
        try {
            // Artificial delay for UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const { transactions: txs, dividends: divs } = await parseB3Excel(file);
            
            if (txs.length > 0) onImportTransactions(txs);
            if (divs.length > 0) onImportDividends(divs);
            
            // Simple feedback (could be replaced with a toast system)
            const message = `Importação concluída!\n\n${txs.length} transações\n${divs.length} proventos`;
            alert(message);
        } catch (err) {
            console.error(err);
            alert('Erro ao processar o arquivo. Verifique se é uma planilha válida da B3.');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExport = () => {
        const data = { 
            transactions, 
            dividends, 
            exportedAt: new Date().toISOString(),
            appVersion 
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investfiis-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await onSyncAll(true);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="pb-32 anim-fade-in px-4 max-w-3xl mx-auto space-y-6">
            
            {/* Profile Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-zinc-100 p-8 shadow-2xl group mb-8">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-white/10 dark:bg-black/5 backdrop-blur-md flex items-center justify-center text-white dark:text-zinc-900 border border-white/20 dark:border-black/10 shadow-inner">
                            <User className="w-9 h-9" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-zinc-900 dark:border-zinc-100">
                            PRO
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-black text-white dark:text-zinc-900 tracking-tight mb-1">
                            {user?.email?.split('@')[0] || 'Investidor'}
                        </h2>
                        <p className="text-sm text-white/60 dark:text-zinc-500 font-medium mb-4">
                            {user?.email}
                        </p>
                        
                        <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-black/5">
                                <Activity className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
                                <span className="text-xs font-bold text-white/80 dark:text-zinc-600">
                                    {transactions.length} Transações
                                </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 dark:bg-black/5 border border-white/10 dark:border-black/5">
                                <Zap className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                                <span className="text-xs font-bold text-white/80 dark:text-zinc-600">
                                    Nível {Math.floor(transactions.length / 10) + 1}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onLogout}
                        className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 dark:bg-black/5 hover:bg-rose-500/20 dark:hover:bg-rose-500/10 text-white/80 dark:text-zinc-600 hover:text-rose-300 dark:hover:text-rose-600 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-xs font-bold">Sair</span>
                    </button>
                </div>
            </div>

            {/* Accordion Groups */}
            <div className="space-y-4">
                
                {/* Appearance */}
                <SettingsGroup icon={Palette} title="Aparência" description="Tema e cores do aplicativo">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            </div>
                            <div>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white block">Tema</span>
                                <span className="text-[11px] text-zinc-400 font-medium">Escolha o visual do app</span>
                            </div>
                        </div>
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                            {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                                <button 
                                    key={t}
                                    onClick={() => onSetTheme(t)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all 
                                        ${theme === t 
                                            ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                >
                                    {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                                <Palette className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-zinc-900 dark:text-white block">Cor de Destaque</span>
                                <span className="text-[11px] text-zinc-400 font-medium">Personalize a identidade</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {ACCENT_COLORS.map(c => (
                                <button
                                    key={c.hex}
                                    onClick={() => onSetAccentColor(c.hex)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center
                                        ${accentColor === c.hex ? 'border-zinc-400 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c.hex }}
                                >
                                    {accentColor === c.hex && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </SettingsGroup>

                {/* Preferences */}
                <SettingsGroup icon={Sliders} title="Preferências" description="Privacidade e notificações">
                    <SettingsItem 
                        icon={Shield} 
                        label="Modo Privacidade" 
                        description="Ocultar valores monetários na interface"
                        rightElement={<ToggleSwitch checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />}
                    />
                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        <SettingsItem 
                            icon={Bell} 
                            label="Notificações Push" 
                            description="Alertas de proventos e datas importantes"
                            rightElement={<ToggleSwitch checked={pushEnabled} onChange={onRequestPushPermission} />}
                        />
                    </div>
                </SettingsGroup>

                {/* Data & Backup */}
                <SettingsGroup icon={Database} title="Dados e Backup" description="Importação, exportação e sincronização">
                    <SettingsItem 
                        icon={isImporting ? Loader2 : FileSpreadsheet}
                        label={isImporting ? "Processando..." : "Importar Planilha B3"}
                        description="Carregar transações do portal do investidor (XLSX)"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className={isImporting ? "animate-pulse" : ""}
                        rightElement={isImporting && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImport} 
                        accept=".xlsx,.xls" 
                        className="hidden" 
                    />
                    
                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        <SettingsItem 
                            icon={FileJson} 
                            label="Exportar Backup" 
                            description="Baixar cópia local dos seus dados (JSON)"
                            onClick={handleExport}
                        />
                    </div>

                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        <SettingsItem 
                            icon={RefreshCw} 
                            label="Sincronizar Dados" 
                            description="Forçar atualização com o servidor"
                            onClick={handleSync}
                            disabled={isSyncing}
                            rightElement={isSyncing && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                        />
                    </div>
                </SettingsGroup>

                {/* System */}
                <SettingsGroup icon={Activity} title="Sistema" description="Status, versão e novidades">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white block">Status dos Serviços</span>
                                    <span className="text-[11px] text-zinc-400 font-medium">Monitoramento em tempo real</span>
                                </div>
                            </div>
                            <button 
                                onClick={onCheckConnection} 
                                disabled={isCheckingConnection} 
                                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        
                        <div className="space-y-3 pl-[3.5rem]">
                            {services.map(s => (
                                <div key={s.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex h-2.5 w-2.5">
                                            {s.status === 'operational' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                                s.status === 'operational' ? 'bg-emerald-500' : 
                                                s.status === 'checking' ? 'bg-zinc-400' : 'bg-rose-500'
                                            }`}></span>
                                        </div>
                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{s.label}</span>
                                    </div>
                                    <span className={`text-[10px] font-mono font-bold ${
                                        !s.latency ? 'text-zinc-300' :
                                        s.latency < 200 ? 'text-emerald-500' : 
                                        s.latency < 500 ? 'text-amber-500' : 'text-rose-500'
                                    }`}>
                                        {s.latency ? `${s.latency}ms` : '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <SettingsItem 
                        icon={Download} 
                        label="Versão do App" 
                        value={`v${appVersion}`}
                        description={updateAvailable ? "Nova versão disponível!" : `Build: ${currentVersionDate || 'Desconhecido'}`}
                        onClick={onForceUpdate}
                        rightElement={updateAvailable && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />}
                    />
                    
                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        <SettingsItem 
                            icon={History} 
                            label="Novidades" 
                            description="Histórico de atualizações (Changelog)"
                            onClick={onShowChangelog}
                        />
                    </div>
                </SettingsGroup>

                {/* Support */}
                <SettingsGroup icon={LifeBuoy} title="Suporte" description="Ajuda e feedback">
                    <SettingsItem 
                        icon={Mail} 
                        label="Fale Conosco" 
                        description="Envie sugestões ou reporte bugs"
                        onClick={() => window.open('mailto:suporte@investfiis.com.br')} 
                        rightElement={<ExternalLink className="w-3 h-3 text-zinc-300" />}
                    />
                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        <SettingsItem 
                            icon={Info} 
                            label="Termos e Privacidade" 
                            description="Como tratamos seus dados"
                            onClick={() => {}} 
                        />
                    </div>
                </SettingsGroup>

                {/* Danger Zone */}
                <SettingsGroup icon={AlertTriangle} title="Zona de Perigo" description="Ações destrutivas">
                    <SettingsItem 
                        icon={Trash2} 
                        label="Resetar Aplicativo" 
                        description="Apagar todos os dados locais e sair"
                        onClick={() => setConfirmReset(true)}
                        isDanger
                    />
                </SettingsGroup>

            </div>

            {/* Footer */}
            <div className="text-center pt-4 pb-8">
                <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">
                    InvestFIIs © {new Date().getFullYear()}
                </p>
            </div>

            {/* Modals */}
            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Resetar Aplicativo?" 
                message="Esta ação irá remover todos os dados armazenados neste dispositivo. Seus dados sincronizados na nuvem permanecerão seguros." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
                confirmText="Sim, resetar tudo"
                cancelText="Cancelar"
                isDanger
            />
        </div>
    );
};
