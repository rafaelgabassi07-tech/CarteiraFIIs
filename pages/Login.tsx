import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, Wallet, Eye, EyeOff, Sparkles, TrendingUp, KeyRound, ArrowLeft, MailCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false); // Novo estado para tela de verificação
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Efeito de paralisia suave no background
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
    // Não limpamos o e-mail aqui se for para mostrar na tela de verificação
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isRecovery) {
        // Lógica de Recuperação de Senha
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, 
        });
        if (error) throw error;
        setMessage('Enviamos um link de recuperação para o seu e-mail.');
        // Mantemos na tela de recuperação ou voltamos pro login, opcional. 
        // Aqui vou manter a msg visivel na tela de recuperação por enquanto ou voltar pro login:
        setTimeout(() => { setIsRecovery(false); setMessage('Verifique seu e-mail para redefinir a senha.'); }, 2000);

      } else if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        // SUCESSO NO CADASTRO -> Vai para tela de verificação
        setIsVerificationSent(true);
        resetForm();

      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // O redirecionamento é automático via listener no App.tsx
      }
    } catch (err: any) {
      // Tratamento de mensagens de erro comuns
      let msg = err.message;
      if (msg === 'Invalid login credentials') msg = 'E-mail ou senha incorretos.';
      if (msg.includes('rate limit')) msg = 'Muitas tentativas. Tente novamente mais tarde.';
      if (msg.includes('already registered')) msg = 'Este e-mail já está cadastrado.';
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Animated Blobs */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${mousePos.x * -1}px, ${mousePos.y * -1}px)` }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />

      {/* --- Main Content --- */}
      <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-6">
        
        {/* Header Branding */}
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
          <p className="text-sm text-slate-400 font-medium tracking-wide">Cloud Only • FIIs & Ações</p>
        </div>

        {/* Card Principal */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-1 shadow-2xl anim-fade-in-up is-visible" style={{ animationDelay: '100ms' }}>
          
          <div className="bg-[#0b1121]/50 rounded-[2.25rem] p-6 sm:p-8 border border-white/5">
            
            {/* TELA DE VERIFICAÇÃO DE E-MAIL */}
            {isVerificationSent ? (
                <div className="text-center py-4">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 ring-4 ring-emerald-500/5 animate-pulse">
                        <MailCheck className="w-10 h-10" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">Confirme seu E-mail</h2>
                    <p className="text-sm text-slate-400 leading-relaxed mb-6">
                        Enviamos um link de confirmação para:<br/>
                        <span className="text-white font-semibold block mt-1 bg-white/5 py-1 px-3 rounded-lg mx-auto w-fit">{email}</span>
                    </p>
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-8">
                        <p className="text-xs text-amber-500 font-medium">
                            ⚠️ Você precisa clicar no link enviado para ativar sua conta antes de entrar. Verifique também sua caixa de Spam.
                        </p>
                    </div>
                    <button 
                        onClick={handleBackToLogin}
                        className="w-full py-3.5 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-[0.15em] active:scale-95 transition-all hover:bg-slate-200 dark:hover:bg-white/20 flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar para Login
                    </button>
                </div>
            ) : (
                /* FORMULÁRIO PADRÃO DE LOGIN/SIGNUP/RECOVERY */
                <>
                    {/* Toggle Switch / Recovery Header */}
                    {!isRecovery ? (
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
                    ) : (
                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-2xl text-indigo-400 mb-3">
                                <KeyRound className="w-6 h-6" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1">Recuperar Acesso</h3>
                            <p className="text-xs text-slate-400">Enviaremos as instruções para seu e-mail.</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-4">
                        {/* Feedback Messages */}
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

                        {/* Inputs */}
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

                            {!isRecovery && (
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
                                        required={!isRecovery}
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
                            )}

                            {!isSignUp && !isRecovery && (
                                <div className="flex justify-end -mt-1">
                                    <button 
                                        type="button" 
                                        onClick={() => { setIsRecovery(true); setError(null); setMessage(null); }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
                                    >
                                        Esqueci minha senha
                                    </button>
                                </div>
                            )}

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

                        <div className="pt-2 flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full relative overflow-hidden bg-white text-slate-950 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-white/5 hover:shadow-white/10 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                        {isRecovery ? 'Enviar Link' : isSignUp ? 'Cadastrar' : 'Acessar App'} 
                                        {!loading && !isRecovery && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                        </>
                                    )}
                                </span>
                                {/* Shine Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-slate-200/50 to-transparent z-0"></div>
                            </button>

                            {isRecovery && (
                                <button
                                    type="button"
                                    onClick={handleBackToLogin}
                                    className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-[0.1em] text-slate-400 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="w-3 h-3" /> Voltar ao Login
                                </button>
                            )}
                        </div>
                    </form>
                </>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-6 anim-fade-in-up is-visible" style={{ animationDelay: '200ms' }}>
            <p className="text-[10px] font-medium text-slate-600">
                &copy; 2025 InvestFIIs • Cloud Native
            </p>
        </div>

      </div>
    </div>
  );
};