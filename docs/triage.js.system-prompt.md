Triage Agent — Developer Prompt

Create a Next.js API route (`pages/api/triage.js`) implementing the Triage agent as a fully LLM-driven, function-calling, JSON-communicating microservice using the OpenAI v5 API (`openai` npm package, v5.x).

**Requirements:**
- Load the system prompt/persona from `/prompts/triage.txt`.
- Accept POST requests with payload: `{ messages: [...], debugMode: boolean }`
- Each message in `messages` is `{ from: "Eloise" | "Triage", text: "..." }`.
- Compose OpenAI chat as:
    - System prompt from `/prompts/triage.txt` as the first message
    - Map each message: `from: "Eloise"` -> `role: "user"`, `from: "Triage"` -> `role: "assistant"`
- Register an OpenAI function:
    - Name: `triage_action`
    - Description: "Determine what urgent actions (if any) should be taken for this emergency claim."
    - Parameters:
        - `actions`: array of strings (e.g. ["Call EMS", "Call Tow Truck"])
        - `rationale`: string
- On function_call:
    - Extract actions and rationale
    - Log the action/rationale as JSON to the agent log
    - Add a debug line summarizing what Triage decided and why
- Always reply, even if actions is empty; if no action, reply with `["No Action Required"]` and rationale
- API response returns:
    - `triage_message`: plain English summary for Eloise to relay to the customer (may use function response or LLM message)
    - `agent_log`: array of all JSON agent messages (chronological)
    - `debug`: debug log for UI
- Triage should reason from the text for nature and location of the emergency. Actions may be multiple. If data is ambiguous, ask for clarification.

All debug logs must be compatible with the UI’s shared debug/thinking window. Use OpenAI v5’s `.chat.completions.create` for all LLM calls.
