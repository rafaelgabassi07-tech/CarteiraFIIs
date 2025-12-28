
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, User, ShieldCheck, Wallet, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onGuestAccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGuestAccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Verifique seu e-mail para confirmar o cadastro!');
        setIsSignUp(false);
        resetForm();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-[#020617] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm anim-fade-in-up is-visible z-10">
        
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-20 rounded-[2rem] transition-opacity duration-500" />
            <Wallet className="w-10 h-10 text-white dark:text-slate-900" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">InvestFIIs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Sua carteira inteligente de FIIs e Ações.</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white/50 dark:border-white/5">
          
          <div className="flex gap-4 mb-6 p-1 bg-slate-100 dark:bg-black/20 rounded-2xl">
            <button
              onClick={() => { setIsSignUp(false); resetForm(); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${!isSignUp ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setIsSignUp(true); resetForm(); }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${isSignUp ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 anim-fade-in is-visible">
                <ShieldCheck className="w-4 h-4" /> {error}
              </div>
            )}
            
            {message && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 anim-fade-in is-visible">
                <ShieldCheck className="w-4 h-4" /> {message}
              </div>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="email"
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 pl-12 pr-4 py-4 rounded-2xl outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/20"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 pl-12 pr-12 py-4 rounded-2xl outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/20"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {isSignUp && (
              <div className="relative group anim-fade-in-up is-visible">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirme sua senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 pl-12 pr-12 py-4 rounded-2xl outline-none text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all border border-transparent focus:border-indigo-500/20"
                  required={isSignUp}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl hover:shadow-2xl shadow-indigo-500/10 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isSignUp ? 'Cadastrar' : 'Acessar'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 text-center">
             <p className="text-[10px] text-slate-400 font-medium mb-3">Prefere não criar uma conta agora?</p>
             <button 
                onClick={onGuestAccess}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center justify-center gap-1 mx-auto"
             >
                Entrar como convidado
             </button>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-slate-400 mt-8 font-medium">
          InvestFIIs v6.6.1 • Protegido por Supabase
        </p>
      </div>
    </div>
  );
};
