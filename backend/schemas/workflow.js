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
