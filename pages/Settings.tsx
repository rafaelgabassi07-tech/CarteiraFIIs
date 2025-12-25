import React, { useState, useRef } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
          showMessage('success', 'Dados importados com sucesso!');
        } else {
          throw new Error("Formato inválido");
        }
      } catch (error) {
        showMessage('error', 'Erro ao ler arquivo. Certifique-se que é um JSON válido.');
      }
    };
    reader.readAsText(file);
    // Reset value so same file can be selected again
    event.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODAS as suas transações e configurações. Esta ação não pode ser desfeita. Deseja continuar?")) {
      onResetApp();
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto animate-in slide-in-from-right duration-300">
      
      {message && (
        <div className={`fixed top-20 left-4 right-4 p-4 rounded-xl flex items-center gap-3 shadow-2xl z-50 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="space-y-6">
        
        {/* API Config */}
        <div className="bg-secondary rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-accent" /> API Brapi
          </h3>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-gray-300 uppercase">Token de Acesso</label>
            <input 
              type="text" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole seu token aqui"
              className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 focus:border-accent outline-none transition-colors"
            />
            <div className="flex justify-between items-center">
                <a 
                href="https://brapi.dev/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-accent hover:text-accent/80 underline"
                >
                Obter token gratuito
                </a>
                <button 
                onClick={handleSaveToken}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                <Save className="w-4 h-4" /> Salvar
                </button>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-secondary rounded-xl p-6 border border-white/5">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-accent" /> Dados
          </h3>
          
          <div className="space-y-3">
            <button 
              onClick={handleExport}
              className="w-full bg-slate-900 hover:bg-slate-800 text-gray-200 border border-slate-700 p-4 rounded-xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:text-blue-300">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Exportar Backup</div>
                  <div className="text-xs text-gray-500">Salvar JSON localmente</div>
                </div>
              </div>
            </button>

            <button 
              onClick={handleImportClick}
              className="w-full bg-slate-900 hover:bg-slate-800 text-gray-200 border border-slate-700 p-4 rounded-xl flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 group-hover:text-emerald-300">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">Importar Backup</div>
                  <div className="text-xs text-gray-500">Restaurar arquivo JSON</div>
                </div>
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
        <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
          <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Zona de Perigo
          </h3>
          <p className="text-xs text-red-300/70 mb-4">
            Ações aqui não podem ser desfeitas. Tenha cuidado.
          </p>
          <button 
            onClick={handleReset}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" /> Resetar Todo o App
          </button>
        </div>

        <div className="text-center text-xs text-gray-600 pt-4">
            InvestFIIs v1.1.0
        </div>
      </div>
    </div>
  );
};