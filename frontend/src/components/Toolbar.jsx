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
