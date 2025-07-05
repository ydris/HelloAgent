import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function loadPrompt() {
  const promptPath = path.join(process.cwd(), "prompts", "eloise.txt");
  try {
    return fs.readFileSync(promptPath, "utf8");
  } catch {
    return "You are Eloise, a friendly claims intake agent for insurance.";
  }
}

// Agent-to-agent function definitions
const functions = [
  {
    name: "send_to_chris",
    description: "Send coverage check information to Chris_Coverage.",
    parameters: {
      type: "object",
      properties: {
        incident_description: { type: "string" },
        incident_date: { type: "string" },
      },
      required: ["incident_description", "incident_date"]
    }
  },
  {
    name: "send_to_triage",
    description: "Send an emergency event to Triage for response.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
      },
      required: ["summary"]
    }
  }
];

// Compose OpenAI messages
function buildOpenAIMessages(conversation, systemPrompt) {
  const messages = [{ role: "system", content: systemPrompt }];
  for (const msg of conversation) {
    messages.push({
      role: msg.from === "You" ? "user" : "assistant",
      content: msg.text,
    });
  }
  return messages;
}

// Helper: create a customer-facing summary for a Triage/Chris response
function summarizeAgentReply(agentMsg) {
  // For Triage
  if (agentMsg.from === "Triage" && agentMsg.to === "Eloise") {
    const actions = (agentMsg.payload.actions || []).filter(a => a !== "No Action Required");
    const rationale = agentMsg.payload.rationale || "";
    if (actions.length > 0) {
      return `Our emergency team is already on it: ${actions.join(" and ")}. ${rationale}`;
    } else {
      return `No urgent action is required at this time. ${rationale}`;
    }
  }
  // For Chris_Coverage
  if (agentMsg.from === "Chris_Coverage" && agentMsg.to === "Eloise") {
    const { coverage, rationale } = agentMsg.payload;
    if (coverage === "Covered") return `Great news — you are covered for this incident! ${rationale}`;
    if (coverage === "Not Covered") return `Unfortunately, your policy does not cover this incident. ${rationale}`;
    return `Chris reviewed your incident: ${coverage}. ${rationale}`;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { conversation = [], agent_log = [], debugMode } = req.body;
  const systemPrompt = loadPrompt();
  const messages = buildOpenAIMessages(conversation, systemPrompt);

  let newAgentLog = [];
  let debug = [];
  let nextEloiseMsg = null;

  // Check agent_log for new agent replies to Eloise
  let lastAgentMsg = agent_log.length
    ? agent_log.filter(msg => (msg.to === "Eloise" && (msg.from === "Triage" || msg.from === "Chris_Coverage"))).slice(-1)[0]
    : null;

  // If there’s a new agent response, generate a customer-facing message
  if (lastAgentMsg) {
    const summary = summarizeAgentReply(lastAgentMsg);
    if (summary) {
      nextEloiseMsg = summary;
      debug.push(`[Eloise] Relayed ${lastAgentMsg.from} response to user: ${summary}`);
    }
  }

  // If not, run the LLM as usual to decide next action
  if (!nextEloiseMsg) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.5,
        max_tokens: 512,
        functions,
        function_call: "auto"
      });

      const choice = completion.choices[0].message;
      let eloiseReply = choice.content || "";
      let fnCall = choice.function_call;

      // Narrative for debug, use recent user messages
      let narrative = {
        summary: conversation.filter(m => m.from === "You").map(m => m.text).join(" | ").slice(-300)
      };

      if (fnCall) {
        const { name, arguments: argsJSON } = fnCall;
        const args = JSON.parse(argsJSON);

        if (name === "send_to_chris") {
          newAgentLog.push({
            from: "Eloise",
            to: "Chris_Coverage",
            time: new Date().toISOString(),
            payload: {
              action: "CHECK_COVERAGE",
              ...args
            }
          });
          debug.push(`[Eloise] Called Chris_Coverage with incident: ${args.incident_description}, date: ${args.incident_date}`);
          eloiseReply = "I'm consulting our coverage agent, Chris. I'll update you as soon as I have an answer.";
        } else if (name === "send_to_triage") {
          newAgentLog.push({
            from: "Eloise",
            to: "Triage",
            time: new Date().toISOString(),
            payload: {
              action: "TRIAGE_CALL",
              ...args
            }
          });
          debug.push(`[Eloise] Called Triage with summary: ${args.summary}`);
          eloiseReply = "I've alerted our emergency response team to assist you.";
        }
      }

      res.status(200).json({
        eloise_message: eloiseReply,
        agent_log: [...agent_log, ...newAgentLog],
        debug,
        narrative,
        transcript: conversation.filter(m => m.from === "You").map(m => m.text)
      });
      return;

    } catch (error) {
      debug.push(`[Eloise] API error: ${error.message}`);
      res.status(500).json({ error: "OpenAI API call failed", debug });
      return;
    }
  } else {
    // Just relay the agent’s reply
    res.status(200).json({
      eloise_message: nextEloiseMsg,
      agent_log,
      debug,
      narrative: {
        summary: conversation.filter(m => m.from === "You").map(m => m.text).join(" | ").slice(-300)
      },
      transcript: conversation.filter(m => m.from === "You").map(m => m.text)
    });
  }
}
