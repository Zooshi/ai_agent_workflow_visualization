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
