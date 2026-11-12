import { describe, expect, it } from 'vitest';
import { readHttpJsonResponse } from './readHttpJsonResponse';

describe('readHttpJsonResponse', () => {
  it('sanitizes html 404 bodies', async () => {
    const response = new Response('<!DOCTYPE html><html><title>Page not found</title></html>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
    const parsed = await readHttpJsonResponse(response);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe('Erro HTTP 404');
    expect(parsed.error).not.toContain('<!DOCTYPE');
  });
});
