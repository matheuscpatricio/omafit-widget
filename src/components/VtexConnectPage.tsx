import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type LinkResult = {
  shop_domain: string;
  account_name: string;
  public_id: string | null;
  charts_stamped: number;
  subscription_status: string;
  needs_widget_key: boolean;
};

type StoreLinkRow = {
  shop_domain: string;
  account_name: string;
  public_id: string | null;
};

export function VtexConnectPage() {
  const { user } = useAuth();
  const [account, setAccount] = useState('');
  const [current, setCurrent] = useState<StoreLinkRow | null>(null);
  const [publicId, setPublicId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<LinkResult | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: link }, { data: key }] = await Promise.all([
        supabase
          .from('store_links')
          .select('shop_domain, account_name, public_id')
          .eq('user_id', user.id)
          .eq('platform', 'vtex')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('widget_keys')
          .select('public_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (link) {
        setCurrent(link as StoreLinkRow);
        setAccount(link.account_name || '');
      }
      setPublicId(String(key?.public_id || link?.public_id || ''));
      setLoading(false);
    };
    void load();
  }, [user]);

  const connect = async () => {
    setSaving(true);
    setError('');
    setResult(null);
    const { data, error: rpcError } = await supabase.rpc('link_vtex_store', {
      p_account: account.trim(),
    });
    setSaving(false);
    if (rpcError) {
      const message = rpcError.message || '';
      if (message.includes('invalid_account')) {
        setError('Use só o nome da conta VTEX, em minúsculas, sem .myvtex.com.');
      } else if (message.includes('vtex_account_taken')) {
        setError('Essa conta VTEX já está ligada a outro usuário Omafit.');
      } else if (message.includes('not_authenticated')) {
        setError('Entre de novo na sua conta Omafit.');
      } else {
        setError(message || 'Não foi possível ligar a loja. Aplique a migration link_vtex_store no Supabase.');
      }
      return;
    }
    const linked = data as LinkResult;
    setResult(linked);
    setCurrent({
      shop_domain: linked.shop_domain,
      account_name: linked.account_name,
      public_id: linked.public_id,
    });
    if (linked.public_id) setPublicId(linked.public_id);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Loja VTEX</h1>
        <p className="mt-2 text-slate-600">
          Liga a conta VTEX a esta conta Omafit, à chave do widget e à assinatura. A tabela de
          medidas criada aqui passa a valer para <span className="font-mono">conta.myvtex.com</span>.
        </p>
      </div>

      {loading ? <p className="text-slate-500">Carregando…</p> : null}

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Nome da conta VTEX</span>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          value={account}
          placeholder="minhaloja"
          onChange={(event) => setAccount(event.target.value)}
        />
        <span className="text-sm text-slate-500">
          Sem https e sem .myvtex.com. O identificador enviado à loja será {account.trim() || 'conta'}.myvtex.com.
        </span>
      </label>

      <button
        type="button"
        className="rounded-md bg-[#810707] px-4 py-2 text-white disabled:opacity-50"
        disabled={saving || !account.trim()}
        onClick={() => void connect()}
      >
        {saving ? 'Ligando…' : 'Ligar loja VTEX'}
      </button>

      {error ? <p className="text-red-700">{error}</p> : null}

      {current ? (
        <div className="rounded-md border border-slate-200 p-4 space-y-2 text-sm">
          <p>
            Loja ligada: <span className="font-mono">{current.shop_domain}</span>
          </p>
          <p>
            ID público para colar no Admin VTEX:{' '}
            <span className="font-mono">{publicId || 'ainda não gerado'}</span>
          </p>
          {!publicId ? (
            <p>Abra o Gerador de Widget, crie a chave e volte aqui para ligar de novo.</p>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-md bg-slate-50 p-4 text-sm space-y-1">
          <p>{result.charts_stamped} tabela(s) de medidas marcada(s) com esse domínio.</p>
          <p>
            Assinatura:{' '}
            {result.subscription_status === 'active'
              ? 'ativa. O provador e o consultor usam esse plano.'
              : 'não encontrada. Ative um plano em Configurações da Conta antes de abrir o widget na loja.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
