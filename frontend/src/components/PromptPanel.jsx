import { useState, useRef, useEffect } from 'react';
import './PromptPanel.css';

export function PromptPanel({ history, loading, error, onSubmit }) {
  const [value, setValue] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue('');
  }

  return (
    <aside className="prompt-panel">
      <div className="prompt-panel__history">
        {history.length === 0 && (
          <p className="prompt-panel__hint">
            Describe your current workflow and the AI will propose an optimized agentic version.
          </p>
        )}
        {history.map((entry, i) => (
          <div key={i}>
            <div className="prompt-panel__msg prompt-panel__msg--user">
              {entry.prompt}
            </div>
            <div className="prompt-panel__msg prompt-panel__msg--ai">
              {entry.workflow.description}
            </div>
          </div>
        ))}
        {loading && (
          <div className="prompt-panel__msg prompt-panel__msg--ai prompt-panel__msg--loading">
            Analyzing workflow...
          </div>
        )}
        {error && (
          <div className="prompt-panel__error">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form className="prompt-panel__form" onSubmit={handleSubmit}>
        <textarea
          className="prompt-panel__input"
          placeholder={history.length === 0 ? 'Describe your workflow...' : 'Refine or adjust...'}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
          disabled={loading}
          rows={3}
        />
        <button
          className="prompt-panel__send"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </form>
    </aside>
  );
}
