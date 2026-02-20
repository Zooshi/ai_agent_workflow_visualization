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
