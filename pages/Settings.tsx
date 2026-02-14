
import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, ArrowLeft, Bell, Sun, Moon, Monitor, RefreshCw, 
  Palette, Database, ShieldAlert, Info, 
  LogOut, Check, Activity, Terminal, Trash2, FileSpreadsheet, FileJson, 
  Smartphone, Github, Globe, CreditCard, LayoutGrid, Zap, Download, Upload, Server, Wifi, Cloud,
  Calculator, TrendingUp, DollarSign, Calendar, Target, RotateCcw
} from 'lucide-react';
import { Transaction, DividendReceipt, ServiceMetric, LogEntry, ThemeType } from '../types';
import { logger } from '../services/logger';
import { parseB3Excel } from '../services/excelService';
import { supabase } from '../services/supabase';
import { SwipeableModal } from '../components/Layout';

interface SettingsProps {
  user: any;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  dividends: DividendReceipt[];
  onImportDividends: (data: DividendReceipt[]) => void;
  onLogout: () => void;
  onResetApp: () => void;
  theme: ThemeType;
  onSetTheme: (theme: ThemeType) => void;
  accentColor: string;
  onSetAccentColor: (color: string) => void;
  privacyMode: boolean;
  onSetPrivacyMode: (enabled: boolean) => void;
  appVersion: string;
  updateAvailable: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onShowChangelog: () => void;
  pushEnabled: boolean;
  onRequestPushPermission: () => void;
  onSyncAll: (force: boolean) => Promise<void>;
  currentVersionDate: string | null;
  onForceUpdate: () => void; 
  services: ServiceMetric[];
  onCheckConnection: () => Promise<void>;
  isCheckingConnection: boolean;
}

const ACCENT_COLORS = [
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#3b82f6', name: 'Blue' },
  { hex: '#8b5cf6', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f43f5e', name: 'Rose' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#10b981', name: 'Emerald' },
];

const UserProfileCard: React.FC<{ email: string }> = ({ email }) => {
    const initials = email.substring(0, 2).toUpperCase();
    return (
        <div className="bg-zinc-900 text-white p-5 rounded-[2rem] border border-zinc-800 flex items-center gap-4 mb-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/10 transition-colors"></div>
            
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10">
                {initials}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Conta Conectada</p>
                <p className="text-base font-bold text-white truncate">{email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-medium text-zinc-400">Sincronização Ativa</span>
                </div>
            </div>
        </div>
    );
};

const QuickAction = ({ icon: Icon, label, onClick, colorClass, delay, isActive }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white dark:bg-zinc-900 border transition-all shadow-sm press-effect anim-scale-in h-28 w-full ${isActive ? 'border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500' : 'border-zinc-100 dark:border-zinc-800'}`}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass} ${isActive ? 'ring-2 ring-offset-2 ring-indigo-500 ring-offset-white dark:ring-offset-zinc-900' : ''}`}>
            <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <span className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{label}</span>
    </button>
);

const SectionHeader = ({ title }: { title: string }) => (
    <h3 className="px-2 mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-6">{title}</h3>
);

const SettingsRow = ({ icon: Icon, label, value, onClick, isDestructive = false, isLast = false, isLoading = false, subContent }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 press-effect hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDestructive ? 'bg-rose-100 dark:bg-rose-900/20 text-rose-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
                <span className={`text-sm font-bold block ${isDestructive ? 'text-rose-600' : 'text-zinc-700 dark:text-zinc-200'}`}>{label}</span>
                {subContent}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {isLoading ? <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" /> : value && <span className="text-xs font-medium text-zinc-400">{value}</span>}
            <ChevronRight className="w-4 h-4 text-zinc-300" />
        </div>
    </button>
);

// --- CALCULADORAS INTERNAS ---

const CompoundInterestCalc = () => {
    const [initial, setInitial] = useState('');
    const [monthly, setMonthly] = useState('');
    const [rate, setRate] = useState('');
    const [years, setYears] = useState('');
    const [result, setResult] = useState<{ total: number, invested: number, interest: number } | null>(null);

    const calculate = () => {
        const p = parseFloat(initial) || 0;
        const pm = parseFloat(monthly) || 0;
        const r = (parseFloat(rate) || 0) / 100 / 12; // Taxa mensal
        const n = (parseFloat(years) || 0) * 12;

        if (n <= 0) return;

        let futureValue = 0;
        if (r === 0) {
            futureValue = p + (pm * n);
        } else {
            futureValue = (p * Math.pow(1 + r, n)) + (pm * (Math.pow(1 + r, n) - 1)) / r;
        }

        const totalInvested = p + (pm * n);
        setResult({
            total: futureValue,
            invested: totalInvested,
            interest: futureValue - totalInvested
        });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Inicial (R$)</label>
                    <input type="number" value={initial} onChange={e => setInitial(e.target.value)} className="input-field" placeholder="0,00" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Mensal (R$)</label>
                    <input type="number" value={monthly} onChange={e => setMonthly(e.target.value)} className="input-field" placeholder="0,00" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Taxa Anual (%)</label>
                    <input type="number" value={rate} onChange={e => setRate(e.target.value)} className="input-field" placeholder="10" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Anos</label>
                    <input type="number" value={years} onChange={e => setYears(e.target.value)} className="input-field" placeholder="10" />
                </div>
            </div>
            
            <button onClick={calculate} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest press-effect shadow-lg">
                Calcular Futuro
            </button>

            {result && (
                <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 anim-scale-in">
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest text-center mb-2">Resultado Estimado</p>
                    <div className="text-center mb-4">
                        <span className="text-3xl font-black text-zinc-900 dark:text-white">
                            {result.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-zinc-500 px-2">
                        <span>Investido: {result.invested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        <span className="text-emerald-500">Juros: {result.interest.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const CeilingPriceCalc = () => {
    const [dividend, setDividend] = useState('');
    const [yieldTarget, setYieldTarget] = useState('');
    const [result, setResult] = useState<number | null>(null);

    const calculate = () => {
        const d = parseFloat(dividend) || 0;
        const y = parseFloat(yieldTarget) || 0;
        if (y > 0) setResult((d / y) * 100);
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
                Descubra o preço máximo a pagar por uma ação ou FII para garantir um retorno (Yield) mínimo desejado.
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Div. Projetado (Anual)</label>
                    <input type="number" value={dividend} onChange={e => setDividend(e.target.value)} className="input-field" placeholder="R$ 1,20" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Yield Desejado (%)</label>
                    <input type="number" value={yieldTarget} onChange={e => setYieldTarget(e.target.value)} className="input-field" placeholder="6" />
                </div>
            </div>
            
            <button onClick={calculate} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest press-effect shadow-lg">
                Calcular Teto
            </button>

            {result !== null && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 anim-scale-in text-center">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-widest mb-1">Preço Teto</p>
                    <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                        {result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            )}
        </div>
    );
};

const FireCalc = () => {
    const [monthlyIncome, setMonthlyIncome] = useState('');
    const [yieldRate, setYieldRate] = useState(''); // Taxa de retirada segura ou yield da carteira
    const [patrimony, setPatrimony] = useState<number | null>(null);

    const calculate = () => {
        const income = parseFloat(monthlyIncome) || 0;
        const rate = parseFloat(yieldRate) || 0;
        if (rate > 0) {
            // Renda Anual / Taxa Decimal
            const anualIncome = income * 12;
            setPatrimony(anualIncome / (rate / 100));
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-xs text-zinc-500 leading-relaxed">
                Estime o patrimônio necessário para viver de renda passiva (Independência Financeira).
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Renda Mensal (R$)</label>
                    <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} className="input-field" placeholder="5.000" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">Yield Anual (%)</label>
                    <input type="number" value={yieldRate} onChange={e => setYieldRate(e.target.value)} className="input-field" placeholder="8" />
                </div>
            </div>
            
            <button onClick={calculate} className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs uppercase tracking-widest press-effect shadow-lg">
                Calcular Meta
            </button>

            {patrimony !== null && (
                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 anim-scale-in text-center">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-widest mb-1">Patrimônio Necessário</p>
                    <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400 break-all">
                        {patrimony.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            )}
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = ({ 
  user, onLogout, transactions, onImportTransactions, dividends, 
  onImportDividends, onResetApp, theme, onSetTheme, privacyMode, 
  onSetPrivacyMode, appVersion, updateAvailable, onCheckUpdates, 
  onShowChangelog, pushEnabled, onRequestPushPermission,
  onSyncAll, currentVersionDate, accentColor, onSetAccentColor,
  services, onCheckConnection, isCheckingConnection
}) => {
  const [activeSection, setActiveSection] = useState<'menu' | 'appearance' | 'data' | 'about' | 'calculators'>('menu');
  const [activeCalculator, setActiveCalculator] = useState<'compound' | 'ceiling' | 'fire' | null>(null);
  
  const [toast, setToast] = useState<{type: 'success' | 'error' | 'info', text: string} | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const unsubscribe = logger.subscribe((l: LogEntry[]) => setLogs([...l])); 
      return unsubscribe;
  }, []);
  
  useEffect(() => {
      if (showLogs && logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs, showLogs]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsImporting(true);
      try {
          const { transactions: newTxs, dividends: newDivs } = await parseB3Excel(file);
          
          if (newTxs.length === 0 && newDivs.length === 0) {
              showToast('error', 'Nenhum dado válido identificado.');
          } else {
              const existingSig = new Set(transactions.map(t => `${t.ticker}-${t.date}-${t.type}`));
              const txsToAdd = newTxs.filter(t => !existingSig.has(`${t.ticker}-${t.date}-${t.type}`));
              
              if (txsToAdd.length > 0 && user?.id) {
                  const dbPayload = txsToAdd.map(t => ({
                      ticker: t.ticker, type: t.type, quantity: t.quantity, price: t.price, date: t.date, asset_type: t.assetType, user_id: user.id
                  }));
                  await supabase.from('transactions').insert(dbPayload);
                  onImportTransactions([...transactions, ...txsToAdd]);
              }

              if (newDivs.length > 0) {
                  onImportDividends([...dividends, ...newDivs]);
              }

              showToast('success', `Importado: ${txsToAdd.length} ordens.`);
              setActiveSection('menu');
          }
      } catch (error) {
          console.error(error);
          showToast('error', 'Erro ao ler arquivo.');
      } finally {
          setIsImporting(false);
          if (excelInputRef.current) excelInputRef.current.value = '';
      }
  };

  const handleExport = () => {
    const data = { transactions, dividends, exportedAt: new Date().toISOString(), version: appVersion };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `investfiis_backup.json`;
    a.click();
    showToast('success', 'Backup exportado!');
  };

  return (
    <div className="space-y-4">
        {activeSection !== 'menu' && (
            <div className="flex items-center gap-3 mb-2 anim-slide-in-right sticky top-0 bg-primary-light dark:bg-primary-dark z-20 py-2">
              <button onClick={() => {
                  if (activeCalculator) setActiveCalculator(null);
                  else setActiveSection('menu');
              }} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-white shadow-sm press-effect transition-transform">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none mb-0.5">
                  {activeSection === 'appearance' && 'Personalização'}
                  {activeSection === 'data' && 'Gerenciar Dados'}
                  {activeSection === 'about' && 'Sobre o App'}
                  {activeSection === 'calculators' && (activeCalculator ? (
                      activeCalculator === 'compound' ? 'Juros Compostos' : 
                      activeCalculator === 'ceiling' ? 'Preço Teto' : 'Indep. Financeira'
                  ) : 'Simuladores')}
                </h2>
              </div>
            </div>
        )}

        <div className="pb-10">
            {activeSection === 'menu' && (
                <div className="anim-fade-in">
                    {user && <UserProfileCard email={user.email} />}

                    {/* Quick Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <QuickAction 
                            icon={Palette} 
                            label="Aparência" 
                            colorClass="bg-purple-100 dark:bg-purple-900/20 text-purple-600" 
                            onClick={() => setActiveSection('appearance')}
                            delay={0}
                        />
                        <QuickAction 
                            icon={Database} 
                            label="Dados & B3" 
                            colorClass="bg-blue-100 dark:bg-blue-900/20 text-blue-600" 
                            onClick={() => setActiveSection('data')}
                            delay={50}
                        />
                        {/* Botão de Calculadoras substitui Privacidade */}
                        <QuickAction 
                            icon={Calculator} 
                            label="Calculadoras"
                            colorClass="bg-amber-100 dark:bg-amber-900/20 text-amber-600"
                            onClick={() => setActiveSection('calculators')}
                            delay={100}
                        />
                        <QuickAction 
                            icon={Bell} 
                            label={pushEnabled ? "Notificações" : "Silencioso"}
                            colorClass={pushEnabled ? "bg-sky-100 dark:bg-sky-900/20 text-sky-600" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}
                            onClick={onRequestPushPermission}
                            isActive={pushEnabled}
                            delay={150}
                        />
                    </div>

                    <SectionHeader title="Sistema" />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm mb-6">
                        <SettingsRow 
                            icon={Wifi} 
                            label="Conexão com Servidor" 
                            onClick={onCheckConnection} 
                            isLoading={isCheckingConnection}
                            value={isCheckingConnection ? 'Testando...' : 'Verificar'}
                            subContent={
                                <div className="flex gap-1.5 mt-1">
                                    {services.map((s, i) => (
                                        <div key={s.id} className={`w-2 h-2 rounded-full ${s.status === 'operational' ? 'bg-emerald-500' : s.status === 'error' ? 'bg-rose-500' : s.status === 'degraded' ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`} title={s.label}></div>
                                    ))}
                                    <span className="text-[9px] text-zinc-400 ml-1">
                                        {services.filter(s => s.status === 'operational').length}/{services.length} Online
                                    </span>
                                </div>
                            }
                        />
                        <SettingsRow icon={Terminal} label="Logs de Diagnóstico" onClick={() => setShowLogs(true)} />
                        <SettingsRow icon={Info} label="Sobre & Versão" onClick={() => setActiveSection('about')} value={`v${appVersion}`} isLast />
                    </div>

                    <SectionHeader title="Zona de Perigo" />
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <SettingsRow icon={LogOut} label="Desconectar Conta" onClick={onLogout} isDestructive />
                        <SettingsRow icon={Trash2} label="Resetar Aplicativo" onClick={onResetApp} isDestructive isLast />
                    </div>
                    
                    <p className="text-center text-[10px] text-zinc-400 font-mono mt-8">Build: {currentVersionDate || 'Dev'}</p>
                </div>
            )}

            {/* SEÇÃO DE CALCULADORAS */}
            {activeSection === 'calculators' && (
                <div className="space-y-4 anim-slide-up">
                    {!activeCalculator ? (
                        <div className="grid gap-3">
                            <button onClick={() => setActiveCalculator('compound')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Juros Compostos</h3>
                                    <p className="text-xs text-zinc-500">Simule o crescimento do seu patrimônio a longo prazo.</p>
                                </div>
                            </button>

                            <button onClick={() => setActiveCalculator('ceiling')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Target className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Preço Teto</h3>
                                    <p className="text-xs text-zinc-500">Calcule o preço máximo baseado no Yield esperado.</p>
                                </div>
                            </button>

                            <button onClick={() => setActiveCalculator('fire')} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm press-effect text-left flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white">Independência Financeira</h3>
                                    <p className="text-xs text-zinc-500">Quanto você precisa acumular para viver de renda?</p>
                                </div>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-xl anim-fade-in">
                            {activeCalculator === 'compound' && <CompoundInterestCalc />}
                            {activeCalculator === 'ceiling' && <CeilingPriceCalc />}
                            {activeCalculator === 'fire' && <FireCalc />}
                        </div>
                    )}
                </div>
            )}

            {activeSection === 'appearance' && (
                <div className="space-y-6 anim-slide-up">
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Tema</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }, { id: 'system', icon: Monitor, label: 'Auto' }].map(m => (
                                <button key={m.id} onClick={() => onSetTheme(m.id as ThemeType)} className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 press-effect ${theme === m.id ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent shadow-xl' : 'bg-zinc-50 dark:bg-zinc-800 border-transparent text-zinc-400'}`}>
                                    <m.icon className="w-6 h-6 mb-2" strokeWidth={2} />
                                    <span className="text-[10px] font-bold uppercase">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Cor de Destaque</h3>
                        <div className="flex justify-between items-center px-2">
                            {ACCENT_COLORS.map((c) => (
                                <button key={c.hex} onClick={() => onSetAccentColor(c.hex)} className={`w-8 h-8 rounded-full transition-all duration-300 flex items-center justify-center ${accentColor === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900 shadow-lg' : 'hover:scale-110 opacity-60'}`} style={{ backgroundColor: c.hex, ['--tw-ring-color' as any]: c.hex }}>
                                    {accentColor === c.hex && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'data' && (
                <div className="space-y-4 anim-slide-up">
                    <div className="bg-gradient-to-br from-zinc-800 to-black p-6 rounded-[2rem] text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 backdrop-blur-md">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Importar B3</h3>
                            <p className="text-sm text-zinc-400 mb-6">Traga suas ordens e proventos via planilha Excel oficial.</p>
                            
                            <button onClick={() => excelInputRef.current?.click()} disabled={isImporting} className="w-full py-3.5 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg press-effect flex items-center justify-center gap-2">
                                {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isImporting ? 'Processando...' : 'Selecionar Arquivo'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExport} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <Download className="w-6 h-6 text-blue-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Backup JSON</span>
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 press-effect flex flex-col items-center justify-center gap-2">
                            <FileJson className="w-6 h-6 text-amber-500" />
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Restaurar JSON</span>
                        </button>
                    </div>

                    <div className="p-1">
                        <button onClick={onResetApp} className="w-full flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 press-effect group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">Limpar Cache Local</p>
                                    <p className="text-[10px] text-rose-500/70">Força recarregamento total.</p>
                                </div>
                            </div>
                            <Trash2 className="w-5 h-5 text-rose-400" />
                        </button>
                    </div>

                    <input type="file" ref={fileInputRef} onChange={() => {}} accept=".json" className="hidden" onClick={(e) => (e.target as any).value = null} />
                    <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" onClick={(e) => (e.target as any).value = null} />
                </div>
            )}

            {activeSection === 'about' && (
                <div className="space-y-6 anim-slide-up text-center pt-8">
                    <div className="w-24 h-24 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-[2rem] flex items-center justify-center shadow-inner mb-4">
                        <Smartphone className="w-12 h-12 text-zinc-400" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">InvestFIIs</h2>
                        <p className="text-sm text-zinc-500 font-medium">Gestão Inteligente de Ativos</p>
                    </div>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 tracking-wider">v{appVersion}</span>
                    </div>

                    <div className="flex justify-center gap-4 mt-4">
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Github className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 press-effect">
                            <Globe className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Modal Logs */}
        <SwipeableModal isOpen={showLogs} onClose={() => setShowLogs(false)}>
            <div className="p-0 h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]">
                <div className="flex items-center justify-between p-4 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-zinc-400" />
                        <h2 className="text-sm font-bold text-white tracking-wide font-mono">Console</h2>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => { logger.clear(); setLogs([]); }} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Trash2 className="w-4 h-4" />
                         </button>
                         <button onClick={() => setShowLogs(false)} className="p-2 rounded hover:bg-[#21262d] text-zinc-400 hover:text-white transition-colors">
                            <Check className="w-4 h-4" />
                         </button>
                    </div>
                </div>
                <div className="flex-1 p-2 font-mono text-[11px] overflow-y-auto overflow-x-hidden">
                    {logs.slice().reverse().map((log) => (
                        <div key={log.id} className={`mb-1 p-1.5 rounded border-l-2 ${log.level === 'error' ? 'border-red-500 bg-red-900/20' : 'border-zinc-700'}`}>
                            <span className="text-zinc-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <pre className="whitespace-pre-wrap mt-1">{log.message}</pre>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </SwipeableModal>
    </div>
  );
};
