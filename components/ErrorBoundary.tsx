
import React, { ErrorInfo, ReactNode } from 'react';
import { ServerOff } from 'lucide-react';

const ConfigurationError: React.FC = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center font-sans">
    <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 max-w-lg anim-fade-in-up is-visible">
      <ServerOff className="w-16 h-16 text-rose-400 mx-auto mb-6" strokeWidth={1} />
      <h1 className="text-2xl font-black text-white tracking-tight mb-3">Erro de Configuração do Servidor</h1>
      <p className="text-slate-400 leading-relaxed mb-6">
        A aplicação não conseguiu se conectar ao banco de dados porque as credenciais (URL e Chave) do Supabase não foram encontradas no ambiente de produção.
      </p>
      <div className="bg-black/20 rounded-xl p-4 text-left text-xs font-mono border border-white/10">
        <p className="font-bold text-amber-300 mb-2">[AÇÃO NECESSÁRIA]</p>
        <p className="text-slate-300">
          Por favor, adicione as variáveis de ambiente <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-sans font-bold">SUPABASE_URL</code> e <code className="bg-white/10 px-1.5 py-0.5 rounded-md font-sans font-bold">SUPABASE_KEY</code> nas configurações do seu projeto na Vercel (ou onde a aplicação está hospedada).
        </p>
      </div>
    </div>
  </div>
);

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children?: ReactNode;
}

// ErrorBoundary class catches JavaScript errors anywhere in their child component tree
// Fixed "Property 'props' does not exist" error by extending React.Component explicitly.
export class ErrorBoundary extends React.Component<Props, State> {
  // Using public state and explicit return type for clarity in inheritance
  public state: State = {
    hasError: false,
    error: null
  };

  // Adding an explicit constructor can help TypeScript resolve property inheritance correctly
  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Fix: Safely check for message presence to avoid potential runtime errors
      if (this.state.error?.message?.includes('Credenciais do Supabase')) {
        return <ConfigurationError />;
      }
      
      return (
          <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center font-sans">
            <div>
              <h1 className="text-xl font-bold mb-2">Ops! Algo deu errado.</h1>
              <p className="text-slate-400">Um erro inesperado ocorreu. Por favor, recarregue a página ou verifique o console para mais detalhes.</p>
            </div>
          </div>
      );
    }

    return this.props.children;
  }
}
