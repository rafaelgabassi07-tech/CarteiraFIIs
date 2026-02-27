
import { LogEntry, LogLevel } from '../types';

class LogManager {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private maxLogs = 500; // Aumentado para manter mais histórico
  private initialized = false;

  // Guarda as referências originais do console
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    info: console.info
  };

  init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Sobrescreve métodos do console
    console.log = (...args) => {
      this.addLog('info', args);
      this.originalConsole.log.apply(console, args);
    };

    console.warn = (...args) => {
      this.addLog('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      this.addLog('error', args);
      this.originalConsole.error.apply(console, args);
    };
    
    console.debug = (...args) => {
        this.addLog('debug', args);
        this.originalConsole.debug.apply(console, args);
    };

    console.info = (...args) => {
        this.addLog('info', args);
        this.originalConsole.info.apply(console, args);
    };

    // 2. Captura Erros Globais (Uncaught Exceptions)
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
        this.addLog('error', [
            'Uncaught Exception:',
            message,
            `at ${source}:${lineno}:${colno}`,
            error ? error.stack : ''
        ]);
        if (originalOnError) {
            // @ts-ignore
            return originalOnError(message, source, lineno, colno, error);
        }
        // Não retorna true para permitir que o navegador também logue o erro
    };

    // 3. Captura Promessas Rejeitadas (Unhandled Rejections)
    const originalOnUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
        this.addLog('error', ['Unhandled Rejection:', event.reason]);
        if (originalOnUnhandledRejection) {
            // @ts-ignore
            originalOnUnhandledRejection.call(window, event);
        }
    };

    this.addLog('info', ['System Logger Initialized v2.0']);
    this.addLog('info', [`User Agent: ${navigator.userAgent}`]);
  }

  private formatArg(arg: any): string {
      try {
          if (arg instanceof Error) {
              return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
          }
          if (typeof arg === 'object') {
              if (arg === null) return 'null';
              // Tenta stringify, se falhar (circular), usa fallback
              try {
                  return JSON.stringify(arg, null, 2);
              } catch {
                  return String(arg);
              }
          }
          return String(arg);
      } catch {
          return '[Log Error]';
      }
  }

  private addLog(level: LogLevel, args: any[]) {
    try {
        // Formata cada argumento individualmente para melhor visualização
        const formattedArgs = args.map(arg => {
            if (typeof arg === 'string') return arg;
            return this.formatArg(arg);
        });

        // Mensagem curta para a lista
        const message = formattedArgs.join(' ').substring(0, 300) + (formattedArgs.join(' ').length > 300 ? '...' : '');

        const entry: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            level,
            message: message, // Resumo
            data: formattedArgs // Dados completos processados
        };

        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        this.notifyListeners();
    } catch (e) {
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
