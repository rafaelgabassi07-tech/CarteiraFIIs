
import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Trash2, Maximize2, Minimize2, Copy, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  messages: any[];
}

export const DebugConsole: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isMinimized]);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (level: LogEntry['level'], args: any[]) => {
      setLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        level,
        messages: args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
          } catch (e) {
            return '[Circular/Unserializable Object]';
          }
        })
      }].slice(-100)); // Keep last 100 logs
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    const handleError = (event: ErrorEvent) => {
      addLog('error', [`Uncaught Exception: ${event.message}`, event.filename, event.lineno]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog('error', [`Unhandled Promise Rejection: ${event.reason}`]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-4 z-[9999] bg-slate-900 text-green-400 p-3 rounded-full shadow-xl border border-green-500/30 flex items-center gap-2 animate-bounce"
      >
        <Terminal className="w-5 h-5" />
        {logs.some(l => l.level === 'error') && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-0 right-0 animate-ping"></span>}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] bg-[#0d1117] border-t-2 border-slate-700 shadow-2xl flex flex-col font-mono text-xs h-[50vh] max-h-[80vh]">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-[#161b22] border-b border-slate-700 select-none">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal className="w-4 h-4" />
          <span className="font-bold">DevConsole</span>
          <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">{logs.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setLogs([])} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Limpar">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setIsMinimized(true)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Minimizar">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-rose-900 rounded text-slate-400 hover:text-rose-400" title="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center mt-10 italic">Aguardando logs...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`group flex gap-2 p-1.5 rounded hover:bg-white/5 border-l-2 ${
              log.level === 'error' ? 'border-rose-500 bg-rose-900/10' : 
              log.level === 'warn' ? 'border-amber-500 bg-amber-900/10' : 
              'border-transparent'
            }`}>
              <span className="text-slate-500 shrink-0 select-none">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour12: false })}
              </span>
              
              <div className="shrink-0 pt-0.5">
                {log.level === 'error' ? <AlertCircle className="w-3 h-3 text-rose-500" /> :
                 log.level === 'warn' ? <AlertTriangle className="w-3 h-3 text-amber-500" /> :
                 <Info className="w-3 h-3 text-blue-400" />}
              </div>

              <div className="flex-1 overflow-x-auto whitespace-pre-wrap break-all">
                {log.messages.map((msg, i) => (
                  <span key={i} className={`${
                    log.level === 'error' ? 'text-rose-300' : 
                    log.level === 'warn' ? 'text-amber-300' : 
                    'text-slate-300'
                  } mr-2`}>
                    {msg}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => copyToClipboard(log.messages.join(' '))}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
