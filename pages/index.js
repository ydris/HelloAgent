import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [conversation, setConversation] = useState([
    { from: "Eloise", text: "Hi! Please tell me what happened, and I'll help you check your coverage. If this is an emergency, let me know right away." }
  ]);
  const [userInput, setUserInput] = useState('');
  const [agentLog, setAgentLog] = useState([]);
  const [debugLog, setDebugLog] = useState([]);
  const [narrative, setNarrative] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [debugMode, setDebugMode] = useState(true);
  const chatBottomRef = useRef(null);

  // Scroll chat window to bottom on update
  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Helper: POST to any agent and collect logs
  async function agentPost(endpoint, body) {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return resp.json();
  }

  // Main handler: talk to Eloise and any sub-agents
  const handleSend = async () => {
    if (!userInput.trim()) return;

    // Add user message
    const updatedConversation = [...conversation, { from: "You", text: userInput }];
    setConversation(updatedConversation);
    setUserInput('');

    // 1. Send to Eloise
    const data = await agentPost('/api/eloise', { conversation: updatedConversation, debugMode });

    setConversation(conv => [...conv, { from: "Eloise", text: data.eloise_message }]);
    setNarrative(data.narrative || null);
    setTranscript(data.transcript || []);
    let logs = [...(data.agent_log || [])];
    let debug = [...(data.debug || [])];

    // 2. If Eloise wants to call Chris/Triage, POST and collect their logs (sequential, for now)
    for (let msg of logs) {
      if (msg.to === "Chris_Coverage") {
        const chris = await agentPost('/api/chris_coverage', { payload: msg.payload, debugMode });
        logs = [...logs, ...(chris.agent_log || [])];
        debug = [...debug, ...(chris.debug || [])];
        // Add Chris's reply to chat
        setConversation(conv => [...conv, { from: "Chris_Coverage", text: chris.chris_message }]);
      }
      // Add similar logic for Triage as needed (not shown)
    }

    setAgentLog(agentLog => [...agentLog, ...logs]);
    setDebugLog(debugLog => [...debugLog, ...debug]);
  };

  // Clear all state (for testing)
  const handleClear = () => {
    setConversation([
      { from: "Eloise", text: "Hi! Please tell me what happened, and I'll help you check your coverage. If this is an emergency, let me know right away." }
    ]);
    setAgentLog([]);
    setDebugLog([]);
    setNarrative(null);
    setTranscript([]);
    setUserInput('');
  };

  // Window styles (fixed/scrollable)
  const chatStyle = {
    height: 'calc(100vh - 64px)', width: '50vw', minWidth: 320, maxWidth: 640,
    borderRight: '1px solid #e3e3e3', display: 'flex', flexDirection: 'column'
  };
  const jsonStyle = {
    height: '48vh', width: '48vw', minWidth: 320, overflowY: 'auto',
    background: '#fafbfd', borderBottom: '1px solid #e3e3e3', padding: 12, fontSize: 14, fontFamily: 'monospace'
  };
  const debugStyle = {
    height: '48vh', width: '48vw', minWidth: 320, overflowY: 'auto',
    background: '#fcfcfc', padding: 12, fontSize: 14, borderTop: '1px solid #e3e3e3', fontFamily: 'monospace'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
      fontFamily: 'system-ui, Inter, Arial, sans-serif'
    }}>
      {/* LEFT: Chat */}
      <div style={chatStyle}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#fff' }}>
          <h2 style={{ fontWeight: 700, letterSpacing: 0.5, margin: 0, fontSize: 22, marginBottom: 14, color: '#2050a0' }}>
            LiquidWing AI — Claims Assistant Demo
          </h2>
          {conversation.map((msg, i) => (
            <div key={i} style={{ marginBottom: 12, textAlign: msg.from === 'Eloise' ? 'left' : 'right' }}>
              <span style={{ fontWeight: msg.from === 'Eloise' ? 600 : 400, color: msg.from === 'Eloise' ? '#2050a0' : '#0b0b0b' }}>
                {msg.from}:
              </span>
              <span style={{ marginLeft: 8, background: msg.from === 'Eloise' ? '#eef6ff' : '#f7f7f7', padding: '4px 10px', borderRadius: 8, display: 'inline-block' }}>
                {msg.text}
              </span>
            </div>
          ))}
          <div ref={chatBottomRef} />
        </div>
        {/* Input */}
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', borderTop: '1px solid #eee', background: '#fafbfc', padding: 12 }}>
          <input
            style={{ flex: 1, padding: 10, fontSize: 16, borderRadius: 8, border: '1px solid #e3e3e3', marginRight: 12 }}
            placeholder="Type your message here…"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <button type="submit" style={{ fontSize: 16, fontWeight: 600, background: '#26e7f4', color: '#0b1830', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>
            Send
          </button>
          <button type="button" onClick={handleClear} style={{
            marginLeft: 12, fontSize: 14, fontWeight: 500, background: '#ffeaea', color: '#820b0b', border: 'none',
            borderRadius: 8, padding: '8px 14px', cursor: 'pointer'
          }}>Clear</button>
        </form>
      </div>

      {/* RIGHT: JSON and Debug/Thinking windows */}
      <div style={{ width: '50vw', minWidth: 320, maxWidth: 640, display: 'flex', flexDirection: 'column' }}>
        {/* JSON window */}
        <div style={jsonStyle}>
          <h4 style={{ margin: 0, color: '#2050a0' }}>Agent-to-Agent JSON Log</h4>
          <div>
            {(agentLog.length === 0) && <div style={{ color: '#888' }}>No agent messages yet…</div>}
            {agentLog.map((log, i) =>
              <pre key={i} style={{ margin: '8px 0', background: '#eaf9fd', borderRadius: 5, padding: 6, overflowX: 'auto' }}>
                {JSON.stringify({ ...log, time: log.time || new Date().toISOString() }, null, 2)}
              </pre>
            )}
          </div>
        </div>
        {/* Debug/Thinking window (toggle) */}
        {debugMode && (
          <div style={debugStyle}>
            <h4 style={{ margin: 0, color: '#2050a0' }}>Debug / Thinking Window</h4>
            <div>
              {(debugLog.length === 0) && <div style={{ color: '#bbb' }}>Nothing yet…</div>}
              {debugLog.map((dbg, i) =>
                <div key={i} style={{ marginBottom: 8 }}>{dbg}</div>
              )}
            </div>
            <hr style={{ margin: '12px 0', opacity: 0.25 }} />
            {narrative && (
              <div>
                <strong>Eloise’s Narrative (Current)</strong>
                <pre style={{ margin: 0, background: '#fcfcfc', padding: 7, borderRadius: 4, fontSize: 13 }}>
                  {JSON.stringify(narrative, null, 2)}
                </pre>
              </div>
            )}
            <div>
              <strong>Transcript:</strong>
              <ul style={{ fontSize: 13, color: '#2e3b4d', margin: 0, paddingLeft: 16 }}>
                {transcript && transcript.map((txt, i) => <li key={i}>{txt}</li>)}
              </ul>
            </div>
          </div>
        )}
        <div style={{ position: 'absolute', right: 12, top: 10 }}>
          <label style={{ fontWeight: 500, fontSize: 14, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={debugMode} onChange={e => setDebugMode(e.target.checked)} style={{ marginRight: 6 }} />
            Debug Mode
          </label>
        </div>
      </div>
    </div>
  );
}
