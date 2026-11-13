import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSupabaseProjectUrl } from '../utils/supabaseFunctions';

function chatgptConnectorUrl(subpath: string): string {
  const base = getSupabaseProjectUrl().replace(/\/$/, '');
  const path = subpath.replace(/^\/+/, '');
  return `${base}/functions/v1/chatgpt-connector/${path}`;
}
import { SizeCalculator, type SizeCalculatorData } from './SizeCalculator';
import { CheckCircle, Loader2 } from 'lucide-react';

export function ChatGptConnectPage() {
  const [searchParams] = useSearchParams();
  const oauthState = searchParams.get('oauth_state') || '';
  const [phase, setPhase] = useState<'login' | 'measures' | 'done' | 'error'>('login');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const completeOAuth = useCallback(async () => {
    if (!oauthState) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(chatgptConnectorUrl('oauth/complete'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ state: oauthState }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPhase('error');
        setMessage(body.error || 'Falha ao ligar conta ao ChatGPT.');
        return;
      }
      if (body.redirect_url) {
        window.location.href = body.redirect_url;
        return;
      }
      setPhase('done');
      setMessage('Conta ligada. Pode voltar ao ChatGPT.');
    } catch {
      setPhase('error');
      setMessage('Erro de rede ao completar ligação.');
    } finally {
      setLoading(false);
    }
  }, [oauthState]);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && oauthState) {
        setPhase('measures');
      }
    };
    void run();
  }, [oauthState]);

  const saveMeasurements = async (data: SizeCalculatorData) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setPhase('login');
      return;
    }
    setLoading(true);
    const measurements = {
      gender: data.gender,
      height: data.height,
      weight: data.weight,
      bodyType: data.bodyTypeIndex ?? data.bodyType,
      fit: data.fitIndex ?? data.fit,
      bodyTypeIndex: data.bodyTypeIndex,
      fitIndex: data.fitIndex,
    };
    await fetch(chatgptConnectorUrl('oauth/measurements'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ measurements, locale: 'pt' }),
    }).catch(() => undefined);

    if (oauthState) {
      await completeOAuth();
    } else {
      setPhase('done');
      setMessage('Medidas guardadas na sua conta Omafit.');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }
    setPhase('measures');
    setLoading(false);
  };

  const handleGoogle = async () => {
    const redirectTo = `${window.location.origin}/chatgpt/connect${
      oauthState ? `?oauth_state=${encodeURIComponent(oauthState)}` : ''
    }`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Omafit × ChatGPT</h1>
        <p className="text-sm text-gray-600 mb-6">
          Crie ou entre na sua conta de comprador para recomendar tamanhos em lojas parceiras.
        </p>

        {phase === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
            {message && <p className="text-sm text-red-600">{message}</p>}
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#810707] text-white py-2 rounded-lg disabled:opacity-50"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => void handleGoogle()}
              className="w-full border py-2 rounded-lg text-sm"
            >
              Continuar com Google
            </button>
          </form>
        )}

        {phase === 'measures' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading && (
              <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                A ligar ao ChatGPT…
              </div>
            )}
            <SizeCalculator
              onComplete={saveMeasurements}
              onBack={() => setPhase('login')}
            />
          </div>
        )}

        {phase === 'done' && (
          <div className="flex items-start gap-3 bg-white p-6 rounded-xl border">
            <CheckCircle className="text-green-600 shrink-0" />
            <p className="text-sm text-gray-800">{message}</p>
          </div>
        )}

        {phase === 'error' && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">{message}</p>
        )}
      </div>
    </div>
  );
}
