const request = require('supertest');
const express = require('express');

// Mock OpenAI before requiring the route
jest.mock('openai', () => {
  const mockParse = jest.fn();
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: { completions: { parse: mockParse } },
  }));
  MockOpenAI.__mockParse = mockParse;
  return { default: MockOpenAI, __mockParse: mockParse };
});

// Mock openai/helpers/zod (zodResponseFormat just returns its first arg for tests)
jest.mock('openai/helpers/zod', () => ({
  zodResponseFormat: (schema, name) => ({ schema, name }),
}));

const optimizeRouter = require('./optimize');

const app = express();
app.use(express.json());
app.use('/api/optimize', optimizeRouter);

const mockWorkflow = {
  description: 'An agentic pipeline.',
  nodes: [{ id: '1', type: 'agent', label: 'Agent', position: { x: 0, y: 0 } }],
  edges: [],
  stepDetails: { '1': 'Does research.' },
};

beforeEach(() => {
  const openai = require('openai');
  openai.__mockParse.mockResolvedValue({
    choices: [{ message: { parsed: mockWorkflow } }],
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/optimize', () => {
  test('returns workflow for valid prompt', async () => {
    const res = await request(app)
      .post('/api/optimize')
      .send({ prompt: 'Optimize my email triage process' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      description: expect.any(String),
      nodes: expect.any(Array),
      edges: expect.any(Array),
      stepDetails: expect.any(Object),
    });
  });

  test('returns 400 for missing prompt', async () => {
    const res = await request(app)
      .post('/api/optimize')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 for empty prompt', async () => {
    const res = await request(app)
      .post('/api/optimize')
      .send({ prompt: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('passes previousWorkflow in user message when provided', async () => {
    const openai = require('openai');
    await request(app)
      .post('/api/optimize')
      .send({ prompt: 'Add a memory step', previousWorkflow: mockWorkflow });

    const callArgs = openai.__mockParse.mock.calls[0][0];
    const userMsg = callArgs.messages.find(m => m.role === 'user');
    expect(userMsg.content).toContain('Previous workflow:');
  });

  test('returns 422 when parsed is null', async () => {
    const openai = require('openai');
    openai.__mockParse.mockResolvedValue({
      choices: [{ message: { parsed: null } }],
    });

    const res = await request(app)
      .post('/api/optimize')
      .send({ prompt: 'Some prompt' });

    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SCHEMA_REFUSAL');
  });
});
