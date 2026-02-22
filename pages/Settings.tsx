import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Moon, Sun, Monitor, Shield, Bell, RefreshCw, Upload, Trash2, ChevronRight, Check, Loader2, Search, Calculator, Palette, ChevronDown, ChevronUp, Download, History, Activity } from 'lucide-react';
import { triggerScraperUpdate } from '../services/dataService';
import { ConfirmationModal } from '../components/Layout';
import { ThemeType, ServiceMetric, Transaction, DividendReceipt } from '../types';
import { parseB3Excel } from '../services/excelService';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCENT_COLORS = [
    { hex: '#0ea5e9', name: 'Sky' },
    { hex: '#10b981', name: 'Emerald' },
    { hex: '#6366f1', name: 'Indigo' },
    { hex: '#8b5cf6', name: 'Violet' },
    { hex: '#f43f5e', name: 'Rose' },
    { hex: '#f59e0b', name: 'Amber' },
];

const SettingsSection = ({ title, children }: { title?: string, children?: React.ReactNode }) => (
    <div className="mb-8">
        {title && <h3 className="px-6 mb-4 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.25em]">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800/50 overflow-hidden shadow-sm divide-y divide-zinc-50 dark:divide-zinc-800/30">
            {children}
        </div>
    </div>
);

interface SettingsItemProps {
    icon: React.ElementType;
    label: string;
    value?: string | React.ReactNode;
    onClick?: () => void;
    isDanger?: boolean;
    rightElement?: React.ReactNode;
    description?: string;
    className?: string;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon: Icon, label, value, onClick, isDanger, rightElement, description, className }) => (
    <button 
        onClick={onClick}
        disabled={!onClick}
        className={`w-full flex items-center justify-between p-5 transition-all group text-left ${onClick ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer active:scale-[0.99]' : 'cursor-default'} ${isDanger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : ''} ${className || ''}`}
    >
        <div className="flex items-center gap-5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-sm border border-zinc-100 dark:border-zinc-800 ${isDanger ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-zinc-50 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700 group-hover:scale-110'}`}>
                <Icon className={`w-5 h-5 ${isDanger ? 'text-rose-500' : 'text-current'}`} strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-black block tracking-tight ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {description && <span className="text-[10px] text-zinc-400 font-bold leading-tight mt-1 block tracking-wide">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-3">
            {value && <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">{value}</span>}
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />}
        </div>
    </button>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-spring ${checked ? 'bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-spring ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

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

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const { transactions: txs, dividends: divs } = await parseB3Excel(file);
            if (txs.length > 0) onImportTransactions(txs);
            if (divs.length > 0) onImportDividends(divs);
            alert(`Importado: ${txs.length} transações, ${divs.length} proventos.`);
        } catch (err) {
            alert('Erro ao processar arquivo.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="pb-32 anim-fade-in px-2">
            <div className="mb-8 bg-zinc-900 dark:bg-zinc-100 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 dark:bg-black/5 blur-3xl rounded-full -mr-20 -mt-20 group-hover:bg-white/10 dark:group-hover:bg-black/10 transition-colors duration-700"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -ml-16 -mb-16"></div>
                
                <div className="relative z-10 flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-white/10 dark:bg-black/10 backdrop-blur-md flex items-center justify-center text-white dark:text-zinc-900 border border-white/20 dark:border-black/10 shadow-inner shrink-0 scale-100 group-hover:scale-105 transition-transform duration-500">
                        <User className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black text-white dark:text-zinc-900 truncate tracking-tight">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                        <p className="text-xs text-white/60 dark:text-zinc-500 font-medium truncate">{user?.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                Premium
                            </span>
                            <span className="text-[10px] text-white/40 dark:text-zinc-400 font-bold tracking-wider">v{appVersion}</span>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-11 h-11 rounded-2xl bg-white/10 dark:bg-black/5 flex items-center justify-center text-white/60 dark:text-zinc-400 hover:text-rose-400 dark:hover:text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <SettingsSection title="Personalização">
                <div className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Tema</span>
                    </div>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                            <button 
                                key={t}
                                onClick={() => onSetTheme(t)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                            >
                                {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-3.5 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <Palette className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">Cor de Destaque</span>
                    </div>
                    <div className="flex gap-2">
                        {ACCENT_COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => onSetAccentColor(c.hex)}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${accentColor === c.hex ? 'border-zinc-400 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                style={{ backgroundColor: c.hex }}
                            />
                        ))}
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection title="Preferências">
                <SettingsItem 
                    icon={Shield} 
                    label="Modo Privacidade" 
                    description="Ocultar valores monetários"
                    rightElement={<ToggleSwitch checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />}
                />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={Bell} 
                        label="Notificações" 
                        description="Alertas de proventos e datas com"
                        rightElement={<ToggleSwitch checked={pushEnabled} onChange={onRequestPushPermission} />}
                    />
                </div>
            </SettingsSection>

            <SettingsSection title="Ferramentas">
                <div className="p-4 text-sm text-zinc-500 text-center italic">
                    Calculadoras movidas para a página inicial.
                </div>
            </SettingsSection>

            <SettingsSection title="Dados & Backup">
                <SettingsItem 
                    icon={Upload} 
                    label="Importar Planilha B3" 
                    description="XLSX do portal do investidor"
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={Download} 
                        label="Exportar Backup (JSON)" 
                        description="Baixar todos os dados locais"
                        onClick={() => {
                            const data = { transactions, dividends };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `investfiis-backup-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                        }} 
                    />
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={RefreshCw} 
                        label="Sincronizar Dados" 
                        description="Forçar atualização com a nuvem"
                        onClick={() => onSyncAll(true)} 
                    />
                </div>
            </SettingsSection>

            <SettingsSection title="Suporte & Feedback">
                <SettingsItem 
                    icon={Shield} 
                    label="Central de Segurança" 
                    description="Como protegemos seus dados"
                    onClick={() => {}} 
                />
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={Bell} 
                        label="Sugerir Melhoria" 
                        description="Fale diretamente com os devs"
                        onClick={() => window.open('mailto:suporte@investfiis.com.br')} 
                    />
                </div>
            </SettingsSection>

            <SettingsSection title="Sistema">
                <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                <Activity className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">Status dos Serviços</span>
                        </div>
                        <button onClick={onCheckConnection} disabled={isCheckingConnection} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-indigo-500 transition-colors">
                            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="space-y-2 pl-[3.25rem]">
                        {services.map(s => (
                            <div key={s.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'checking' ? 'bg-zinc-400 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-400">{s.latency ? `${s.latency}ms` : '-'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <SettingsItem 
                    icon={Download} 
                    label="Buscar Atualização" 
                    description={updateAvailable ? "Nova versão disponível!" : `Versão atual: ${appVersion}`}
                    onClick={onForceUpdate}
                    rightElement={updateAvailable && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>}
                />
                
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={History} 
                        label="Novidades (Changelog)" 
                        description="Veja o histórico de mudanças"
                        onClick={onShowChangelog}
                    />
                </div>
            </SettingsSection>

            <SettingsSection title="Zona de Perigo">
                <SettingsItem 
                    icon={Trash2} 
                    label="Resetar Aplicativo" 
                    description="Limpar dados locais e sair"
                    onClick={() => setConfirmReset(true)}
                    isDanger
                />
            </SettingsSection>

            <div className="text-center py-6 pb-10 opacity-50">
                <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">
                    InvestFIIs Cloud • Build {currentVersionDate || 'Unknown'}
                </p>
            </div>

            <ConfirmationModal 
                isOpen={confirmReset} 
                title="Tem certeza?" 
                message="Isso removerá os dados locais do dispositivo. Seus dados na nuvem (Supabase) permanecerão seguros." 
                onConfirm={() => { setConfirmReset(false); onResetApp(); }} 
                onCancel={() => setConfirmReset(false)} 
            />
        </div>
    );
};