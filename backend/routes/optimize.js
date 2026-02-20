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
- Edges showing the flow between steps. Each edge MUST include a "label" field — use a short descriptive string (e.g. "sends results") or null if no label is needed. Never omit the label field.
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
