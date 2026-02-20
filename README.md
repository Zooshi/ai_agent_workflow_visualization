# AI Agent Workflow Visualizer

A full-stack web application that transforms traditional business workflows into optimized AI agentic pipelines. Describe any workflow in plain English, and the app generates an interactive diagram showing how AI agents could automate and enhance it.

![Architecture: React frontend + Express backend + OpenAI](docs/plans/2026-02-20-genai-workflow-optimizer-design.md)

## What It Does

Users describe a business process (e.g., "our team manually reads every support email, categorizes it, and drafts a response"), and the app:

1. Sends the description to an Express backend, which calls the OpenAI API using structured output (validated with Zod)
2. Receives a structured workflow — a list of typed nodes (trigger, agent, tool, decision, output) and directed edges
3. Renders the workflow as an interactive [ReactFlow](https://reactflow.dev/) diagram with color-coded nodes
4. Lets users click any node to see a detailed explanation of what that step does
5. Supports **multi-turn refinement** — follow-up prompts update the diagram while retaining conversation history
6. Allows exporting the diagram as a PNG image or the description as a Markdown file

### Node Types

| Type | Color | Description |
|------|-------|-------------|
| `trigger` | Blue | Entry point that initiates the workflow |
| `agent` | Purple | An AI agent that processes or decides |
| `tool` | Green | A specific tool or API the agent calls |
| `decision` | Orange | A conditional branch point |
| `output` | Gray | Final result or action taken |

## Project Structure

```
ai_agent_workflow_visualization/
├── backend/                  # Express.js API server
│   ├── server.js             # Entry point (port 3001)
│   ├── routes/
│   │   ├── optimize.js       # POST /api/optimize — calls OpenAI
│   │   └── optimize.test.js
│   ├── schemas/
│   │   ├── workflow.js       # Zod schema for structured output
│   │   └── workflow.test.js
│   └── .env.example          # Required environment variables
└── frontend/                 # React + Vite app
    └── src/
        ├── App.jsx           # Root component
        ├── api/client.js     # Fetch wrapper for /api/optimize
        ├── hooks/
        │   └── useWorkflow.js  # State management
        └── components/
            ├── PromptPanel.jsx      # Left sidebar: chat input & history
            ├── WorkflowCanvas.jsx   # Center: interactive diagram
            ├── WorkflowNode.jsx     # Custom ReactFlow node
            ├── NodeDetailPanel.jsx  # Right sidebar: node details
            └── Toolbar.jsx          # Top bar: title & export buttons
```

## Prerequisites

- **Node.js** 20 or later
- An **OpenAI API key** with access to a chat completions model

## Setup and Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai_agent_workflow_visualization
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set your OpenAI API key:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # or any model supporting structured output
PORT=3001
```

### 3. Install dependencies

Install backend and frontend dependencies separately:

```bash
# In the backend directory
npm install

# In a new terminal, from the frontend directory
cd ../frontend
npm install
```

## Running the Application

The backend and frontend must be started in separate terminals.

**Terminal 1 — Backend:**

```bash
cd backend
npm run dev
# Server starts at http://localhost:3001
```

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev
# App opens at http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to the backend, so no CORS configuration is needed during development.

### Production

```bash
# Build the frontend
cd frontend
npm run build
# Static files are output to frontend/dist/

# Start the backend
cd ../backend
node server.js
```

Serve `frontend/dist/` with any static file host or reverse proxy (e.g., nginx) pointing API requests to the backend.

## API

### `POST /api/optimize`

Accepts a workflow description and returns a structured agentic workflow.

**Request body:**

```json
{
  "prompt": "Describe the workflow to optimize",
  "previousWorkflow": { ... }  // optional, for multi-turn refinement
}
```

**Response:**

```json
{
  "description": "A 2–4 paragraph summary of the optimized workflow",
  "nodes": [
    {
      "id": "1",
      "type": "trigger",
      "label": "Email Received",
      "detail": "Webhook receives inbound email and triggers the pipeline",
      "position": { "x": 0, "y": 0 }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "triggers"
    }
  ]
}
```

**Error responses:**

| Code | Meaning |
|------|---------|
| 400 | Missing or empty `prompt` |
| 422 | OpenAI response did not match the expected schema |
| 502 | OpenAI API call failed |

### `GET /health`

Returns `{ "status": "ok" }` — useful for container health checks.

## Running Tests

Tests are separated between backend (Jest + Supertest) and frontend (Vitest + Testing Library).

```bash
# Backend tests (9 tests)
cd backend
npm test

# Frontend tests (7 tests)
cd frontend
npm test

# Frontend tests in watch mode
npm run test:watch
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite |
| Diagram rendering | @xyflow/react (ReactFlow) |
| Image export | html-to-image |
| Backend framework | Express 5 |
| AI integration | OpenAI Node SDK |
| Schema validation | Zod |
| Backend testing | Jest + Supertest |
| Frontend testing | Vitest + Testing Library |

## Usage Example

1. Open `http://localhost:5173` in your browser.
2. In the left panel, type a description of a workflow:
   > "Our sales team manually reads every inbound email, categorizes it, looks up the customer in Salesforce, drafts a reply, and sends it."
3. Press **Enter** or click **Send**.
4. The diagram appears in the center canvas. Use scroll/pinch to zoom, click and drag to pan.
5. Click any node to see a detailed explanation in the right panel.
6. Type a follow-up to refine:
   > "Add a step that learns from past replies to improve future drafts."
7. Use the **Download Diagram** button to save a PNG, or **Download Description** to save a Markdown file.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | — | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use for structured output |
| `PORT` | No | `3001` | Port the backend listens on |
