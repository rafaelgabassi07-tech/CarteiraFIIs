import React, { useState } from 'react';
import { Save, ExternalLink } from 'lucide-react';

interface SettingsProps {
  brapiToken: string;
  onSaveToken: (token: string) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ brapiToken, onSaveToken, onClose }) => {
  const [token, setToken] = useState(brapiToken);

  const handleSave = () => {
    onSaveToken(token);
    onClose();
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto">
      <div className="bg-secondary rounded-xl p-6 border border-white/5 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2">Configurações de API</h3>
          <p className="text-sm text-gray-400">
            Para visualizar cotações em tempo real, você precisa de um token gratuito da Brapi.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-300 uppercase">Brapi Token</label>
          <input 
            type="text" 
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole seu token aqui"
            className="w-full bg-slate-900 text-white rounded-lg p-3 border border-slate-700 focus:border-accent outline-none"
          />
          <a 
            href="https://brapi.dev/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-1"
          >
            Obter token gratuito <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        
        <button 
          onClick={handleSave}
          className="w-full bg-accent text-slate-900 font-bold py-3 rounded-lg hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 mt-4"
        >
          <Save className="w-5 h-5" /> Salvar e Voltar
        </button>
      </div>
    </div>
  );
};