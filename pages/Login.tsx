
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, ArrowLeft, MailCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin');
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
    if (mode === 'signin') {
        setConfirmPassword('');
    }
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 relative overflow-hidden font-sans text-zinc-100">
      
      {/* Ambient Lighting Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-zinc-800/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-slate-800/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[380px] flex flex-col relative z-10">
        
        {/* Header Section */}
        <div className="mb-8 text-center anim-fade-in-up">
            {/* BRAND COMPOSITION */}
            <div className="flex items-center justify-center gap-0 mb-8 relative select-none">
                <div className="w-[52px] h-[80px] flex items-center justify-center relative z-10">
                   <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto drop-shadow-xl">
                        <defs>
                            <linearGradient id="logo_grad_login" x1="256" y1="40" x2="256" y2="472" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#10b981"/>
                                <stop offset="100%" stopColor="#0284c7"/>
                            </linearGradient>
                        </defs>
                        <path d="M256 64L464 272H384L256 144L128 272H48L256 64Z" fill="url(#logo_grad_login)"/>
                        <path d="M176 296L256 248L336 296V312H176V296Z" fill="url(#logo_grad_login)"/>
                        <rect x="184" y="328" width="32" height="104" rx="4" fill="url(#logo_grad_login)"/>
                        <rect x="240" y="328" width="32" height="104" rx="4" fill="url(#logo_grad_login)"/>
                        <rect x="296" y="328" width="32" height="104" rx="4" fill="url(#logo_grad_login)"/>
                        <path d="M160 448H352C356.418 448 360 451.582 360 456V472H152V456C152 451.582 155.582 448 160 448Z" fill="url(#logo_grad_login)"/>
                   </svg>
                </div>
                <span className="font-display text-[56px] font-bold tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-sky-600 relative z-0 -ml-2.5">
                    NVEST
                </span>
            </div>

            {/* Dynamic Text with Key-based Animation */}
            <div key={mode} className="anim-fade-in-up">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100 mb-2">
                    {mode === 'signin' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar Conta' : 'Recuperar Acesso'}
                </h1>
                <p className="text-sm text-zinc-500 font-medium">
                    {mode === 'signin' ? 'Sua carteira inteligente.' : mode === 'signup' ? 'Acompanhe sua evolução.' : 'Vamos te ajudar a voltar.'}
                </p>
            </div>
        </div>

        {isVerificationSent ? (
            <div className="text-center anim-scale-in">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20">
                    <MailCheck className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Verifique seu E-mail</h2>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed px-4">
                    Enviamos um link de confirmação para <span className="text-white font-semibold">{email}</span>.
                </p>
                <button 
                    onClick={() => { setIsVerificationSent(false); setMode('signin'); }}
                    className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-zinc-800 hover:border-zinc-700"
                >
                    Voltar ao Login
                </button>
            </div>
        ) : (
            <div className="anim-fade-in-up" style={{ animationDelay: '100ms' }}>
                
                {/* Tab Switcher (Minimalist) */}
                {mode !== 'recovery' && (
                    <div className="flex bg-zinc-900/50 p-1 rounded-2xl mb-8 border border-zinc-800/50 backdrop-blur-sm">
                        <button
                            onClick={() => toggleMode('signin')}
                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'signin' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => toggleMode('signup')}
                            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'signup' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Cadastro
                        </button>
                    </div>
                )}

                {/* Forms */}
                <form onSubmit={handleAuth} className="space-y-4">
                    
                    {/* Error/Success Messages */}
                    {(error || message) && (
                        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border anim-scale-in ${error ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {error ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                            <span>{error || message}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Email Input */}
                        <div className="group">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1 block">E-mail</label>
                            <div className="relative">
                                <div className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-sky-500 transition-colors pointer-events-none">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900/80 pl-12 pr-4 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-700 outline-none border border-zinc-800 focus:border-sky-500 focus:bg-zinc-900 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {mode !== 'recovery' && (
                            <div className="group">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1 block">Senha</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-sky-500 transition-colors pointer-events-none">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-900/80 pl-12 pr-12 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-700 outline-none border border-zinc-800 focus:border-sky-500 focus:bg-zinc-900 transition-all"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-600 hover:text-white transition-colors p-1">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Smooth Slide Transition for Confirm Password */}
                        <div className={`transition-all duration-500 ease-out-mola overflow-hidden ${mode === 'signup' ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="group pt-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1 block">Confirmar Senha</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-sky-500 transition-colors pointer-events-none">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-900/80 pl-12 pr-4 py-4 rounded-2xl text-sm text-white placeholder:text-zinc-700 outline-none border border-zinc-800 focus:border-sky-500 focus:bg-zinc-900 transition-all"
                                        required={mode === 'signup'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        {mode === 'signin' ? (
                            <button type="button" onClick={() => setMode('recovery')} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest ml-1">
                                Esqueci a senha
                            </button>
                        ) : mode === 'recovery' && (
                            <button type="button" onClick={() => setMode('signin')} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest ml-1 flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> Voltar
                            </button>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20 mt-4 ${
                            loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                            'bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white'
                        }`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <div key={mode} className="flex items-center gap-2 anim-fade-in">
                                <span>{mode === 'recovery' ? 'Enviar Link' : mode === 'signup' ? 'Criar Conta' : 'Acessar'}</span>
                                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                        )}
                    </button>
                </form>
            </div>
        )}
      </div>
      
      {/* Footer minimalista */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest">
             InvestFIIs Cloud &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
