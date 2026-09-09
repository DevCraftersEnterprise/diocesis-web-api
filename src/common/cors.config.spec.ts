import { buildCorsOptions } from './cors.config';

describe('buildCorsOptions', () => {
  it('usa la allowlist cuando hay origenes configurados', () => {
    const opts = buildCorsOptions({
      origins: ['http://localhost:4200', 'https://diocesis.example'],
    });

    expect(opts.origin).toEqual([
      'http://localhost:4200',
      'https://diocesis.example',
    ]);
    expect(opts.credentials).toBe(false);
    expect(opts.allowedHeaders).toContain('Authorization');
    expect(opts.methods).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    );
  });

  it('fail-closed: sin origenes -> origin false (sin CORS)', () => {
    expect(buildCorsOptions({ origins: [] }).origin).toBe(false);
  });
});
