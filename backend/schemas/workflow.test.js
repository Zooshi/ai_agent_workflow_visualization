const { WorkflowSchema } = require('./workflow');

describe('WorkflowSchema', () => {
  const validWorkflow = {
    description: 'An optimized agentic workflow.',
    nodes: [
      { id: '1', type: 'trigger', label: 'Start', position: { x: 0, y: 0 } },
      { id: '2', type: 'agent', label: 'Research Agent', position: { x: 0, y: 120 } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: 'triggers' },
    ],
    stepDetails: {
      '1': 'Entry point triggered by the user.',
      '2': 'Performs research using web search tools.',
    },
  };

  test('accepts valid workflow', () => {
    const result = WorkflowSchema.safeParse(validWorkflow);
    expect(result.success).toBe(true);
  });

  test('rejects unknown node type', () => {
    const bad = {
      ...validWorkflow,
      nodes: [{ id: '1', type: 'unknown', label: 'X', position: { x: 0, y: 0 } }],
    };
    const result = WorkflowSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  test('rejects missing description', () => {
    const { description, ...bad } = validWorkflow;
    const result = WorkflowSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  test('edge label can be null', () => {
    const workflow = {
      ...validWorkflow,
      edges: [{ id: 'e1-2', source: '1', target: '2', label: null }],
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });
});
