
import React, { useState, useRef } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight } from 'lucide-react';
import { Transaction } from '../types';

interface SettingsProps {
  brapiToken: string;
  onSaveToken: (token: string) => void;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  onResetApp: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, 
  onSaveToken, 
  transactions, 
  onImportTransactions,
  onResetApp 
}) => {
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveToken = () => {
    onSaveToken(token);
    showMessage('success', 'Token salvo com sucesso!');
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `investfiis_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('success', 'Backup exportado com sucesso!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (Array.isArray(json)) {
          onImportTransactions(json);
          showMessage('success', `${json.length} transações importadas!`);
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) {
        showMessage('error', 'Arquivo inválido. Use um backup JSON.');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODAS as suas transações e configurações.\n\nDeseja continuar?")) {
      onResetApp();
    }
  };

  return (
    <div className="pb-28 pt-6 px-4 max-w-2xl mx-auto space-y-8 animate-fade-in">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[70] transition-all duration-300 transform backdrop-blur-md ring-1 ring-white/10 ${message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'} ${message?.type === 'success' ? 'bg-emerald-500/90 text-white shadow-emerald-500/20' : 'bg-rose-500/90 text-white shadow-rose-500/20'}`}>
        {message?.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
        <span className="text-sm font-bold">{message?.text}</span>
      </div>

      {/* --- SEÇÃO 1: INTEGRAÇÕES --- */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-2 px-1">
          <Globe className="w-4 h-4 text-accent" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fonte de Dados</h2>
        </div>
        
        <div className="bg-secondary/40 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-lg font-bold text-white mb-1">API Brapi</h3>
            <p className="text-sm text-slate-400 leading-relaxed">Conecte-se para obter cotações e dividendos em tempo real.</p>
          </div>
          
          <div className="p-5 bg-slate-950/30 space-y-4">
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Token de Acesso</label>
                <div className="relative group">
                    <input 
                    type="text" 
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Cole seu token aqui"
                    className="w-full bg-slate-900 text-white rounded-xl py-3 px-4 border border-white/10 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-mono text-sm shadow-inner group-hover:border-white/20"
                    />
                    {token && <div className="absolute right-3 top-3 text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>}
                </div>
             </div>
             
             <div className="flex justify-between items-center pt-2">
                <a 
                href="https://brapi.dev/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-accent hover:text-white transition-colors font-medium group"
                >
                Obter token gratuito <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <button 
                onClick={handleSaveToken}
                className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-white/5"
                >
                <Save className="w-4 h-4" /> Salvar
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO 2: DADOS --- */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-2 px-1">
          <Database className="w-4 h-4 text-purple-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gerenciamento</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Exportar */}
            <button 
                onClick={handleExport}
                className="bg-secondary/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 hover:bg-secondary/60 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Download className="w-16 h-16 text-blue-400" />
                </div>
                <div className="p-2 bg-blue-500/10 w-fit rounded-xl text-blue-400 mb-3 group-hover:bg-blue-500/20 transition-colors">
                    <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Backup</h3>
                <p className="text-xs text-slate-400 font-medium">Exportar dados JSON</p>
                <div className="mt-4 flex items-center text-[10px] text-blue-400 font-bold uppercase tracking-wide gap-1">
                   Fazer Download <ChevronRight className="w-3 h-3" />
                </div>
            </button>

            {/* Importar */}
            <button 
                onClick={handleImportClick}
                className="bg-secondary/40 backdrop-blur-md rounded-3xl p-5 border border-white/5 hover:bg-secondary/60 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Upload className="w-16 h-16 text-emerald-400" />
                </div>
                <div className="p-2 bg-emerald-500/10 w-fit rounded-xl text-emerald-400 mb-3 group-hover:bg-emerald-500/20 transition-colors">
                    <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Restaurar</h3>
                <p className="text-xs text-slate-400 font-medium">Importar dados JSON</p>
                 <div className="mt-4 flex items-center text-[10px] text-emerald-400 font-bold uppercase tracking-wide gap-1">
                   Selecionar Arquivo <ChevronRight className="w-3 h-3" />
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden" 
                />
            </button>
        </div>
      </section>

      {/* --- SEÇÃO 3: ZONA DE PERIGO --- */}
      <section className="space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 px-1">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sistema</h2>
        </div>
        
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50"></div>
            <div>
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    Resetar Aplicativo
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                    Remove todos os dados, transações e configurações locais permanentemente.
                </p>
            </div>
            <button 
                onClick={handleReset}
                className="whitespace-nowrap bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold py-2.5 px-5 rounded-xl transition-all active:scale-[0.98] flex items-center gap-2 hover:shadow-lg hover:shadow-rose-500/5 text-xs"
            >
                <Trash2 className="w-4 h-4" /> Apagar Tudo
            </button>
        </div>
      </section>

      {/* Rodapé */}
      <div className="text-center pt-8 pb-4 animate-fade-in opacity-50 hover:opacity-100 transition-opacity">
         <span className="text-[10px] font-mono text-slate-600">
            InvestFIIs v1.3.4
         </span>
      </div>
    </div>
  );
};
