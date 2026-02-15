
import { useState, useEffect, useCallback } from 'react';
import { ReleaseNote, VersionData } from '../types';

export const useUpdateManager = (currentAppVersion: string) => {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [availableVersion, setAvailableVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [showChangelog, setShowChangelog] = useState(false);
  const [currentVersionDate, setCurrentVersionDate] = useState<string | null>(null);

  // Compara versões semânticas (ex: 8.9.0 > 8.8.1)
  const isNewerVersion = (newVer: string, currentVer: string) => {
    const n = newVer.split('.').map(Number);
    const c = currentVer.split('.').map(Number);
    for (let i = 0; i < Math.max(n.length, c.length); i++) {
      if ((n[i] || 0) > (c[i] || 0)) return true;
      if ((n[i] || 0) < (c[i] || 0)) return false;
    }
    return false;
  };

  const checkVersionMetadata = useCallback(async (manual = false) => {
    try {
      // Cache busting agressivo com timestamp
      const response = await fetch(`./version.json?t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) return false;
      
      const data: VersionData = await response.json();
      
      if (data.version && isNewerVersion(data.version, currentAppVersion)) {
        setAvailableVersion(data.version);
        setReleaseNotes(data.notes || []);
        if (data.date) setCurrentVersionDate(data.date);
        setIsUpdateAvailable(true);
        if (manual) setShowChangelog(true);
        return true;
      } else if (manual) {
        // Se for manual e não tiver update, garante que os dados locais estão syncados
        setCurrentVersionDate(data.date);
      }
    } catch (error) {
      console.warn('Erro ao verificar version.json:', error);
    }
    return false;
  }, [currentAppVersion]);

  const checkForUpdates = useCallback(async () => {
    const hasJsonUpdate = await checkVersionMetadata(true);
    
    // Força atualização do SW se existir
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
      } catch (e) {
        console.warn('SW Update Warning:', e);
      }
    }
    return hasJsonUpdate;
  }, [checkVersionMetadata]);

  // Estratégia "Nuclear" de Atualização
  const startUpdateProcess = useCallback(async () => {
    setIsUpdating(true);
    setUpdateProgress(10);

    const forceCleanReload = async () => {
        setUpdateProgress(70);
        
        // 1. Remove Service Workers
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
                await reg.unregister();
            }
        }
        
        // 2. Limpa Cache Storage (Assets)
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }

        setUpdateProgress(100);
        // 3. Reload Hard
        window.location.reload();
    };

    // Tenta via mensagem primeiro
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.waiting) {
          setUpdateProgress(50);
          reg.waiting.postMessage({ type: 'INVESTFIIS_SKIP_WAITING' });
          // Espera um pouco para o SW ativar, senão recarrega forçado
          setTimeout(() => window.location.reload(), 500);
          return;
      }
    }

    // Se não houver SW waiting ou falhar, força limpeza
    setTimeout(forceCleanReload, 1000);

  }, []);

  // Check automático ao montar
  useEffect(() => {
    checkVersionMetadata();
    // Check periódico a cada 1 hora
    const interval = setInterval(() => checkVersionMetadata(), 3600000);
    return () => clearInterval(interval);
  }, [checkVersionMetadata]);

  return {
    isUpdateAvailable,
    availableVersion,
    releaseNotes,
    showChangelog,
    setShowChangelog,
    checkForUpdates,
    startUpdateProcess,
    isUpdating,
    updateProgress,
    currentVersionDate
  };
};
