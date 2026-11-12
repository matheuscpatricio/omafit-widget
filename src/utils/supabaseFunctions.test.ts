import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getSupabaseFunctionUrl,
  getSupabaseProjectUrl,
  isHtmlLikeHttpBody,
  OMAFIT_SUPABASE_URL_FALLBACK,
} from './supabaseFunctions';

describe('supabaseFunctions', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.stubGlobal('import', { meta: { env: { ...originalEnv } } });
  });

  afterEach(() => {
    Object.assign(import.meta.env, originalEnv);
  });

  it('falls back to known project url when env is missing', () => {
    import.meta.env.VITE_SUPABASE_URL = '';
    expect(getSupabaseProjectUrl()).toBe(OMAFIT_SUPABASE_URL_FALLBACK);
  });

  it('builds function urls from project url', () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://example.supabase.co/';
    expect(getSupabaseFunctionUrl('tryon')).toBe('https://example.supabase.co/functions/v1/tryon');
    expect(getSupabaseFunctionUrl('tryon-status', 'abc-123')).toBe(
      'https://example.supabase.co/functions/v1/tryon-status/abc-123',
    );
  });

  it('detects html error bodies', () => {
    expect(isHtmlLikeHttpBody('<!DOCTYPE html><html><title>Page not found')).toBe(true);
    expect(isHtmlLikeHttpBody('{"error":"x"}')).toBe(false);
  });
});
