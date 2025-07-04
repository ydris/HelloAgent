import { useState } from 'react';

export default function Home() {
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState('');

async function handleAgentCommand(cmd) {
  // Call your backend API
  const res = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: cmd }),
  });
  const data = await res.json();
  return data.response || data.error || "No response from agent.";
}


  function handleSend() {
    setResponse(handleAgentCommand(command.trim()));
    setCommand('');
  }

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h2>LiquidWing Mesh — Agent Demo</h2>
      <div>
        <input
          value={command}
          onChange={e => setCommand(e.target.value)}
          placeholder="Type a command (try say_hello)"
          style={{ fontSize: 16, padding: 8, width: 240, marginRight: 8 }}
        />
        <button onClick={handleSend} style={{ fontSize: 16, padding: 8 }}>
          Send
        </button>
      </div>
      <div style={{ marginTop: 32, fontSize: 18 }}>
        <strong>Agent says:</strong>
        <div style={{ marginTop: 8 }}>{response}</div>
      </div>
    </div>
  );
}
