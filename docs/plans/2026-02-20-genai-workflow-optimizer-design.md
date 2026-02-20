# GenAI Workflow Optimizer — Design Document

**Date:** 2026-02-20
**Status:** Approved

---

## Overview

A React web application that allows users to describe any business workflow and receive an AI-optimized, agentic version of it — presented as both a written description and an interactive visual diagram.

---

## Requirements Summary

- User types a workflow description into a prompt window
- AI analyzes and proposes an agentic/AI-agent-based version of the workflow
- Result displayed as:
  - A 2-4 paragraph written description
  - An interactive flowchart DAG (nodes + edges)
- User can click any node to see detailed information about that step
- User can refine the workflow via follow-up prompts
- User can download the diagram as PNG and the description as Markdown
- If a legacy workflow is better replaced entirely, the AI proposes a new agentic workflow instead

---

## Architecture

### Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + ReactFlow |
| Backend | Node.js + Express |
| AI | OpenAI Node SDK (`gpt-5-nano-2025-08-07` via `.env`) |
| Structured Output | Zod + `zodResponseFormat` + `client.chat.completions.parse()` |
| Diagram export | `html-to-image` (PNG) |
| Description export | Blob + `URL.createObjectURL` (Markdown) |
| Persistence | In-memory only (no database) |
| API key storage | `.env` on backend, never exposed to browser |

### Project Structure

```
200226/
├── backend/
│   ├── server.js
│   ├── routes/
│   │   └── optimize.js        # POST /api/optimize
│   ├── schemas/
│   │   └── workflow.js        # Zod schema for WorkflowSchema
│   ├── .env                   # OPENAI_API_KEY, OPENAI_MODEL, PORT
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── PromptPanel.jsx      # Left sidebar: chat history + input
    │   │   ├── WorkflowCanvas.jsx   # Center: ReactFlow diagram
    │   │   ├── NodeDetailPanel.jsx  # Right sidebar: node details on click
    │   │   └── Toolbar.jsx          # Top right: download buttons
    │   ├── hooks/
    │   │   └── useWorkflow.js       # State: nodes, edges, description, history
    │   └── api/
    │       └── client.js            # fetch wrapper for /api/optimize
    ├── index.html
    └── package.json
```

---

## UI Layout

```
+------------------------------------------------------------------+
|  GenAI Workflow Optimizer                    [Download Diagram]  |
|                                              [Download Desc.]    |
+------------------+---------------------------+-------------------+
|  PROMPT PANEL    |  WORKFLOW CANVAS          |  NODE DETAIL      |
|  (280px)         |  (flex)                   |  (300px, hidden   |
|                  |                           |   until click)    |
|  Chat history    |  ReactFlow diagram        |                   |
|  of prompts and  |  - Zoom / pan             |  Node title       |
|  AI responses    |  - Click node to open     |  Description      |
|                  |    right panel            |  Agent type       |
|  ----------      |  - Animated edges         |  Input / Output   |
|  [text input]    |  - Color-coded nodes      |  [X close]        |
|  [Send]          |                           |                   |
+------------------+---------------------------+-------------------+
```

---

## Data Flow

1. User types prompt → frontend calls `POST /api/optimize` with `{ prompt, previousWorkflow }`
2. Backend builds system + user messages, calls OpenAI with Zod-validated structured output
3. OpenAI returns a `WorkflowSchema`-compliant object (enforced server-side)
4. Backend returns `{ description, nodes, edges, stepDetails }` to frontend
5. Frontend updates ReactFlow canvas; stepDetails powers the node click panel
6. On follow-up, `previousWorkflow` is serialized into the user message for refinement context

---

## AI Structured Output

### Zod Schema

```js
const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'agent', 'tool', 'decision', 'output']),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
});

const WorkflowSchema = z.object({
  description: z.string(),
  nodes: z.array(NodeSchema),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })),
  stepDetails: z.record(z.string(), z.string()),
});
```

### OpenAI Call

```js
const completion = await client.chat.completions.parse({
  model: process.env.OPENAI_MODEL,
  messages: [systemMsg, userMsg],
  response_format: zodResponseFormat(WorkflowSchema, 'workflow'),
});
const result = completion.choices[0].message.parsed;
```

### System Prompt

```
You are an expert AI systems architect. Your job is to analyze workflows
and redesign them as modern agentic AI pipelines.

Given a workflow description, produce a structured workflow with:
- A 2-4 paragraph description of the optimized agentic workflow
- Nodes representing each step (trigger, agent, tool, decision, output)
- Edges showing the flow between steps
- Step details: for each node ID, a detailed explanation including
  what the node does, what AI agent or tool powers it, and its inputs/outputs

Position nodes in a top-to-bottom DAG layout (y increments of 120px per level).
If the legacy workflow should be fully replaced, say so in the description.
```

---

## Node Visual Design

| Node type | Color | Meaning |
|---|---|---|
| `trigger` | Blue | Entry point / user action / event |
| `agent` | Purple | AI agent performing reasoning or action |
| `tool` | Green | Specific tool/API call (search, code, etc.) |
| `decision` | Orange | Branching / conditional logic |
| `output` | Gray | Final result or human handoff |

Edges are animated with dashed lines to show data/control flow direction.

---

## Error Handling

| Scenario | Backend response | Frontend behavior |
|---|---|---|
| Invalid/empty prompt | `400 { error, code: "INVALID_INPUT" }` | Show error in chat panel |
| OpenAI API error | `502 { error, code: "OPENAI_ERROR" }` | Show error in chat panel |
| Schema refusal / null parsed | `422 { error, code: "SCHEMA_REFUSAL" }` | Show error in chat panel |
| Network failure | — | Fetch wrapper catches, shows error |

Canvas always retains the last valid workflow on error.

---

## Downloads

| Action | Output | Method |
|---|---|---|
| Download Diagram | `workflow.png` | `html-to-image` on the ReactFlow viewport element |
| Download Description | `workflow.md` | `Blob` from description string + `URL.createObjectURL` |
