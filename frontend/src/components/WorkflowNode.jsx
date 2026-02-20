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
