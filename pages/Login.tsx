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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#09090b] relative overflow-hidden font-sans text-zinc-100 selection:bg-sky-500/30">
      
      {/* Background Ambience - Increased opacity for better visibility */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/15 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-[380px] flex flex-col relative z-10" style={{ perspective: '1000px' }}>
        
        {/* Header Section com Logo 3D */}
        <div className="mb-10 text-center anim-fade-in-up">
            {/* BRAND COMPOSITION */}
            <div className="flex items-center justify-center gap-2 mb-8 relative select-none animate-[float_6s_ease-in-out_infinite] transform-style-3d">
                <div className="w-[84px] h-[84px] relative z-10 drop-shadow-[0_24px_48px_rgba(79,70,229,0.4)]">
                   <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJncmFkX21haW4iIHgxPSIyNTYiIHkxPSI1MCIgeDI9PSIyNTYiIHkyPSI0NjIiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMzRkMzk5Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMGVhNWU5Ii8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRfc2hhZG93IiB4MT0iMjU2IiB5MT0iMjAwIiB4Mj0iMjU2IiB5Mj0iNDcyIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzBlYTVlOSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzRmNDZlNSIvPjwvbGluZWFyR3JhZGllbnQ+PGZpbHRlciBpZD0iZHJvcFNoYWRvdyIgeD0iLTUwJSIgeT0iLTUwJSIgd2lkdGg9IjIwMCUiIGhlaWdodD0iMjAwJSI+PGZlR2F1c3NpYW5CbHVyIGluPSJTb3VyY2VBbHBoYSIgc3RkRGV2aWF0aW9uPSIxNiIvPjxmZU9mZnNldCBkeD0iMCIgZHk9IjI0IiByZXN1bHQ9Im9mZnNldGJsdXIiLz48ZmVGbG9vZCBmbG9vZC1jb2xvcj0iIzBlYTVlOSIgZmxvb2Qtb3BhY2l0eT0iMC4yNSIvPjxmZUNvbXBvc2l0ZSBpbjI9Im9mZnNldGJsdXIiIG9wZXJhdG9yPSJpbiIvPjxmZU1lcmdlPjxmZU1lcmdlTm9kZS8+PGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+PC9mZU1lcmdlPjwvZmlsdGVyPjwvZGVmcz48ZyBmaWx0ZXI9InVybCgjZHJvcFNoYWRvdykiPjxwYXRoIGQ9Ik0yNTYgNjQgTDQxNiAyMjQgSDMzNiBMMjU2IDE0NCBMMTc2IDIyNCBIOTYgTDI1NiA2NCBaIiBmaWxsPSJ1cmwoI2dyYWRfbWFpbikiLz48cmVjdCB4PSIxNDQiIHk9IjI0MCIgd2lkdGg9IjIyNCIgaGVpZ2h0PSIzMiIgcng9IjQiIGZpbGw9InVybCgjZ3JhZF9zaGFkb3cpIiBmaWxsLW9wYWNpdHk9IjAuOSIvPjxyZWN0IHg9IjE2MCIgeT0iMjg4IiB3aWR0aD0iNDgiIGhlaWdodD0iMTEyIiByeD0iNCIgZmlsbD0idXJsKCNncmFkX21haW4KSIvPjxyZWN0IHg9IjIzMiIgeT0iMjg4IiB3aWR0aD0iNDgiIGhlaWdodD0iMTEyIiByeD0iNCIgZmlsbD0idXJsKCNncmFkX21haW4KSIvPjxyZWN0IHg9IjMwNCIgeT0iMjg4IiB3aWR0aD0iNDgiIGhlaWdodD0iMTEyIiByeD0iNCIgZmlsbD0idXJsKCNncmFkX21haW4KSIvPjxwYXRoIGQ9Ik0xMjggNDAwIEgzODQgQzM5Mi44IDQwMCA0MDAgNDA3LjIgNDAwIDQxNiBWNDMyIEgxMTIgVjQxNiBDMTEyIDQwNy4yIDExOS4yIDQwMCAxMjggNDAwIFoiIGZpbGw9InVybCgjZ3JhZF9zaGFkb3cpIi8+PHBhdGggZD0iTTI1NiA2NCBMMjAwIDEyMCBMMjU2IDE3NiBMMzEyIDEyMCBMMjU2IDY0IFoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMTUiLz48L2c+PC9zdmc+" alt="InvestFIIs Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-[56px] font-black tracking-tighter leading-none text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-400 mt-2 -ml-1 drop-shadow-lg">
                    NVEST
                </span>
            </div>

            {/* Dynamic Text with Key-based Animation */}
            <div key={mode} className="anim-fade-in-up space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    {mode === 'signin' ? 'Bem-vindo de volta' : mode === 'signup' ? 'Criar Conta' : 'Recuperar Acesso'}
                </h1>
                <p className="text-sm text-zinc-400 font-medium">
                    {mode === 'signin' ? 'Sua carteira inteligente de FIIs e Ações.' : mode === 'signup' ? 'Comece a acompanhar sua evolução.' : 'Vamos te ajudar a voltar.'}
                </p>
            </div>
        </div>

        {isVerificationSent ? (
            <div className="text-center anim-scale-in bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 backdrop-blur-xl shadow-2xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <MailCheck className="w-10 h-10" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Verifique seu E-mail</h2>
                <p className="text-sm text-zinc-400 mb-8 leading-relaxed px-2">
                    Enviamos um link de confirmação para <span className="text-white font-semibold block mt-1">{email}</span>
                </p>
                <button 
                    onClick={() => { setIsVerificationSent(false); setMode('signin'); }}
                    className="w-full py-4 rounded-2xl bg-zinc-100 text-zinc-900 font-black text-xs uppercase tracking-widest active:scale-95 transition-all hover:bg-white shadow-lg"
                >
                    Voltar ao Login
                </button>
            </div>
        ) : (
            <div className="anim-fade-in-up" style={{ animationDelay: '100ms' }}>
                
                {/* Tab Switcher (Glassmorphism) - High Contrast */}
                {mode !== 'recovery' && (
                    <div className="flex bg-zinc-900 p-1 rounded-2xl mb-8 border border-zinc-800 shadow-lg">
                        <button
                            onClick={() => toggleMode('signin')}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'signin' ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => toggleMode('signup')}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${mode === 'signup' ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            Cadastro
                        </button>
                    </div>
                )}

                {/* Forms */}
                <form onSubmit={handleAuth} className="space-y-5">
                    
                    {/* Error/Success Messages */}
                    {(error || message) && (
                        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border anim-scale-in backdrop-blur-md ${error ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {error ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                            <span>{error || message}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Email Input - Improved Contrast */}
                        <div className="group">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1 block group-focus-within:text-sky-400 transition-colors">E-mail</label>
                            <div className="relative">
                                <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-sky-400 transition-colors pointer-events-none">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 pl-12 pr-4 py-4 rounded-2xl text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {mode !== 'recovery' && (
                            <div className="group">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1 block group-focus-within:text-sky-400 transition-colors">Senha</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-sky-400 transition-colors pointer-events-none">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 pl-12 pr-12 py-4 rounded-2xl text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all shadow-sm"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-zinc-500 hover:text-white transition-colors p-1">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Smooth Slide Transition for Confirm Password */}
                        <div className={`transition-all duration-500 ease-out-mola overflow-hidden ${mode === 'signup' ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="group pt-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 ml-1 block group-focus-within:text-sky-400 transition-colors">Confirmar Senha</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-sky-400 transition-colors pointer-events-none">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 pl-12 pr-4 py-4 rounded-2xl text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 transition-all shadow-sm"
                                        required={mode === 'signup'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        {mode === 'signin' ? (
                            <button type="button" onClick={() => setMode('recovery')} className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest ml-1">
                                Esqueci a senha
                            </button>
                        ) : mode === 'recovery' && (
                            <button type="button" onClick={() => setMode('signin')} className="text-[10px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest ml-1 flex items-center gap-1">
                                <ArrowLeft className="w-3 h-3" /> Voltar
                            </button>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 mt-6 ${
                            loading ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 
                            'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white'
                        }`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <div key={mode} className="flex items-center gap-2 anim-fade-in">
                                <span>{mode === 'recovery' ? 'Enviar Link' : mode === 'signup' ? 'Criar Conta' : 'Acessar Carteira'}</span>
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
        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest">
             InvestFIIs Cloud &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};