
import { LogEntry, LogLevel } from '../types';

class LogManager {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 200;
  private initialized = false;

  // Guarda as referências originais do console
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Sobrescreve console.log
    console.log = (...args) => {
      this.addLog('info', args);
      this.originalConsole.log.apply(console, args);
    };

    // Sobrescreve console.warn
    console.warn = (...args) => {
      this.addLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    // Sobrescreve console.error
    console.error = (...args) => {
      this.addLog('error', args);
      this.originalConsole.error.apply(console, args);
    };
    
    // Sobrescreve console.debug
    console.debug = (...args) => {
        this.addLog('debug', args);
        this.originalConsole.debug.apply(console, args);
    };

    this.addLog('info', ['System Logger Initialized']);
  }

  private addLog(level: LogLevel, args: any[]) {
    try {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg);
                } catch {
                    return '[Circular Object]';
                }
            }
            return String(arg);
        }).join(' ');

        const entry: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            level,
            message,
            data: args
        };

        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        this.notifyListeners();
    } catch (e) {
        // Evita loop infinito se o logger falhar
        this.originalConsole.error('Logger internal error', e);
    }
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    listener(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.logs));
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }
}

export const logger = new LogManager();
