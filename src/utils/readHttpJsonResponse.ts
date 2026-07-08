/** Lê corpo HTTP como JSON sem lançar SyntaxError (502/HTML da CDN, timeout, etc.). */
export async function readHttpJsonResponse<T>(response: Response): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  raw: string;
}> {
  const raw = await response.text();
  if (!raw.trim()) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: response.ok ? 'Resposta vazia do servidor' : `HTTP ${response.status}`,
      raw,
    };
  }

  try {
    const data = JSON.parse(raw) as T;
    if (!response.ok) {
      const errObj = data as { error?: unknown; message?: unknown };
      const msg =
        (typeof errObj?.error === 'string' && errObj.error) ||
        (typeof errObj?.message === 'string' && errObj.message) ||
        `HTTP ${response.status}`;
      return { ok: false, status: response.status, data, error: msg, raw };
    }
    return { ok: true, status: response.status, data, error: null, raw };
  } catch {
    const preview = raw.replace(/\s+/g, ' ').trim().slice(0, 160);
    return {
      ok: false,
      status: response.status,
      data: null,
      error: response.ok
        ? 'Resposta inválida do servidor (não é JSON).'
        : `Erro HTTP ${response.status}${preview ? `: ${preview}` : ''}`,
      raw,
    };
  }
}
