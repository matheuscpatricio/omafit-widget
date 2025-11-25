import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, User, AlertCircle, Chrome, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function AuthForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = searchParams.get('mode') === 'login';
  const priceId = searchParams.get('priceId');

  const [isLogin, setIsLogin] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { signIn, signUp } = useAuth();

  useEffect(() => {
    const mode = searchParams.get('mode');
    setIsLogin(mode === 'login');
  }, [searchParams]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateEmail(email)) {
      setError('Por favor, insira um email válido');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    if (!isLogin && name.length < 3) {
      setError('O nome deve ter no mínimo 3 caracteres');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Email ou senha incorretos. Verifique suas credenciais.');
          } else if (error.message.includes('Email not confirmed')) {
            setError('Email não confirmado. Verifique sua caixa de entrada.');
          } else if (error.message.includes('Email rate limit exceeded')) {
            setError('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
          } else {
            setError(`Erro ao fazer login: ${error.message}`);
          }
        } else {
          setSuccess('Login realizado com sucesso! Redirecionando...');
          setTimeout(() => navigate('/dashboard'), 1500);
        }
      } else {
        const { data, error } = await signUp(name, email, password);

        if (error) {
          if (error.message.includes('User already registered')) {
            setError('Este email já está cadastrado. Faça login para acessar sua conta.');
            setTimeout(() => {
              setIsLogin(true);
              setError('');
            }, 3000);
          } else if (error.message.includes('Password should be at least 6 characters')) {
            setError('A senha deve ter pelo menos 6 caracteres.');
          } else {
            setError(`Erro ao criar conta: ${error.message}`);
          }
        } else if (data.user) {
          if (priceId) {
            setSuccess('Conta criada com sucesso! Redirecionando para pagamento...');
            localStorage.setItem('pending_subscription_priceId', priceId);
            setTimeout(() => navigate('/pricing'), 2000);
          } else {
            setSuccess('Conta criada com sucesso! Redirecionando para escolher seu plano...');
            setTimeout(() => navigate('/pricing'), 2000);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      setError(`Erro inesperado: ${err.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        setError('Erro ao fazer login com Google. Tente novamente.');
      }
    } catch (err) {
      console.error('Google OAuth catch error:', err);
      setError('Erro ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#810707] via-red-700 to-red-900 flex items-center justify-center p-4">
      <div className="absolute top-6 left-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white hover:text-red-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Voltar</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 sm:p-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-[#810707] to-red-700 text-white rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
          </h1>
          <p className="text-gray-600">
            {isLogin
              ? 'Acesse sua conta para continuar'
              : 'Escolha seu plano e comece agora'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
                <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nome da loja
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#810707] focus:border-[#810707] transition-all outline-none text-gray-900"
                placeholder="Nome da sua loja"
              />
            </div>
          </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#810707] focus:border-[#810707] transition-all outline-none text-gray-900"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#810707] focus:border-[#810707] transition-all outline-none text-gray-900"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-gray-500 mt-2">
                Mínimo de 6 caracteres
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-shake">
              <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle className="text-green-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-green-700 text-sm font-medium">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#810707] to-red-700 text-white py-4 rounded-xl font-semibold text-lg hover:from-red-800 hover:to-red-900 focus:ring-4 focus:ring-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                Carregando...
              </span>
            ) : (
              isLogin ? 'Entrar na Conta' : 'Criar Conta'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">ou continue com</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-5 w-full bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm hover:shadow"
          >
            <Chrome className="w-5 h-5 text-red-500" />
            Google
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            type="button"
            className="text-[#810707] hover:text-red-800 font-semibold transition-colors"
          >
            {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </button>
        </div>

      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
