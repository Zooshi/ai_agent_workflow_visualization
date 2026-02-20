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
