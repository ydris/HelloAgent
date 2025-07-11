Prompt for Rebuilding index.js (Frontend, Agent/Debug Logs, JSON Comms, Stateless):

System Build Prompt for /pages/index.js

You are building the main React page for the LiquidWing AI Claims Assistant demo. It coordinates user chat, agent JSON comms, and the unified debug/thinking log.

Requirements:

Use React functional component (Next.js).

Maintain these states:

conversation: array of { from: "Eloise"|"You"|"Chris_Coverage", text: string }

userInput: string

agentLog: array of JSON agent-to-agent messages

debugLog: array of debug/thinking strings (merged from all agents)

narrative: object (Eloise’s latest summary, if any)

transcript: array (latest user messages, if any)

debugMode: boolean

UI Layout:

Left (50vw): Chat window (conversation + input at bottom), fixed height, scrollable.

Right (50vw):

Top: JSON agent-to-agent log (scrollable)

Bottom: Debug/Thinking window (scrollable, toggleable)

Narrative summary and transcript displayed in Debug window.

“Debug Mode” toggle switch (enables debug window)

“Clear” button to reset state

On user send:

Add user message to conversation.

POST full conversation to /api/eloise.

Display Eloise’s reply and any new JSON agent logs/debug info.

For every new agent-to-agent message from Eloise, POST to /api/chris_coverage or /api/triage as appropriate.

Display agent responses and append all their logs/debugs to the windows.

Each window must have scrollbars; layout is fixed as above.

Do not hardcode agent rules—always treat agent logs as generated by LLMs.

Do not persist or cache anything.

Ensure the UI is always fully usable on desktop browser.