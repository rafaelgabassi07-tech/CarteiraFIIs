
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, TrendingUp, KeyRound, ArrowLeft, MailCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
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
      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('Enviamos um link de recuperação para o seu e-mail.');
        setTimeout(() => { setIsRecovery(false); setMessage('Verifique seu e-mail para redefinir a senha.'); }, 2000);

      } else if (isSignUp) {
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setIsVerificationSent(true);
        resetForm();

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg === 'Invalid login credentials') msg = 'E-mail ou senha incorretos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
      setIsVerificationSent(false);
      setIsSignUp(false);
      setIsRecovery(false);
      setError(null);
      setMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617]">
      
      <div className="w-full max-w-[400px] flex flex-col gap-8">
        
        {/* Header */}
        <div className="text-center anim-fade-in-up is-visible">
            <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
              <img src="/logo.svg" alt="InvestFIIs Logo" className="w-10 h-10 object-contain" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center border-4 border-[#020617]">
                 <TrendingUp className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-2">InvestFIIs</h1>
            <p className="text-sm text-slate-400 font-medium tracking-wide uppercase">Acesso Seguro</p>
        </div>

        {/* Solid Card */}
        <div className="bg-[#0F1623] rounded-[2rem] border border-slate-800/50 p-8 shadow-2xl anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
            
            {isVerificationSent ? (
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <MailCheck className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">Confirme seu E-mail</h2>
                    <p className="text-sm text-slate-400 mb-6">Verifique sua caixa de entrada.</p>
                    <button 
                        onClick={handleBackToLogin}
                        className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        Voltar
                    </button>
                </div>
            ) : (
                <>
                    {!isRecovery ? (
                        <div className="flex bg-slate-900 p-1 rounded-xl mb-8 border border-slate-800">
                            <button
                                onClick={() => { setIsSignUp(false); resetForm(); }}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${!isSignUp ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => { setIsSignUp(true); resetForm(); }}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${isSignUp ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Criar
                            </button>
                        </div>
                    ) : (
                        <div className="mb-6 text-center">
                            <h3 className="text-lg font-bold text-white">Recuperar Acesso</h3>
                            <p className="text-xs text-slate-400 mt-1">Digite seu e-mail para continuar.</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20">{error}</div>}
                        {message && <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">{message}</div>}

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-3.5 text-slate-500"><Mail className="w-5 h-5" /></div>
                                <input
                                    type="email"
                                    placeholder="Seu e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-900 pl-12 pr-4 py-3.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none border border-slate-800 focus:border-indigo-500 transition-colors"
                                    required
                                />
                            </div>

                            {!isRecovery && (
                                <div className="relative">
                                    <div className="absolute left-4 top-3.5 text-slate-500"><Lock className="w-5 h-5" /></div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Sua senha"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-900 pl-12 pr-12 py-3.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none border border-slate-800 focus:border-indigo-500 transition-colors"
                                        required={!isRecovery}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}

                            {!isSignUp && !isRecovery && (
                                <div className="flex justify-end">
                                    <button type="button" onClick={() => { setIsRecovery(true); setError(null); setMessage(null); }} className="text-[10px] font-bold text-slate-500 hover:text-white transition-colors">Esqueci a senha</button>
                                </div>
                            )}

                            {isSignUp && (
                                <div className="relative anim-fade-in">
                                    <div className="absolute left-4 top-3.5 text-slate-500"><ShieldCheck className="w-5 h-5" /></div>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirme a senha"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-slate-900 pl-12 pr-12 py-3.5 rounded-xl text-sm text-white placeholder:text-slate-600 outline-none border border-slate-800 focus:border-indigo-500 transition-colors"
                                        required={isSignUp}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <button type="submit" disabled={loading} className="w-full bg-white text-slate-900 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isRecovery ? 'Enviar Link' : isSignUp ? 'Cadastrar' : 'Entrar')} 
                            </button>

                            {isRecovery && (
                                <button type="button" onClick={handleBackToLogin} className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </>
            )}
        </div>
      </div>
    </div>
  );
};
