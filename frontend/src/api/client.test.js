import { optimizeWorkflow } from './client';

describe('optimizeWorkflow', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test('sends POST with prompt and returns parsed JSON', async () => {
    const fakeWorkflow = { description: 'test', nodes: [], edges: [], stepDetails: {} };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => fakeWorkflow,
    });

    const result = await optimizeWorkflow('Optimize my hiring process');
    expect(result).toEqual(fakeWorkflow);
    expect(global.fetch).toHaveBeenCalledWith('/api/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Optimize my hiring process', previousWorkflow: undefined }),
    });
  });

  test('throws error on non-ok response', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Something went wrong', code: 'OPENAI_ERROR' }),
    });

    await expect(optimizeWorkflow('test')).rejects.toThrow('Something went wrong');
  });
});
