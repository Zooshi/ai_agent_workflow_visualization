import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from './useWorkflow';
import * as client from '../api/client';

vi.mock('../api/client');

describe('useWorkflow', () => {
  const fakeWorkflow = {
    description: 'An agentic pipeline.',
    nodes: [{ id: '1', type: 'agent', label: 'Agent', detail: 'Does research.', position: { x: 0, y: 0 } }],
    edges: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('starts with empty state', () => {
    const { result } = renderHook(() => useWorkflow());
    expect(result.current.nodes).toEqual([]);
    expect(result.current.edges).toEqual([]);
    expect(result.current.description).toBe('');
    expect(result.current.history).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('submits prompt and updates workflow state', async () => {
    client.optimizeWorkflow.mockResolvedValue(fakeWorkflow);
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.submitPrompt('Optimize my email triage');
    });

    expect(result.current.nodes).toEqual(fakeWorkflow.nodes);
    expect(result.current.edges).toEqual(fakeWorkflow.edges);
    expect(result.current.description).toBe(fakeWorkflow.description);
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].prompt).toBe('Optimize my email triage');
  });

  test('sets loading true during request', async () => {
    let resolve;
    client.optimizeWorkflow.mockReturnValue(new Promise(r => { resolve = r; }));
    const { result } = renderHook(() => useWorkflow());

    act(() => { result.current.submitPrompt('test'); });
    expect(result.current.loading).toBe(true);

    await act(async () => { resolve(fakeWorkflow); });
    expect(result.current.loading).toBe(false);
  });

  test('sets error on API failure', async () => {
    client.optimizeWorkflow.mockRejectedValue(new Error('OpenAI failed'));
    const { result } = renderHook(() => useWorkflow());

    await act(async () => {
      await result.current.submitPrompt('test');
    });

    expect(result.current.error).toBe('OpenAI failed');
    expect(result.current.loading).toBe(false);
  });

  test('passes previousWorkflow on follow-up', async () => {
    client.optimizeWorkflow.mockResolvedValue(fakeWorkflow);
    const { result } = renderHook(() => useWorkflow());

    await act(async () => { await result.current.submitPrompt('First prompt'); });
    await act(async () => { await result.current.submitPrompt('Add a memory step'); });

    expect(client.optimizeWorkflow).toHaveBeenCalledWith('Add a memory step', fakeWorkflow);
  });
});
