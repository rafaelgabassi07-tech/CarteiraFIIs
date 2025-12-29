import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Wallet, Eye, EyeOff, Sparkles, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const Login: React.FC = () => {
  const { setAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        setMousePos({ 
            x: (e.clientX / window.innerWidth) * 20 - 10, 
            y: (e.clientY / window.innerHeight) * 20 - 10 
        });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const resetForm = () => {
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Verifique seu e-mail para confirmar o cadastro!');
        setIsSignUp(false);
        resetForm();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-6">
        <div className="text-center anim-fade-in-up is-visible">
          <div className="inline-flex items-center justify-center relative mb-6 group cursor-default">
            <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl">
              <Wallet className="w-9 h-9 text-white group-hover:scale-110 transition-transform duration-500" strokeWidth={1.5} />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-xl flex items-center justify-center border-4 border-[#020617]">
                 <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">InvestFIIs</h1>
          <p className="text-sm text-slate-400 font-medium tracking-wide">Gestão inteligente de patrimônio</p>
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-1 shadow-2xl anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
          <div className="bg-[#0b1121]/50 rounded-[2.25rem] p-6 sm:p-8 border border-white/5">
            <div className="relative flex bg-black/20 p-1 rounded-2xl mb-8">
                <div 
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-xl shadow-sm transition-all duration-300 ease-out-quint border border-white/5"
                    style={{ left: isSignUp ? 'calc(50% + 2px)' : '4px' }}
                ></div>
                <button
                    onClick={() => { setIsSignUp(false); resetForm(); }}
                    className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${!isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Entrar
                </button>
                <button
                    onClick={() => { setIsSignUp(true); resetForm(); }}
                    className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-300 ${isSignUp ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Criar Conta
                </button>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
                {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-start gap-3 anim-fade-in is-visible">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
                )}
                
                {message && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-start gap-3 anim-fade-in is-visible">
                    <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{message}</span>
                </div>
                )}
                <div className="space-y-4">
                    <div className="group relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-500/20 group-focus-within:text-indigo-400 transition-all duration-300">
                            <Mail className="w-5 h-5" />
                        </div>
                        <input
                            type="email"
                            placeholder="Seu e-mail principal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/20 pl-16 pr-4 py-4 rounded-2xl text-sm font-medium text-white placeholder:text-slate-500 outline-none border border-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-white/10"
                            required
                        />
                    </div>
                    <div className="group relative">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-500/20 group-focus-within:text-indigo-400 transition-all duration-300">
                            <Lock className="w-5 h-5" />
                        </div>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Sua senha segura"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/20 pl-16 pr-12 py-4 rounded-2xl text-sm font-medium text-white placeholder:text-slate-500 outline-none border border-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-white/10"
                            required
                            minLength={6}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {isSignUp && (
                        <div className="group relative anim-fade-in-up is-visible">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-focus-within:bg-indigo-500/20 group-focus-within:text-indigo-400 transition-all duration-300">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirme a senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-black/20 pl-16 pr-12 py-4 rounded-2xl text-sm font-medium text-white placeholder:text-slate-500 outline-none border border-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all hover:border-white/10"
                                required={isSignUp}
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-2"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="group w-full relative overflow-hidden bg-white text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-white/5 hover:shadow-white/10 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                {isSignUp ? 'Cadastrar' : 'Acessar App'} 
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent z-0"></div>
                    </button>
                </div>
            </form>
          </div>
        </div>
        <div className="text-center space-y-6 anim-fade-in-up is-visible" style={{ animationDelay: '200ms' }}>
            <button 
                onClick={setAsGuest}
                className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
            >
                <span className="text-xs font-bold text-slate-300 group-hover:text-white uppercase tracking-wider transition-colors">Modo Convidado</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
            </button>
            <p className="text-[10px] font-medium text-slate-600">
                &copy; 2025 InvestFIIs • v7.0.9 • Secure by Supabase
            </p>
        </div>
      </div>
    </div>
  );
};