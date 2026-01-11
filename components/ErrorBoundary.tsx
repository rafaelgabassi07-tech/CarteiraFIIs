import React, { ErrorInfo, ReactNode } from 'react';
import { ServerOff } from 'lucide-react';

const ConfigurationError: React.FC = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center font-sans">
    <div className="bg-zinc-900 rounded-[2.5rem] border border-white/10 p-8 max-w-lg anim-fade-in-up is-visible">
      <ServerOff className="w-16 h-16 text-rose-400 mx-auto mb-6" strokeWidth={1} />
      <h1 className="text-2xl font-black text-white tracking-tight mb-3">Erro de Configuração</h1>
      <p className="text-zinc-400 leading-relaxed mb-6">
        A aplicação não conseguiu se conectar ao banco de dados porque as credenciais do Supabase não foram encontradas no ambiente.
      </p>
      <div className="bg-black/20 rounded-xl p-4 text-left text-xs font-mono border border-white/10">
        <p className="font-bold text-amber-300 mb-2">[AÇÃO NECESSÁRIA]</p>
        <p className="text-zinc-300">
          Adicione as variáveis <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-sans font-bold">SUPABASE_URL</code> e <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-sans font-bold">SUPABASE_KEY</code> nas configurações do seu projeto na Vercel.
        </p>
      </div>
    </div>
  </div>
);

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    const { hasError, error } = this.state;

    if (hasError) {
      if (error?.message?.includes('Supabase')) {
        return <ConfigurationError />;
      }
      
      return (
          <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center font-sans">
            <div>
              <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h1>
              <p className="text-zinc-400">Um erro inesperado ocorreu. Por favor, recarregue a página.</p>
            </div>
          </div>
      );
    }

    return this.props.children;
  }
}