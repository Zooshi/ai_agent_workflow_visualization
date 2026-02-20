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
