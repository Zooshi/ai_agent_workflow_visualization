export async function optimizeWorkflow(prompt, previousWorkflow) {
  const res = await fetch('/api/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, previousWorkflow }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'An unexpected error occurred');
  }
  return data;
}
