import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function loadPrompt() {
  const promptPath = path.join(process.cwd(), "prompts", "triage.txt");
  try {
    return fs.readFileSync(promptPath, "utf8");
  } catch {
    return "You are Triage, the AI agent for emergency claims response.";
  }
}

// Function definition for Triage actions
const functions = [
  {
    name: "triage_action",
    description: "Determine what urgent actions (if any) should be taken for this emergency claim.",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Urgent actions to take, e.g., ['Call EMS', 'Call Tow Truck', 'No Action Required']"
        },
        rationale: { type: "string", description: "Short explanation of the decision" }
      },
      required: ["actions", "rationale"]
    }
  }
];

// Compose LLM messages
function buildMessages(conversation, systemPrompt) {
  const messages = [{ role: "system", content: systemPrompt }];
  for (const msg of conversation) {
    messages.push({
      role: msg.from === "Eloise" ? "user" : "assistant",
      content: msg.text,
    });
  }
  return messages;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { messages = [], debugMode } = req.body;
  const systemPrompt = loadPrompt();
  const llmMessages = buildMessages(messages, systemPrompt);

  let agent_log = [];
  let debug = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: llmMessages,
      temperature: 0.2,
      max_tokens: 384,
      functions,
      function_call: "auto"
    });

    const choice = completion.choices[0].message;
    let triageReply = choice.content || "";
    let fnCall = choice.function_call;

    if (fnCall) {
      const { arguments: argsJSON } = fnCall;
      const args = JSON.parse(argsJSON);

      // Always ensure actions array is present
      let actions = Array.isArray(args.actions) ? args.actions : [];
      if (actions.length === 0) actions = ["No Action Required"];

      agent_log.push({
        from: "Triage",
        to: "Eloise",
        time: new Date().toISOString(),
        payload: {
          actions,
          rationale: args.rationale
        }
      });

      debug.push(
        `[Triage] Actions: ${actions.join(", ")} | Rationale: ${args.rationale}`
      );

      // Compose plain English reply for Eloise (can tune this to use the LLM message if needed)
      triageReply =
        actions.includes("No Action Required")
          ? "No urgent action is required at this time."
          : `Triage has initiated: ${actions.join(", ")}.`;
    } else if (triageReply) {
      // If LLM returns only a plain message, pass it through
      debug.push("[Triage] No function call made. LLM said: " + triageReply);
    } else {
      triageReply = "No decision was made by Triage. Please clarify the emergency.";
      debug.push("[Triage] No function call or message from LLM.");
    }

    res.status(200).json({
      triage_message: triageReply,
      agent_log,
      debug
    });

  } catch (error) {
    debug.push(`[Triage] API error: ${error.message}`);
    res.status(500).json({ error: "OpenAI API call failed", debug });
  }
}
