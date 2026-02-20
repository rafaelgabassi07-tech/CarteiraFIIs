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
    <div className="mb-4">
        {title && <h3 className="px-4 mb-2 text-xs font-black text-zinc-400 uppercase tracking-widest">{title}</h3>}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm divide-y divide-zinc-100 dark:divide-zinc-800">
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
        className={`w-full flex items-center justify-between p-3.5 transition-colors group text-left ${onClick ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : 'cursor-default'} ${isDanger ? 'hover:bg-rose-50 dark:hover:bg-rose-900/10' : ''} ${className || ''}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shadow-sm ${isDanger ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 group-hover:bg-white dark:group-hover:bg-zinc-700'}`}>
                <Icon className={`w-4 h-4 ${isDanger ? 'text-rose-500' : 'text-current'}`} strokeWidth={2} />
            </div>
            <div>
                <span className={`text-sm font-bold block ${isDanger ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-white'}`}>{label}</span>
                {description && <span className="text-[10px] text-zinc-400 font-medium leading-tight">{description}</span>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
            {rightElement}
            {onClick && !rightElement && <ChevronRight className="w-4 h-4 text-zinc-300" />}
        </div>
    </button>
);

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
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
            <div className="flex items-center gap-4 mb-6 bg-white dark:bg-zinc-900 p-4 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-inner shrink-0">
                    <User className="w-7 h-7" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-zinc-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'Investidor'}</h2>
                    <p className="text-xs text-zinc-500 font-medium truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-wide">
                            Pro
                        </span>
                        <span className="text-[10px] text-zinc-400">v{appVersion}</span>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
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

            <SettingsSection title="Dados & Nuvem">
                <SettingsItem 
                    icon={Upload} 
                    label="Importar Planilha B3" 
                    description="XLSX do portal do investidor"
                    onClick={() => fileInputRef.current?.click()} 
                />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                
                <div className="border-t border-zinc-100 dark:border-zinc-800">
                    <SettingsItem 
                        icon={RefreshCw} 
                        label="Sincronizar Dados" 
                        description="Forçar atualização da nuvem"
                        onClick={() => onSyncAll(true)} 
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