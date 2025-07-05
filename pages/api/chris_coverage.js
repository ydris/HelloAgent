import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function loadPrompt() {
  const promptPath = path.join(process.cwd(), "prompts", "chris_coverage.txt");
  try {
    return fs.readFileSync(promptPath, "utf8");
  } catch {
    return "You are Chris_Coverage, an AI claims assessment agent.";
  }
}

const functions = [
  {
    name: "reply_coverage_decision",
    description: "Reply with a coverage decision, the extracted date, and rationale.",
    parameters: {
      type: "object",
      properties: {
        coverage: { type: "string" },
        incident_date: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["coverage", "incident_date", "rationale"],
    },
  }
];

function buildMessages(systemPrompt, agentPayload) {
  return [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Eloise (claims agent) sent this JSON: ${JSON.stringify(agentPayload, null, 2)}
Extract the incident date and make a coverage decision. Use the reply_coverage_decision function. If missing/ambiguous, reply "Undetermined".`
    }
  ];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const agentPayload = req.body.payload || req.body; // Accept raw or wrapped payload
  const debugMode = req.body.debugMode !== false;
  const systemPrompt = loadPrompt();

  let agent_log = [];
  let debug = [];

  try {
    const messages = buildMessages(systemPrompt, agentPayload);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.2,
      max_tokens: 300,
      functions,
      function_call: "auto",
    });

    const choice = completion.choices[0].message;
    let fnCall = choice.function_call;
    let reply = "";

    if (fnCall && fnCall.name === "reply_coverage_decision") {
      const { coverage, incident_date, rationale } = JSON.parse(fnCall.arguments);

      const logEntry = {
        from: "Chris_Coverage",
        to: "Eloise",
        time: new Date().toISOString(),
        payload: { coverage, incident_date, rationale },
      };
      agent_log.push(logEntry);

      reply =
        coverage === "Covered"
          ? "Customer is covered for this incident."
          : coverage === "Not Covered"
          ? "The policy does not cover this incident (expired)."
          : "Coverage determination is undetermined (missing/invalid date).";

      if (debugMode) {
        debug.push(`[Chris_Coverage] Extracted date: ${incident_date || "none"} | Coverage: ${coverage} | Rationale: ${rationale}`);
      }
    } else {
      reply = "I couldn't determine coverage — missing information.";
      if (debugMode) debug.push("[Chris_Coverage] No function call returned by LLM.");
    }

    res.status(200).json({
      chris_message: reply,
      agent_log,
      debug,
    });

  } catch (error) {
    if (debugMode) debug.push("[Chris_Coverage] OpenAI API error: " + error.message);
    res.status(500).json({ error: "Chris API error", debug });
  }
}
