# GenAI Workflow Optimizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React + Express app where users describe workflows and receive AI-optimized agentic versions as interactive ReactFlow diagrams.

**Architecture:** Express backend (CommonJS) proxies OpenAI calls server-side using Zod structured output; React + Vite frontend renders interactive ReactFlow diagrams with color-coded nodes, click-for-details panel, and PNG/MD downloads.

**Tech Stack:** Node.js 20, Express 4, OpenAI Node SDK v4, Zod v3, React 18, Vite 5, @xyflow/react (ReactFlow v12), html-to-image, Jest + Supertest (backend), Vitest + React Testing Library (frontend)

---

### Task 1: Git init and project scaffold

**Files:**
- Create: `.gitignore`

**Step 1: Initialize git repo**

Run from `C:\Users\danie\OneDrive\Desktop\cur\200226`:
```bash
git init
```

**Step 2: Create .gitignore**

Create `.gitignore`:
```
node_modules/
.env
dist/
.DS_Store
coverage/
```

**Step 3: Commit scaffold**

```bash
git add .gitignore docs/
git commit -m "chore: init repo with gitignore and design docs"
```

---

### Task 2: Backend - package setup

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`

**Step 1: Initialize backend and install deps**

Run from project root:
```bash
mkdir backend && cd backend && npm init -y
npm install express openai zod cors dotenv
npm install --save-dev jest supertest
```

**Step 2: Update backend/package.json scripts and jest config**

In `backend/package.json`, set:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "jest"
  },
  "jest": {
    "testEnvironment": "node"
  }
}
```

**Step 3: Create .env.example**

Create `backend/.env.example`:
```
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5-nano-2025-08-07
PORT=3001
```

**Step 4: Create .env (not committed)**

Copy `.env.example` to `backend/.env` and fill in your real OpenAI API key.

**Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example
git commit -m "chore: initialize backend with express and openai deps"
```

---

### Task 3: Backend - Zod WorkflowSchema

**Files:**
- Create: `backend/schemas/workflow.js`
- Create: `backend/schemas/workflow.test.js`

**Step 1: Write the failing test**

Create `backend/schemas/workflow.test.js`:
```js
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

  test('edge label is optional', () => {
    const workflow = {
      ...validWorkflow,
      edges: [{ id: 'e1-2', source: '1', target: '2' }],
    };
    const result = WorkflowSchema.safeParse(workflow);
    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest schemas/workflow.test.js --no-coverage`
Expected: FAIL with "Cannot find module './workflow'"

**Step 3: Implement the schema**

Create `backend/schemas/workflow.js`:
```js
const { z } = require('zod');

const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'agent', 'tool', 'decision', 'output']),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

const WorkflowSchema = z.object({
  description: z.string(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  stepDetails: z.record(z.string(), z.string()),
});

module.exports = { WorkflowSchema, NodeSchema, EdgeSchema };
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest schemas/workflow.test.js --no-coverage`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add backend/schemas/
git commit -m "feat: add Zod WorkflowSchema with tests"
```

---

### Task 4: Backend - POST /api/optimize route

**Files:**
- Create: `backend/routes/optimize.js`
- Create: `backend/routes/optimize.test.js`

**Step 1: Write the failing tests**

Create `backend/routes/optimize.test.js`:
```js
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest routes/optimize.test.js --no-coverage`
Expected: FAIL with "Cannot find module './optimize'"

**Step 3: Implement the route**

Create `backend/routes/optimize.js`:
```js
const express = require('express');
const OpenAI = require('openai').default;
const { zodResponseFormat } = require('openai/helpers/zod');
const { WorkflowSchema } = require('../schemas/workflow');

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert AI systems architect. Your job is to analyze workflows and redesign them as modern agentic AI pipelines.

Given a workflow description, produce a structured workflow with:
- A 2-4 paragraph description of the optimized agentic workflow
- Nodes representing each step (use types: trigger, agent, tool, decision, output)
- Edges showing the flow between steps with descriptive labels
- stepDetails: for each node ID, a detailed explanation of what it does, what AI agent or tool powers it, and its inputs and outputs

Position nodes in a top-to-bottom DAG layout with y increments of 120px per level. Multiple nodes at the same level share the same y value, spaced 200px apart on the x axis.

If the legacy workflow should be fully replaced with a better agentic approach, say so clearly in the description and propose the new workflow.`;

router.post('/', async (req, res) => {
  const { prompt, previousWorkflow } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required', code: 'INVALID_INPUT' });
  }

  let userContent = `Workflow to optimize:\n${prompt.trim()}`;
  if (previousWorkflow) {
    userContent = `Previous workflow:\n${JSON.stringify(previousWorkflow, null, 2)}\n\nUser adjustment request:\n${prompt.trim()}`;
  }

  try {
    const completion = await client.chat.completions.parse({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: zodResponseFormat(WorkflowSchema, 'workflow'),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      return res.status(422).json({
        error: 'Model could not generate a valid workflow. Try rephrasing your prompt.',
        code: 'SCHEMA_REFUSAL',
      });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(502).json({
      error: 'Failed to reach the AI service. Please try again.',
      code: 'OPENAI_ERROR',
    });
  }
});

module.exports = router;
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest routes/optimize.test.js --no-coverage`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add backend/routes/
git commit -m "feat: add POST /api/optimize route with OpenAI structured output"
```

---

### Task 5: Backend - Express server

**Files:**
- Create: `backend/server.js`

**Step 1: Create server.js**

Create `backend/server.js`:
```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const optimizeRouter = require('./routes/optimize');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/optimize', optimizeRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

module.exports = app;
```

**Step 2: Verify server starts**

Run: `cd backend && node server.js`
Expected: "Backend running on http://localhost:3001"
Stop with Ctrl+C.

**Step 3: Run all backend tests**

Run: `cd backend && npx jest --no-coverage`
Expected: All 9 tests PASS

**Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: add express server entrypoint"
```

---

### Task 6: Frontend - Vite React setup

**Files:**
- Create: `frontend/` (Vite scaffold)

**Step 1: Scaffold Vite React app**

Run from project root:
```bash
npm create vite@latest frontend -- --template react
cd frontend && npm install
npm install @xyflow/react html-to-image
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Replace frontend/vite.config.js**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    globals: true,
  },
});
```

**Step 3: Create test setup file**

Create `frontend/src/test-setup.js`:
```js
import '@testing-library/jest-dom';
```

**Step 4: Update frontend/package.json scripts**

Add to scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Step 5: Clean up Vite boilerplate**

- Delete: `frontend/src/App.css`
- Delete: `frontend/src/assets/react.svg`
- Delete: `frontend/public/vite.svg`

Replace `frontend/src/index.css` with:
```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f13; color: #e8e8e8; }
```

**Step 6: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold React frontend with Vite, ReactFlow, and Vitest"
```

---

### Task 7: Frontend - API client

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/api/client.test.js`

**Step 1: Write the failing test**

Create `frontend/src/api/client.test.js`:
```js
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
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/api/client.test.js`
Expected: FAIL with "Cannot find module './client'"

**Step 3: Implement the client**

Create `frontend/src/api/client.js`:
```js
export async function optimizeWorkflow(prompt, previousWorkflow) {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, previousWorkflow }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }
  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/api/client.test.js`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add frontend/src/api/
git commit -m "feat: add API client with optimizeWorkflow"
```

---

### Task 8: Frontend - useWorkflow hook

**Files:**
- Create: `frontend/src/hooks/useWorkflow.js`
- Create: `frontend/src/hooks/useWorkflow.test.js`

**Step 1: Write the failing test**

Create `frontend/src/hooks/useWorkflow.test.js`:
```js
import { renderHook, act } from '@testing-library/react';
import { useWorkflow } from './useWorkflow';
import * as client from '../api/client';

vi.mock('../api/client');

describe('useWorkflow', () => {
  const fakeWorkflow = {
    description: 'An agentic pipeline.',
    nodes: [{ id: '1', type: 'agent', label: 'Agent', position: { x: 0, y: 0 } }],
    edges: [],
    stepDetails: { '1': 'Does research.' },
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
```

**Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useWorkflow.test.js`
Expected: FAIL with "Cannot find module './useWorkflow'"

**Step 3: Implement the hook**

Create `frontend/src/hooks/useWorkflow.js`:
```js
import { useState, useCallback } from 'react';
import { optimizeWorkflow } from '../api/client';

export function useWorkflow() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [description, setDescription] = useState('');
  const [stepDetails, setStepDetails] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentWorkflow, setCurrentWorkflow] = useState(null);

  const submitPrompt = useCallback(async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      const workflow = await optimizeWorkflow(prompt, currentWorkflow);
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setDescription(workflow.description);
      setStepDetails(workflow.stepDetails);
      setCurrentWorkflow(workflow);
      setHistory(prev => [...prev, { prompt, workflow }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentWorkflow]);

  return { nodes, edges, description, stepDetails, history, loading, error, submitPrompt };
}
```

**Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useWorkflow.test.js`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: add useWorkflow hook with state management"
```

---

### Task 9: Frontend - Custom ReactFlow node component

**Files:**
- Create: `frontend/src/components/WorkflowNode.jsx`
- Create: `frontend/src/components/WorkflowNode.css`

**Step 1: Create WorkflowNode.jsx**

Create `frontend/src/components/WorkflowNode.jsx`:
```jsx
import { Handle, Position } from '@xyflow/react';
import './WorkflowNode.css';

const TYPE_CONFIG = {
  trigger:  { color: '#3b82f6', label: 'TRIGGER' },
  agent:    { color: '#8b5cf6', label: 'AGENT' },
  tool:     { color: '#10b981', label: 'TOOL' },
  decision: { color: '#f59e0b', label: 'DECISION' },
  output:   { color: '#6b7280', label: 'OUTPUT' },
};

export function WorkflowNode({ data, selected }) {
  const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.agent;

  return (
    <div
      className={`workflow-node ${selected ? 'workflow-node--selected' : ''}`}
      style={{ '--node-color': config.color }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="workflow-node__badge" style={{ background: config.color }}>
        {config.label}
      </div>
      <div className="workflow-node__label">{data.label}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Step 2: Create WorkflowNode.css**

Create `frontend/src/components/WorkflowNode.css`:
```css
.workflow-node {
  background: #1e1e2e;
  border: 2px solid var(--node-color);
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 160px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.workflow-node--selected,
.workflow-node:hover {
  box-shadow: 0 0 0 2px var(--node-color), 0 4px 24px rgba(0,0,0,0.4);
}

.workflow-node__badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 6px;
}

.workflow-node__label {
  font-size: 13px;
  font-weight: 500;
  color: #e8e8e8;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/WorkflowNode.jsx frontend/src/components/WorkflowNode.css
git commit -m "feat: add color-coded WorkflowNode component for ReactFlow"
```

---

### Task 10: Frontend - WorkflowCanvas component

**Files:**
- Create: `frontend/src/components/WorkflowCanvas.jsx`
- Create: `frontend/src/components/WorkflowCanvas.css`

**Step 1: Create WorkflowCanvas.jsx**

Create `frontend/src/components/WorkflowCanvas.jsx`:
```jsx
import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode } from './WorkflowNode';
import './WorkflowCanvas.css';

const nodeTypes = { workflowNode: WorkflowNode };

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#555', strokeDasharray: '5 5' },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#555' },
};

function mapNodes(nodes) {
  return nodes.map(n => ({
    id: n.id,
    type: 'workflowNode',
    position: n.position,
    data: { label: n.label, type: n.type },
  }));
}

function mapEdges(edges) {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    ...defaultEdgeOptions,
  }));
}

function Canvas({ nodes, edges, onNodeClick, canvasRef }) {
  const rfNodes = mapNodes(nodes);
  const rfEdges = mapEdges(edges);

  const handleNodeClick = useCallback((_, node) => {
    onNodeClick(node.id);
  }, [onNodeClick]);

  return (
    <div ref={canvasRef} className="workflow-canvas">
      {nodes.length === 0 ? (
        <div className="workflow-canvas__empty">
          Describe a workflow in the prompt panel to generate a diagram.
        </div>
      ) : (
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#2a2a3e" gap={20} />
          <Controls />
          <MiniMap nodeColor="#8b5cf6" maskColor="rgba(0,0,0,0.5)" />
        </ReactFlow>
      )}
    </div>
  );
}

export function WorkflowCanvas({ nodes, edges, onNodeClick, canvasRef }) {
  return (
    <ReactFlowProvider>
      <Canvas nodes={nodes} edges={edges} onNodeClick={onNodeClick} canvasRef={canvasRef} />
    </ReactFlowProvider>
  );
}
```

**Step 2: Create WorkflowCanvas.css**

Create `frontend/src/components/WorkflowCanvas.css`:
```css
.workflow-canvas {
  width: 100%;
  height: 100%;
  background: #0f0f13;
  position: relative;
}

.workflow-canvas__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 15px;
  text-align: center;
  padding: 2rem;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/WorkflowCanvas.jsx frontend/src/components/WorkflowCanvas.css
git commit -m "feat: add WorkflowCanvas with ReactFlow, minimap, and node click"
```

---

### Task 11: Frontend - PromptPanel component

**Files:**
- Create: `frontend/src/components/PromptPanel.jsx`
- Create: `frontend/src/components/PromptPanel.css`

**Step 1: Create PromptPanel.jsx**

Create `frontend/src/components/PromptPanel.jsx`:
```jsx
import { useState, useRef, useEffect } from 'react';
import './PromptPanel.css';

export function PromptPanel({ history, loading, error, onSubmit }) {
  const [value, setValue] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <aside className="prompt-panel">
      <div className="prompt-panel__history">
        {history.length === 0 && (
          <p className="prompt-panel__hint">
            Describe your current workflow and the AI will propose an optimized agentic version.
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i}>
            <div className="prompt-panel__msg prompt-panel__msg--user">
              {entry.prompt}
            </div>
            <div className="prompt-panel__msg prompt-panel__msg--ai">
              {entry.workflow.description}
            </div>
          </div>
        ))}
        {loading && (
          <div className="prompt-panel__msg prompt-panel__msg--ai prompt-panel__msg--loading">
            Analyzing workflow...
          </div>
        )}
        {error && (
          <div className="prompt-panel__error">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="prompt-panel__form" onSubmit={handleSubmit}>
        <textarea
          className="prompt-panel__input"
          placeholder={history.length === 0 ? 'Describe your workflow...' : 'Refine or adjust...'}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
          disabled={loading}
          rows={3}
        />
        <button
          className="prompt-panel__send"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </aside>
  );
}
```

**Step 2: Create PromptPanel.css**

Create `frontend/src/components/PromptPanel.css`:
```css
.prompt-panel {
  width: 280px;
  min-width: 280px;
  background: #16161f;
  border-right: 1px solid #2a2a3e;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.prompt-panel__history {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prompt-panel__hint {
  color: #555;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.prompt-panel__msg {
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.prompt-panel__msg--user {
  background: #1e1e4a;
  border: 1px solid #3a3a6a;
  color: #c0c0e8;
  align-self: flex-end;
  max-width: 90%;
}

.prompt-panel__msg--ai {
  background: #1e2a1e;
  border: 1px solid #2a4a2a;
  color: #c0e8c0;
}

.prompt-panel__msg--loading {
  color: #888;
  font-style: italic;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.prompt-panel__error {
  background: #2a1a1a;
  border: 1px solid #5a2a2a;
  color: #f87171;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
}

.prompt-panel__form {
  padding: 12px;
  border-top: 1px solid #2a2a3e;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-panel__input {
  background: #0f0f13;
  border: 1px solid #2a2a3e;
  border-radius: 6px;
  color: #e8e8e8;
  font-size: 13px;
  padding: 8px 10px;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}

.prompt-panel__input:focus {
  outline: none;
  border-color: #8b5cf6;
}

.prompt-panel__send {
  background: #8b5cf6;
  border: none;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  padding: 8px;
  transition: background 0.2s;
}

.prompt-panel__send:hover:not(:disabled) { background: #7c3aed; }
.prompt-panel__send:disabled { background: #4a4a6a; cursor: not-allowed; }
```

**Step 3: Commit**

```bash
git add frontend/src/components/PromptPanel.jsx frontend/src/components/PromptPanel.css
git commit -m "feat: add PromptPanel with chat history and text input"
```

---

### Task 12: Frontend - NodeDetailPanel component

**Files:**
- Create: `frontend/src/components/NodeDetailPanel.jsx`
- Create: `frontend/src/components/NodeDetailPanel.css`

**Step 1: Create NodeDetailPanel.jsx**

Create `frontend/src/components/NodeDetailPanel.jsx`:
```jsx
import './NodeDetailPanel.css';

const TYPE_LABELS = {
  trigger:  'Trigger',
  agent:    'AI Agent',
  tool:     'Tool',
  decision: 'Decision',
  output:   'Output',
};

export function NodeDetailPanel({ node, detail, onClose }) {
  if (!node) return null;

  return (
    <aside className="node-detail-panel">
      <div className="node-detail-panel__header">
        <div>
          <div className="node-detail-panel__type">
            {TYPE_LABELS[node.data.type] || node.data.type}
          </div>
          <div className="node-detail-panel__title">{node.data.label}</div>
        </div>
        <button
          className="node-detail-panel__close"
          onClick={onClose}
          aria-label="Close"
        >
          x
        </button>
      </div>
      <div className="node-detail-panel__body">
        {detail ? (
          <p>{detail}</p>
        ) : (
          <p className="node-detail-panel__empty">No details available for this step.</p>
        )}
      </div>
    </aside>
  );
}
```

**Step 2: Create NodeDetailPanel.css**

Create `frontend/src/components/NodeDetailPanel.css`:
```css
.node-detail-panel {
  width: 300px;
  min-width: 300px;
  background: #16161f;
  border-left: 1px solid #2a2a3e;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.node-detail-panel__header {
  padding: 16px;
  border-bottom: 1px solid #2a2a3e;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.node-detail-panel__type {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #8b5cf6;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.node-detail-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e8e8;
}

.node-detail-panel__close {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 16px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.node-detail-panel__close:hover { background: #2a2a3e; color: #e8e8e8; }

.node-detail-panel__body {
  padding: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #b0b0c8;
  overflow-y: auto;
}

.node-detail-panel__empty {
  color: #555;
  font-style: italic;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/NodeDetailPanel.jsx frontend/src/components/NodeDetailPanel.css
git commit -m "feat: add NodeDetailPanel for clicked node info"
```

---

### Task 13: Frontend - Toolbar component

**Files:**
- Create: `frontend/src/components/Toolbar.jsx`
- Create: `frontend/src/components/Toolbar.css`

**Step 1: Create Toolbar.jsx**

Create `frontend/src/components/Toolbar.jsx`:
```jsx
import { toPng } from 'html-to-image';
import './Toolbar.css';

export function Toolbar({ description, canvasRef, hasWorkflow }) {
  async function downloadDiagram() {
    if (!canvasRef.current) return;
    const dataUrl = await toPng(canvasRef.current, { backgroundColor: '#0f0f13' });
    const link = document.createElement('a');
    link.download = 'workflow.png';
    link.href = dataUrl;
    link.click();
  }

  function downloadDescription() {
    if (!description) return;
    const blob = new Blob([description], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'workflow.md';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="toolbar">
      <span className="toolbar__title">GenAI Workflow Optimizer</span>
      <div className="toolbar__actions">
        <button
          className="toolbar__btn"
          onClick={downloadDiagram}
          disabled={!hasWorkflow}
          title="Download diagram as PNG"
        >
          Download Diagram
        </button>
        <button
          className="toolbar__btn"
          onClick={downloadDescription}
          disabled={!hasWorkflow}
          title="Download description as Markdown"
        >
          Download Description
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create Toolbar.css**

Create `frontend/src/components/Toolbar.css`:
```css
.toolbar {
  height: 52px;
  background: #16161f;
  border-bottom: 1px solid #2a2a3e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.toolbar__title {
  font-size: 15px;
  font-weight: 700;
  color: #e8e8e8;
  letter-spacing: 0.02em;
}

.toolbar__actions {
  display: flex;
  gap: 8px;
}

.toolbar__btn {
  background: #1e1e2e;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  color: #c0c0e8;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 14px;
  transition: all 0.2s;
}

.toolbar__btn:hover:not(:disabled) {
  background: #2a2a4a;
  border-color: #8b5cf6;
  color: #e8e8ff;
}

.toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

**Step 3: Commit**

```bash
git add frontend/src/components/Toolbar.jsx frontend/src/components/Toolbar.css
git commit -m "feat: add Toolbar with PNG and Markdown download"
```

---

### Task 14: Frontend - App.jsx wiring

**Files:**
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/App.css`

**Step 1: Replace App.jsx contents**

Replace all contents of `frontend/src/App.jsx`:
```jsx
import { useRef, useState } from 'react';
import { useWorkflow } from './hooks/useWorkflow';
import { PromptPanel } from './components/PromptPanel';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodeDetailPanel } from './components/NodeDetailPanel';
import { Toolbar } from './components/Toolbar';
import './App.css';

export default function App() {
  const {
    nodes, edges, description, stepDetails,
    history, loading, error, submitPrompt,
  } = useWorkflow();

  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const canvasRef = useRef(null);

  const rawNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNode = rawNode
    ? { id: rawNode.id, data: { label: rawNode.label, type: rawNode.type } }
    : null;

  function handleNodeClick(id) {
    setSelectedNodeId(prev => (prev === id ? null : id));
  }

  return (
    <div className="app">
      <Toolbar
        description={description}
        canvasRef={canvasRef}
        hasWorkflow={nodes.length > 0}
      />
      <div className="app__body">
        <PromptPanel
          history={history}
          loading={loading}
          error={error}
          onSubmit={submitPrompt}
        />
        <main className="app__canvas">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            canvasRef={canvasRef}
          />
        </main>
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            detail={stepDetails[selectedNodeId]}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create App.css**

Create `frontend/src/App.css`:
```css
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app__body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.app__canvas {
  flex: 1;
  overflow: hidden;
}
```

**Step 3: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests PASS (7 tests across api and hooks)

**Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/App.css
git commit -m "feat: wire all components in App.jsx — MVP complete"
```

---

### Task 15: Final verification

**Step 1: Start backend**

Terminal 1:
```bash
cd backend && node server.js
```
Expected: "Backend running on http://localhost:3001"

**Step 2: Start frontend**

Terminal 2:
```bash
cd frontend && npm run dev
```
Expected: Vite serves on http://localhost:5173

**Step 3: Manual smoke test**

Open http://localhost:5173 and verify:

1. Empty state — canvas shows placeholder text, prompt panel shows hint
2. Type: "Our sales team manually reads every inbound email, categorizes it, looks up the customer in Salesforce, drafts a response, and sends it" → Send
3. Verify: diagram appears with color-coded nodes and animated edges
4. Click a node → NodeDetailPanel slides in on the right with details
5. Click same node again → panel closes
6. Type follow-up "Add a human approval step before sending" → verify diagram updates, history grows
7. Click "Download Diagram" → workflow.png downloads
8. Click "Download Description" → workflow.md downloads

**Step 4: Run all backend tests**

```bash
cd backend && npx jest --no-coverage
```
Expected: All 9 tests PASS

**Step 5: Run all frontend tests**

```bash
cd frontend && npx vitest run
```
Expected: All 7 tests PASS

**Step 6: Final commit**

```bash
git add .
git commit -m "chore: verify all tests pass — GenAI Workflow Optimizer MVP done"
```
