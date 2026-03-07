import React, { useState, useRef } from 'react';
import { 
    User, Mail, Activity, Zap, LogOut, Palette, Moon, Sun, Check, 
    Shield, Bell, Database, FileSpreadsheet, FileJson, RefreshCw, 
    Smartphone, Download, History, LifeBuoy, Info, AlertTriangle, 
    Trash2, ChevronRight, Loader2, ExternalLink, Sliders
} from 'lucide-react';
import { ConfirmationModal } from '../components/Layout';
import { Transaction, DividendReceipt, ThemeType, ServiceMetric } from '../types';
import { parseB3Excel } from '../services/excelService';

const ACCENT_COLORS = [
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Violet', hex: '#8b5cf6' },
];

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <div 
        onClick={(e) => { e.stopPropagation(); onChange(); }}
        className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${checked ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
    >
        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
);

interface SettingsProps {
    onLogout: () => Promise<void>;
    user: any;
    transactions: Transaction[];
    onImportTransactions: (txs: Transaction[]) => void;
    dividends: DividendReceipt[];
    onImportDividends: (divs: DividendReceipt[]) => void;
    onResetApp: () => void;
    theme: ThemeType;
    onSetTheme: (theme: ThemeType) => void;
    accentColor: string;
    onSetAccentColor: (color: string) => void;
    privacyMode: boolean;
    onSetPrivacyMode: (mode: boolean) => void;
    appVersion: string;
    updateAvailable: boolean;
    onCheckUpdates: () => void;
    onShowChangelog: () => void;
    pushEnabled: boolean;
    onRequestPushPermission: () => void;
    onSyncAll: (silent?: boolean) => Promise<void>;
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
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const { transactions: txs, dividends: divs } = await parseB3Excel(file);
            if (txs.length > 0) onImportTransactions(txs);
            if (divs.length > 0) onImportDividends(divs);
            
            alert(`Importação concluída!\n\n${txs.length} transações\n${divs.length} proventos`);
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
        <div className="pb-32 anim-fade-in px-4 max-w-5xl mx-auto">
            
            {/* Header Section */}
            <div className="pt-8 pb-12">
                <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter mb-2">Configurações</h1>
                <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Gerencie sua conta e preferências</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Profile & Quick Actions */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative overflow-hidden rounded-[2.5rem] bg-zinc-900 dark:bg-white p-8 shadow-2xl group border border-zinc-800 dark:border-zinc-100">
                        {/* Background Effects */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 dark:bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none"></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-white/10 dark:bg-black/5 backdrop-blur-xl flex items-center justify-center text-white dark:text-zinc-900 border border-white/20 dark:border-black/10 shadow-inner">
                                    <User className="w-12 h-12" strokeWidth={1.5} />
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full border-4 border-zinc-900 dark:border-white shadow-lg">
                                    PRO
                                </div>
                            </div>
                            
                            <h2 className="text-2xl font-black text-white dark:text-zinc-900 tracking-tighter mb-1">
                                {user?.email?.split('@')[0] || 'Investidor'}
                            </h2>
                            <p className="text-xs text-white/40 dark:text-zinc-400 font-bold mb-8">
                                {user?.email}
                            </p>
                            
                            <div className="w-full space-y-3">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 dark:bg-zinc-50 border border-white/10 dark:border-zinc-200">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
                                        <span className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-wider">Atividade</span>
                                    </div>
                                    <span className="text-xs font-black text-white dark:text-zinc-900">{transactions.length} TXs</span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 dark:bg-zinc-50 border border-white/10 dark:border-zinc-200">
                                    <div className="flex items-center gap-3">
                                        <Zap className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                                        <span className="text-[10px] font-black text-white/60 dark:text-zinc-500 uppercase tracking-wider">Nível</span>
                                    </div>
                                    <span className="text-xs font-black text-white dark:text-zinc-900">{Math.floor(transactions.length / 10) + 1}</span>
                                </div>
                            </div>

                            <button 
                                onClick={onLogout}
                                className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                Sair da Conta
                            </button>
                        </div>
                    </div>

                    {/* Support Card */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <h3 className="text-xl font-black tracking-tight mb-2 relative z-10">Precisa de Ajuda?</h3>
                        <p className="text-xs font-bold text-indigo-100/70 mb-6 relative z-10 leading-relaxed">Nosso suporte está pronto para te ajudar com qualquer dúvida ou problema.</p>
                        <button 
                            onClick={() => window.open('mailto:suporte@investfiis.com.br')}
                            className="w-full py-4 rounded-2xl bg-white text-indigo-600 font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-indigo-50 transition-colors relative z-10"
                        >
                            Contatar Suporte
                        </button>
                    </div>
                </div>

                {/* Right Column: Settings Grid */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Appearance Section */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Palette className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Personalização</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">Tema</span>
                                    <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
                                        {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                    </div>
                                </div>
                                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                                    {(['light', 'system', 'dark'] as ThemeType[]).map((t) => (
                                        <button 
                                            key={t}
                                            onClick={() => onSetTheme(t)}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all 
                                                ${theme === t 
                                                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' 
                                                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                                        >
                                            {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Auto'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                                <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest block mb-6">Cor de Destaque</span>
                                <div className="flex flex-wrap gap-3">
                                    {ACCENT_COLORS.map(c => (
                                        <button
                                            key={c.hex}
                                            onClick={() => onSetAccentColor(c.hex)}
                                            className={`w-10 h-10 rounded-2xl border-4 transition-all flex items-center justify-center shadow-sm
                                                ${accentColor === c.hex ? 'border-zinc-200 dark:border-zinc-700 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c.hex }}
                                        >
                                            {accentColor === c.hex && <Check className="w-5 h-5 text-white" strokeWidth={4} />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Security & Privacy */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Segurança</h3>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm divide-y divide-zinc-50 dark:divide-zinc-800">
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Modo Privacidade</h4>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Ocultar valores na interface</p>
                                </div>
                                <ToggleSwitch checked={privacyMode} onChange={() => onSetPrivacyMode(!privacyMode)} />
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Notificações Push</h4>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Alertas de proventos e metas</p>
                                </div>
                                <ToggleSwitch checked={pushEnabled} onChange={onRequestPushPermission} />
                            </div>
                        </div>
                    </section>

                    {/* Data Management */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Database className="w-5 h-5 text-amber-500" />
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Gerenciamento de Dados</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isImporting}
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm text-left group hover:border-indigo-500 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    {isImporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileSpreadsheet className="w-6 h-6" />}
                                </div>
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Importar B3</h4>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Planilha XLSX</p>
                                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".xlsx,.xls" className="hidden" />
                            </button>

                            <button 
                                onClick={handleExport}
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm text-left group hover:border-emerald-500 transition-all"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <FileJson className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Exportar JSON</h4>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Backup Completo</p>
                            </button>

                            <button 
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm text-left group hover:border-amber-500 transition-all md:col-span-2 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">Sincronizar Agora</h4>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Forçar atualização remota</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </section>

                    {/* System Info */}
                    <section>
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <Activity className="w-5 h-5 text-zinc-400" />
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Sistema</h3>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] p-8 border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 flex items-center justify-center shadow-sm">
                                        <Smartphone className="w-6 h-6 text-zinc-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">InvestFIIs App</h4>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Versão {appVersion}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={onForceUpdate}
                                    className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-300 shadow-sm hover:bg-zinc-100 transition-colors"
                                >
                                    Verificar Updates
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {services.map(s => (
                                    <div key={s.id} className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-tighter">{s.label}</span>
                                        </div>
                                        <p className="text-xs font-black text-zinc-900 dark:text-white">{s.latency ? `${s.latency}ms` : '---'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="pt-8">
                        <button 
                            onClick={() => setConfirmReset(true)}
                            className="w-full p-8 rounded-[2.5rem] bg-rose-500/5 border border-rose-500/20 flex items-center justify-between group hover:bg-rose-500 transition-all duration-500"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:bg-white group-hover:text-rose-500 transition-colors">
                                    <Trash2 className="w-7 h-7" />
                                </div>
                                <div className="text-left">
                                    <h4 className="text-lg font-black text-rose-600 group-hover:text-white tracking-tight transition-colors">Resetar Aplicativo</h4>
                                    <p className="text-xs font-bold text-rose-500/60 group-hover:text-white/60 uppercase tracking-widest mt-1 transition-colors">Apagar todos os dados locais</p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-rose-300 group-hover:text-white transition-all group-hover:translate-x-2" />
                        </button>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-16 pb-8">
                <p className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.5em]">
                    InvestFIIs &bull; {new Date().getFullYear()}
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
