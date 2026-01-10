
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, TrendingUp, KeyRound, ArrowLeft, MailCheck, UserPlus, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin'); // State machine simples
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Limpa estados ao trocar de modo
  useEffect(() => {
    setError(null);
    setMessage(null);
    setPassword('');
    setConfirmPassword('');
  }, [mode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('Link de recuperação enviado para o e-mail.');
        setTimeout(() => { setMode('signin'); setMessage('Verifique seu e-mail.'); }, 3000);

      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('As senhas não conferem.');
        if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');
        
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setIsVerificationSent(true);

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      let msg = err.message;
      if (msg === 'Invalid login credentials') msg = 'E-mail ou senha incorretos.';
      if (msg.includes('rate limit')) msg = 'Muitas tentativas. Aguarde um pouco.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: 'signin' | 'signup') => {
    if (loading) return;
    setMode(newMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#02040A] relative overflow-hidden font-sans">
      
      {/* Background - Solid Dark, no blur blobs */}
      
      <div className="w-full max-w-[420px] flex flex-col gap-6 relative z-10">
        
        {/* Header Logo */}
        <div className="text-center anim-fade-in-up is-visible">
            <div className="relative w-20 h-20 mx-auto mb-6 group cursor-default">
                <div className="relative w-full h-full bg-[#0F1623] border border-zinc-800 rounded-[1.5rem] flex items-center justify-center shadow-2xl">
                    <img src="./logo.svg" alt="Logo" className="w-10 h-10 object-contain opacity-90 group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 rounded-lg flex items-center justify-center border-[3px] border-[#02040A] shadow-lg">
                        <TrendingUp className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                </div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight mb-1">Invest<span className="text-sky-500">FIIs</span></h1>
            <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase">Gestão Inteligente</p>
        </div>

        {/* Main Card - SOLID */}
        <div className="bg-[#0F1623] rounded-[2.5rem] border border-zinc-800 p-2 shadow-2xl anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
            
            {isVerificationSent ? (
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 animate-pulse">
                        <MailCheck className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Verifique seu E-mail</h2>
                    <p className="text-sm text-zinc-400 mb-8 leading-relaxed">Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta.</p>
                    <button 
                        onClick={() => { setIsVerificationSent(false); setMode('signin'); }}
                        className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform hover:bg-zinc-700"
                    >
                        Voltar ao Login
                    </button>
                </div>
            ) : (
                <div className="p-6">
                    {/* Animated Segmented Control */}
                    {mode !== 'recovery' && (
                        <div className="relative flex bg-[#02040A] p-1.5 rounded-2xl mb-8 border border-zinc-800">
                            <div 
                                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-zinc-800 rounded-xl shadow transition-all duration-300 ease-out-quint ${mode === 'signup' ? 'translate-x-[100%] translate-x-1.5' : 'left-1.5'}`}
                            ></div>
                            <button
                                onClick={() => toggleMode('signin')}
                                className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${mode === 'signin' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Entrar
                            </button>
                            <button
                                onClick={() => toggleMode('signup')}
                                className={`relative z-10 flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-colors duration-300 ${mode === 'signup' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Criar Conta
                            </button>
                        </div>
                    )}

                    {mode === 'recovery' && (
                        <div className="mb-8 text-center relative">
                            <button 
                                onClick={() => setMode('signin')} 
                                className="absolute left-0 top-1 w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400">
                                <KeyRound className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Recuperar Senha</h3>
                            <p className="text-xs text-zinc-500 mt-1">Informe seu e-mail cadastrado</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {/* Messages Area */}
                        <div className={`overflow-hidden transition-all duration-300 ${error || message ? 'max-h-24 opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}`}>
                             {error && <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs font-bold border border-rose-500/20 flex items-center gap-2"><ShieldCheck className="w-4 h-4 shrink-0" /> {error}</div>}
                             {message && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-2"><Sparkles className="w-4 h-4 shrink-0" /> {message}</div>}
                        </div>

                        {/* Inputs Container */}
                        <div className="space-y-4">
                            <div className="group relative">
                                <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-sky-500 transition-colors"><Mail className="w-5 h-5" /></div>
                                <input
                                    type="email"
                                    placeholder="Seu e-mail principal"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#02040A] pl-12 pr-4 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-600 outline-none border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            <div className="group relative">
                                <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-sky-500 transition-colors"><Lock className="w-5 h-5" /></div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Sua senha secreta"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#02040A] pl-12 pr-12 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-600 outline-none border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner"
                                    required={mode !== 'recovery'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-600 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Animated Confirm Password Field */}
                            <div className={`overflow-hidden transition-all duration-300 ease-out-quint ${mode === 'signup' ? 'max-h-20 opacity-100 pt-0' : 'max-h-0 opacity-0 pt-0'}`}>
                                <div className="group relative">
                                    <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-indigo-500 transition-colors"><ShieldCheck className="w-5 h-5" /></div>
                                    <input
                                        type="password"
                                        placeholder="Confirme a senha"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[#02040A] pl-12 pr-4 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-600 outline-none border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                                        required={mode === 'signup'}
                                    />
                                </div>
                            </div>
                        </div>

                        {mode === 'signin' && (
                            <div className="flex justify-end pt-1">
                                <button type="button" onClick={() => setMode('recovery')} className="text-[10px] font-bold text-zinc-500 hover:text-sky-400 transition-colors uppercase tracking-wider">
                                    Esqueci a senha
                                </button>
                            </div>
                        )}

                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-sky-500/20 ${
                                    mode === 'recovery' 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' 
                                    : 'bg-white text-[#02040A] hover:bg-zinc-200'
                                }`}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        {mode === 'recovery' ? 'Enviar Link' : mode === 'signup' ? 'Cadastrar' : 'Acessar Carteira'}
                                        {!loading && <ArrowRight className="w-4 h-4" strokeWidth={3} />}
                                    </>
                                )} 
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        
        {/* Footer info */}
        <p className="text-center text-[10px] text-zinc-600 font-medium">
             &copy; {new Date().getFullYear()} InvestFIIs Cloud. All rights reserved.
        </p>
      </div>
    </div>
  );
};
