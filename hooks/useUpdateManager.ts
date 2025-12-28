
import { useState, useEffect, useCallback, useRef } from 'react';
import { ReleaseNote, VersionData } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
};

// Helper puro para comparação (não depende de React)
const compareVersions = (v1: string, v2: string) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export const useUpdateManager = (currentAppVersion: string) => {
  // Estados UI
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Referências para evitar stale closures
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const isInstallingRef = useRef(false);

  // --- 1. Lógica de Fetch de Dados (Versão/Notas) ---
  const fetchVersionJson = useCallback(async () => {
    try {
      // Cache-busting para garantir leitura fresca
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        // Se versão do servidor > versão atual do código
        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          setReleaseNotes(data.notes || []);
          return true;
        }
      }
    } catch (e) {
      console.warn('Erro ao checar version.json', e);
    }
    return false;
  }, [currentAppVersion]);

  // --- 2. Inicialização e Listeners do SW (Executa 1x) ---
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // A. Detectar se houve atualização recente (para mostrar Changelog)
    const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
    if (compareVersions(currentAppVersion, lastSeen) > 0) {
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        // Busca notas da versão atual para exibir
        fetch(`./version.json?t=${Date.now()}`).then(r => r.json()).then(data => {
            if (data.version === currentAppVersion) {
                setReleaseNotes(data.notes || []);
                setAvailableVersion(data.version); // Para o modal saber qual v é
                setShowChangelog(true);
            }
        }).catch(() => {});
    }

    // B. Listener para Reload Automático APÓS ativação do novo SW
    let refreshing = false;
    const handleControllerChange = () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // C. Registro e Monitoramento de Update
    navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        swRegistrationRef.current = reg;

        // C.1 Já existe um SW esperando (Update baixado em background anteriormente)
        if (reg.waiting) {
            fetchVersionJson().then((hasNewVersion) => {
                if (hasNewVersion) {
                    setIsUpdateAvailable(true);
                    setShowUpdateBanner(true);
                }
            });
        }

        // C.2 Monitorar novas instalações
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                    // Se chegou em 'installed' e já existe um controlador, é update
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        fetchVersionJson().then(() => {
                            setIsUpdateAvailable(true);
                            setShowUpdateBanner(true);
                        });
                    }
                });
            }
        });
    });

    return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [currentAppVersion, fetchVersionJson]);

  // --- 3. Ações Expostas ---

  // Checagem manual (ex: botão nas configurações)
  const manualCheck = useCallback(async () => {
     if (swRegistrationRef.current) {
         try {
             await swRegistrationRef.current.update();
             // A lógica do 'updatefound' acima cuidará do resto se houver algo
         } catch(e) {}
     }
     // Retorna se achou algo no JSON (fallback)
     const hasUpdate = await fetchVersionJson();
     return hasUpdate;
  }, [fetchVersionJson]);

  // Processo de Instalação (UI + Lógica)
  const startUpdateProcess = useCallback(() => {
     if (isInstallingRef.current) return;
     isInstallingRef.current = true;
     
     // 1. Inicia UI de progresso
     setUpdateProgress(1);
     let p = 1;
     const interval = setInterval(() => {
        const increment = Math.max(2, Math.floor(Math.random() * 15)); // Aleatório para parecer real
        p += increment;
        
        if (p >= 100) {
            p = 100;
            clearInterval(interval);
            setUpdateProgress(100);

            // 2. Após UI completar, envia sinal para o SW
            setTimeout(() => {
                if (swRegistrationRef.current && swRegistrationRef.current.waiting) {
                    swRegistrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
                } else {
                    // Fallback se algo bizarro acontecer
                    window.location.reload();
                }
            }, 500);
        } else {
            setUpdateProgress(p);
        }
     }, 40);
  }, []);

  return {
    // Estados
    isUpdateAvailable,
    showUpdateBanner,
    availableVersion,
    releaseNotes,
    updateProgress,
    showChangelog,
    
    // Setters (para fechar modais)
    setShowUpdateBanner,
    setShowChangelog,

    // Ações
    checkForUpdates: manualCheck,
    startUpdateProcess,
  };
};
