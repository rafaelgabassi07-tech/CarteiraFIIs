
import { useState, useEffect, useCallback } from 'react';
import { VersionData, ReleaseNote } from '../types';

const STORAGE_KEYS = {
  LAST_SEEN_VERSION: 'investfiis_last_version_seen',
};

// Função auxiliar para comparar versões (ex: "5.4.6" > "5.4.5")
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
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // 1. Verifica se há um Service Worker aguardando ativação (Update baixado, mas não instalado)
  const checkServiceWorkerStatus = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        setIsUpdateAvailable(true);
        // Tenta pegar a versão do JSON mesmo se o SW já estiver waiting, para mostrar o changelog
        fetchVersionJson();
        return true;
      }
    }
    return false;
  }, []);

  // 2. Busca o version.json para comparar com a versão atual do código
  const fetchVersionJson = useCallback(async () => {
    try {
      // Cache busting para garantir leitura fresca
      const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data: VersionData = await res.json();
        
        // Se a versão do servidor for maior que a do app
        if (compareVersions(data.version, currentAppVersion) > 0) {
          setAvailableVersion(data.version);
          setReleaseNotes(data.notes || []);
          setIsUpdateAvailable(true);
          return true;
        }
      }
    } catch (e) {
      console.warn('Falha ao buscar version.json', e);
    }
    return false;
  }, [currentAppVersion]);

  // 3. Função Principal de Verificação
  const checkForUpdates = useCallback(async (manual = false) => {
    if (isChecking) return;
    setIsChecking(true);

    const swWaiting = await checkServiceWorkerStatus();
    if (!swWaiting) {
      await fetchVersionJson();
    }
    
    setIsChecking(false);
  }, [checkServiceWorkerStatus, fetchVersionJson, isChecking]);

  // 4. Executa a atualização
  const performUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
        // Envia mensagem para o SW pular a espera e assumir o controle
        // O index.tsx detectará 'controllerchange' e recarregará a página
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
    }
    // Fallback: recarga forçada se não houver SW ou for apenas atualização de assets
    window.location.reload();
  }, []);

  // 5. Ciclo de Vida Inicial
  useEffect(() => {
    const init = async () => {
      // Verifica na montagem
      await checkForUpdates();

      // Gerencia o "Last Seen" para não mostrar changelog antigo
      const lastSeen = localStorage.getItem(STORAGE_KEYS.LAST_SEEN_VERSION) || '0.0.0';
      if (compareVersions(currentAppVersion, lastSeen) > 0) {
        // App acabou de ser atualizado
        localStorage.setItem(STORAGE_KEYS.LAST_SEEN_VERSION, currentAppVersion);
        // Opcional: Buscar notas da versão atual para mostrar "O que há de novo"
        try {
            const res = await fetch(`./version.json?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                if (data.version === currentAppVersion) {
                    setReleaseNotes(data.notes || []);
                }
            }
        } catch(e){}
      }
    };
    init();

    // Listener para SW encontrado durante o uso
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
             // Opcional: mostrar toast "Atualizado com sucesso"
        });
    }
  }, [checkForUpdates, currentAppVersion]);

  return {
    isUpdateAvailable,
    availableVersion,
    releaseNotes,
    checkForUpdates,
    performUpdate,
    isChecking
  };
};
