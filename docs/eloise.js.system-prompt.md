Title: Developer Specification — /pages/api/eloise.js (LiquidWing LLM Agent)

Purpose:
Implement a Next.js API route at /pages/api/eloise.js to serve as the “Eloise” agent. Eloise is a conversational LLM insurance assistant that can call other agents (Chris_Coverage, Triage) via function-calling, and relays their JSON responses to the end customer.

Overview:
- Eloise is powered by OpenAI’s function-calling API (v5.x package).
- She interacts via JSON with other agents (Chris_Coverage, Triage).
- She maintains a “narrative” (her current summary of the customer’s story).
- All customer/agent activity is tracked in debug and agent_log arrays for the UI.

Core Requirements:

1. **API Contract**
    - Accept only POST requests.
    - Incoming request JSON body must have:
        - `conversation`: Array of `{ from: "You"|"Eloise", text: string }` (chat history)
        - `agent_log`: Array of agent-to-agent JSON messages (can be empty at start)
        - `debugMode`: Boolean (enables debug logging, used for future extensions)
    - Respond with:
        - `eloise_message`: The next message Eloise should say to the user.
        - `agent_log`: All agent-to-agent JSONs (including any new ones created)
        - `debug`: Array of debug log strings for UI (agent calls, function calls, errors)
        - `narrative`: `{ summary: string }` summarizing customer’s inputs
        - `transcript`: Array of the latest customer (“You”) messages

2. **System Prompt Loading**
    - Load the system prompt for Eloise from `/prompts/eloise.txt`.
    - If the file is missing, fallback to: “You are Eloise, a friendly claims intake agent for insurance.”

3. **Function Calling Definitions**
    - Register two function calls for OpenAI:
        - `send_to_chris`: Accepts `incident_description` (string), `incident_date` (string). Sends info to Chris_Coverage.
        - `send_to_triage`: Accepts `summary` (string). Sends info to Triage.

4. **Message Construction**
    - For OpenAI, build messages as:
        - First: `{ role: "system", content: systemPrompt }`
        - Then: Each `conversation` entry as `{ role: "user"/"assistant", content: ... }` (from "You"/"Eloise")

5. **Agent Response Relay**
    - If there is a new agent response in `agent_log` (i.e., last message where `to: "Eloise"` and `from: "Triage"` or `from: "Chris_Coverage"`), summarize it for the user in natural, empathetic language:
        - Triage: If `actions` includes any action other than "No Action Required", list them for the customer. Else, say no urgent action needed. Add rationale if present.
        - Chris_Coverage: State if “Covered” or “Not Covered” and relay the rationale.
    - Debug log must state that a reply was relayed: `[Eloise] Relayed {Agent} response to user: {summary}`

6. **Function Calling/LLM Orchestration**
    - If no new agent reply:
        - Call OpenAI `.chat.completions.create` with all the above.
        - If LLM triggers a function call, log as new agent JSON in `agent_log`:
            - For Chris: `{ from: "Eloise", to: "Chris_Coverage", time, payload: { action: "CHECK_COVERAGE", ... } }`
            - For Triage: `{ from: "Eloise", to: "Triage", time, payload: { action: "TRIAGE_CALL", ... } }`
        - Debug log must capture all outgoing function calls.
    - Always summarize the latest customer messages (up to 300 chars) as `narrative.summary`.
    - If OpenAI returns error, respond with a 500 and include debug info.

7. **Stateless by Design**
    - All state (conversation, agent_log) is passed in each POST.
    - Eloise does not persist any data outside the handler.

8. **Response Structure**
    - If agent reply was relayed, `eloise_message` is the summary and no new agent calls made.
    - If Eloise function-called, append new agent_log entry.
    - `debug` must include all agent interaction events and errors.
    - `narrative` is always included and should summarize the session so far.

Notes:
- Code must use OpenAI v5.x (`openai` npm package, not v4 syntax).
- All timestamps in ISO format.
- All field names and types must match above for UI compatibility.

End of prompt.
