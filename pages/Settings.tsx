import React, { useState, useRef } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
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
    // Reset value
    event.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODAS as suas transações e configurações.\n\nDeseja continuar?")) {
      onResetApp();
    }
  };

  return (
    <div className="pb-28 pt-6 px-4 max-w-lg mx-auto animate-slide-in-right space-y-6">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-xl flex items-center gap-3 shadow-2xl z-[70] transition-all duration-300 transform ${message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'} ${message?.type === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-rose-500 text-white shadow-rose-500/20'}`}>
        {message?.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
        <span className="text-sm font-bold">{message?.text}</span>
      </div>

      {/* API Config */}
      <div className="bg-secondary/40 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2.5">
          <div className="p-2 bg-accent/10 rounded-lg">
             <ExternalLink className="w-5 h-5 text-accent" />
          </div>
          Conexão Brapi
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Token de Acesso</label>
            <div className="relative">
                <input 
                type="text" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole seu token aqui"
                className="w-full bg-slate-950 text-white rounded-xl p-4 border border-white/5 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-mono text-sm"
                />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
              <a 
              href="https://brapi.dev/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-white underline underline-offset-2 transition-colors font-medium"
              >
              Obter token gratuito
              </a>
              <button 
              onClick={handleSaveToken}
              className="bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-white/5"
              >
              <Save className="w-4 h-4" /> Salvar
              </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-secondary/40 backdrop-blur-sm rounded-2xl p-6 border border-white/5 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 rounded-lg">
             <Save className="w-5 h-5 text-purple-400" />
          </div>
          Backup & Dados
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleExport}
            className="flex flex-col items-center justify-center gap-3 bg-slate-950 hover:bg-slate-900 border border-white/5 p-4 rounded-2xl transition-all group active:scale-[0.98]"
          >
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="font-bold text-sm text-slate-200">Exportar</div>
              <div className="text-[10px] text-slate-500 font-medium">Salvar Backup</div>
            </div>
          </button>

          <button 
            onClick={handleImportClick}
            className="flex flex-col items-center justify-center gap-3 bg-slate-950 hover:bg-slate-900 border border-white/5 p-4 rounded-2xl transition-all group active:scale-[0.98]"
          >
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-center">
              <div className="font-bold text-sm text-slate-200">Importar</div>
              <div className="text-[10px] text-slate-500 font-medium">Restaurar JSON</div>
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
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl p-6 border border-rose-500/10 bg-rose-500/5">
        <h3 className="text-lg font-bold text-rose-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Zona de Perigo
        </h3>
        <p className="text-xs text-rose-300/60 mb-5 leading-relaxed">
            Esta ação removerá permanentemente todos os dados armazenados no navegador. Certifique-se de ter um backup.
        </p>
        <button 
          onClick={handleReset}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Resetar Aplicativo
        </button>
      </div>

      <div className="text-center pb-4">
         <span className="text-[10px] font-medium text-slate-600 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
            InvestFIIs v1.2.0 • Build 24
         </span>
      </div>
    </div>
  );
};