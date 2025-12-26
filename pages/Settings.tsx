
import React, { useState, useRef, useEffect } from 'react';
import { Save, ExternalLink, Download, Upload, Trash2, AlertTriangle, CheckCircle2, Globe, Database, ShieldAlert, ChevronRight, ArrowLeft, Key, HardDrive, Cpu, Smartphone, Bell, ToggleLeft, ToggleRight, Lock, Eraser } from 'lucide-react';
import { Transaction } from '../types';

interface SettingsProps {
  brapiToken: string;
  onSaveToken: (token: string) => void;
  transactions: Transaction[];
  onImportTransactions: (data: Transaction[]) => void;
  onResetApp: () => void;
}

type SettingsSection = 'menu' | 'integrations' | 'data' | 'system' | 'notifications';

interface NotificationPrefs {
  payments: boolean;
  datacom: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ 
  brapiToken, 
  onSaveToken, 
  transactions, 
  onImportTransactions,
  onResetApp 
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('menu');
  const [token, setToken] = useState(brapiToken);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado de Preferências de Notificação
  const [notifyPrefs, setNotifyPrefs] = useState<NotificationPrefs>(() => {
    const saved = localStorage.getItem('investfiis_prefs_notifications');
    return saved ? JSON.parse(saved) : { payments: true, datacom: true };
  });

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    localStorage.setItem('investfiis_prefs_notifications', JSON.stringify(notifyPrefs));
  }, [notifyPrefs]);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showMessage('error', 'Navegador não suporta notificações.');
      return;
    }
    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      new Notification("InvestFIIs", { body: "Notificações ativadas com sucesso!", icon: "/manifest-icon-192.maskable.png" });
      showMessage('success', 'Permissão concedida!');
    } else if (permission === 'denied') {
      showMessage('error', 'Permissão negada. Ative nas configurações do navegador.');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveToken = () => {
    onSaveToken(token);
    showMessage('success', 'Token salvo com sucesso!');
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

  const handleClearCache = async () => {
    if (window.confirm("Isso limpará cotações, dividendos e imagens cacheadas para corrigir erros de visualização.\n\nSua carteira e configurações NÃO serão apagadas.\n\nO aplicativo será recarregado.")) {
        try {
            // 1. Limpa dados voláteis do LocalStorage
            localStorage.removeItem('investfiis_quotes_simple_cache');
            localStorage.removeItem('investfiis_gemini_dividends_cache');
            localStorage.removeItem('investfiis_last_gemini_sync');
            
            // 2. Limpa Cache Storage (Service Worker API Cache)
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            }
            
            // 3. Opcional: Desregistra SW para forçar update imediato
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for(let registration of registrations) {
                    await registration.unregister();
                }
            }
            
            alert('Cache limpo com sucesso! Recarregando...');
            window.location.reload();
        } catch (e) {
            alert('Erro ao limpar cache. Tente reiniciar o navegador.');
        }
    }
  };

  const handleReset = () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODAS as suas transações e configurações permanentemente.\n\nDeseja continuar?")) {
      onResetApp();
    }
  };

  const MenuButton = ({ icon: Icon, label, description, onClick, colorClass = "text-slate-400" }: any) => (
    <button 
      onClick={onClick}
      className="w-full bg-secondary/40 backdrop-blur-md rounded-3xl p-5 border border-white/10 hover:bg-secondary/60 transition-all flex items-center justify-between group active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${colorClass} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h3 className="text-base font-bold text-white mb-0.5">{label}</h3>
          <p className="text-xs text-slate-500 font-medium">{description}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
    </button>
  );

  const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) => (
    <div onClick={onChange} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/10 cursor-pointer active:scale-[0.99] transition-transform">
        <span className="text-xs font-bold text-slate-300">{label}</span>
        <div className={`transition-colors duration-300 ${checked ? 'text-emerald-400' : 'text-slate-600'}`}>
            {checked ? <ToggleRight className="w-8 h-8 fill-emerald-500/20" /> : <ToggleLeft className="w-8 h-8" />}
        </div>
    </div>
  );

  return (
    <div className="pb-28 pt-2 px-4 max-w-2xl mx-auto space-y-6 animate-fade-in min-h-[60vh]">
      
      {/* Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-2xl flex items-center gap-3 shadow-2xl z-[70] transition-all duration-300 transform backdrop-blur-md ring-1 ring-white/10 ${message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'} ${message?.type === 'success' ? 'bg-emerald-500/90 text-white shadow-emerald-500/20' : 'bg-rose-500/90 text-white shadow-rose-500/20'}`}>
        {message?.type === 'success' ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <AlertTriangle className="w-6 h-6 shrink-0" />}
        <span className="text-sm font-bold">{message?.text}</span>
      </div>

      {activeSection === 'menu' && (
        <div className="space-y-4 animate-slide-up">
           <div className="px-2 mb-2">
              <h2 className="text-xl font-black text-white">Ajustes</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Geral</p>
           </div>
           
           <MenuButton 
             icon={Globe} 
             label="Conexões e APIs" 
             description="Gerencie chaves da Brapi e Google" 
             colorClass="text-accent"
             onClick={() => setActiveSection('integrations')} 
           />

           <MenuButton 
             icon={Bell} 
             label="Notificações" 
             description="Alertas de proventos e datas" 
             colorClass="text-yellow-400"
             onClick={() => setActiveSection('notifications')} 
           />
           
           <MenuButton 
             icon={HardDrive} 
             label="Dados e Backup" 
             description="Importar e exportar sua carteira" 
             colorClass="text-purple-400"
             onClick={() => setActiveSection('data')} 
           />
           
           <MenuButton 
             icon={Cpu} 
             label="Sistema" 
             description="Limpeza de cache e reset" 
             colorClass="text-rose-400"
             onClick={() => setActiveSection('system')} 
           />

           <div className="pt-8 text-center opacity-40">
              <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <span className="text-[10px] font-mono text-slate-500">
                InvestFIIs v1.9.0
              </span>
           </div>
        </div>
      )}

      {activeSection !== 'menu' && (
        <div className="animate-fade-in">
          <button 
            onClick={() => setActiveSection('menu')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 font-bold text-sm px-1 py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-400">
                        <Bell className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white">Notificações</h2>
                        <p className="text-xs text-slate-500">Gerencie seus alertas</p>
                    </div>
                </div>

                <div className="bg-secondary/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-0.5">Permissão do Navegador</h3>
                            <p className="text-[10px] text-slate-400">Status atual do sistema</p>
                        </div>
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            permissionStatus === 'granted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            permissionStatus === 'denied' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                            {permissionStatus === 'granted' ? 'Permitido' : permissionStatus === 'denied' ? 'Bloqueado' : 'Padrão'}
                        </div>
                    </div>
                    <div className="p-5 bg-slate-950/30">
                        {permissionStatus !== 'granted' ? (
                            <button 
                                onClick={requestNotificationPermission}
                                className="w-full bg-accent text-primary font-black text-xs uppercase tracking-widest py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all"
                            >
                                Solicitar Permissão
                            </button>
                        ) : (
                             <p className="text-xs text-slate-500 text-center">O app tem permissão para enviar alertas.</p>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Tipos de Alerta</h3>
                    <Toggle 
                        label="Pagamentos de Proventos" 
                        checked={notifyPrefs.payments} 
                        onChange={() => setNotifyPrefs(p => ({ ...p, payments: !p.payments }))} 
                    />
                    <Toggle 
                        label="Alertas de Data Com (Corte)" 
                        checked={notifyPrefs.datacom} 
                        onChange={() => setNotifyPrefs(p => ({ ...p, datacom: !p.datacom }))} 
                    />
                </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent">
                   <Key className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-lg font-black text-white">Integrações</h2>
                   <p className="text-xs text-slate-500">Configure suas chaves de API</p>
                </div>
              </div>

              <div className="bg-secondary/40 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                <div className="p-5 border-b border-white/10">
                  <h3 className="text-base font-bold text-white mb-1">API Brapi</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">Necessário para obter cotações em tempo real.</p>
                </div>
                
                <div className="p-5 bg-slate-950/30 space-y-4">
                  <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Token de Acesso</label>
                      <div className="relative group">
                          <input 
                          type="text" 
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Cole seu token aqui"
                          className="w-full bg-slate-900 text-white rounded-xl py-4 px-4 border border-white/10 focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all font-mono text-xs shadow-inner group-hover:border-white/20"
                          />
                          {token && <div className="absolute right-4 top-4 text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>}
                      </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                      <a 
                      href="https://brapi.dev/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-accent hover:text-white transition-colors uppercase tracking-wide group"
                      >
                      Obter token <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                      <button 
                      onClick={handleSaveToken}
                      className="bg-accent text-primary px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 hover:brightness-110 shadow-lg shadow-accent/20"
                      >
                      <Save className="w-3 h-3" /> Salvar
                      </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                   <HardDrive className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-lg font-black text-white">Dados</h2>
                   <p className="text-xs text-slate-500">Gerencie suas informações</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                  <button 
                      onClick={handleExport}
                      className="bg-secondary/40 backdrop-blur-md rounded-3xl p-5 border border-white/10 hover:bg-secondary/60 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Download className="w-20 h-20 text-blue-400" />
                      </div>
                      <div className="p-2.5 bg-blue-500/10 w-fit rounded-xl text-blue-400 mb-3 group-hover:bg-blue-500/20 transition-colors">
                          <Download className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">Fazer Backup</h3>
                      <p className="text-xs text-slate-400 font-medium max-w-[80%]">Baixar arquivo JSON com todas as suas transações.</p>
                  </button>

                  <button 
                      onClick={handleImportClick}
                      className="bg-secondary/40 backdrop-blur-md rounded-3xl p-5 border border-white/10 hover:bg-secondary/60 transition-all text-left group relative overflow-hidden active:scale-[0.98]"
                  >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Upload className="w-20 h-20 text-emerald-400" />
                      </div>
                      <div className="p-2.5 bg-emerald-500/10 w-fit rounded-xl text-emerald-400 mb-3 group-hover:bg-emerald-500/20 transition-colors">
                          <Upload className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-white mb-1">Restaurar Backup</h3>
                      <p className="text-xs text-slate-400 font-medium max-w-[80%]">Recuperar dados de um arquivo JSON.</p>
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
          )}

          {activeSection === 'system' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                   <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-lg font-black text-white">Sistema</h2>
                   <p className="text-xs text-slate-500">Manutenção e Reset</p>
                </div>
              </div>

              {/* Botão de Limpar Cache (Dados) */}
              <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-6 relative overflow-hidden mb-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
                  
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 relative z-10">
                      Limpar Cache de Dados
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed relative z-10">
                      Útil se as cotações estiverem desatualizadas, travadas ou se os logotipos não carregarem. Não apaga sua carteira.
                  </p>
                  
                  <button 
                      onClick={handleClearCache}
                      className="w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 border border-sky-500/20 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-sky-500/5 text-xs uppercase tracking-widest relative z-10"
                  >
                      <Eraser className="w-4 h-4" /> Limpar Dados
                  </button>
              </div>
              
              {/* Botão de Reset Total (Perigo) */}
              <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 relative overflow-hidden">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      Resetar Aplicativo
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                      Esta ação irá remover todos os dados locais, transações e configurações. O aplicativo voltará ao estado inicial.
                  </p>
                  
                  <button 
                      onClick={handleReset}
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/5 text-xs uppercase tracking-widest"
                  >
                      <Trash2 className="w-4 h-4" /> Apagar Tudo
                  </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
