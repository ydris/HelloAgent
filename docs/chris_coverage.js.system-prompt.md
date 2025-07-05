Prompt for Rebuilding Chris_Coverage (LLM-Driven Coverage Agent, OpenAI v5, JSON Comms, Debug Log):

System Build Prompt for /pages/api/chris_coverage.js

You are building a Next.js API route handler for an LLM-powered coverage determination agent named Chris_Coverage.

Requirements:

Use Node.js (ESM), Next.js API handler (export default async function handler).

Read system prompt from /prompts/chris_coverage.txt (UTF-8).

Expose POST /api/chris_coverage. Payload is either:

{ payload: {...}, debugMode?: boolean }

or { ...payload, debugMode?: boolean }

Use openai v5.8+ (import OpenAI from "openai";).

Instantiate OpenAI:
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

Compose messages for GPT as:

system: system prompt (from file)

user: string describing the JSON payload received from Eloise, e.g. “Eloise (claims agent) sent this JSON: … Extract the incident date and make a coverage decision. Use the reply_coverage_decision function. If missing/ambiguous, reply Undetermined.”

Define OpenAI function:

reply_coverage_decision(coverage, incident_date, rationale)
(all required, strings)

When LLM makes a function call, build agent-to-agent reply as:

js
Copy
Edit
{
  from: "Chris_Coverage",
  to: "Eloise",
  time: <ISO timestamp>,
  payload: { coverage, incident_date, rationale }
}
Always reply as API with:

js
Copy
Edit
{
  chris_message: <one-sentence summary for Eloise>,
  agent_log: <array with the above JSON>,
  debug: <array of strings: Chris’s “thinking” or rationale>
}
On OpenAI error, return a 500 and include error in debug.

The handler is stateless.

Do not include any business rules; rely on LLM for coverage rules based on prompt and payload.

Debug log: always include in output; note function call/rationale/error.

