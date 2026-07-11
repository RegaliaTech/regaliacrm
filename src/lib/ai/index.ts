import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type Schema,
} from "@google/generative-ai";
import type { ToolDeclaration } from "./tools";

export type EmailDraftInput = {
  /** What the email is about / the case. */
  purpose: string;
  customerName?: string;
  company?: string;
  /** Sender / company signature name. */
  senderName?: string;
  tone?: "friendly" | "formal" | "concise";
  /** Extra context: quotation details, prior conversation, etc. */
  context?: string;
  /** Prior emails already sent in this thread, oldest first. */
  priorEmails?: Array<{ subject: string; body: string }>;
  /**
   * 0 = first touch. Higher numbers should make the AI escalate urgency/
   * persistence politely (later steps of a follow-up sequence).
   */
  escalationLevel?: number;
};

/** Token usage for a single AI request. */
export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type EmailDraft = {
  subject: string;
  body: string;
  /** Token usage reported by the provider, when available. */
  usage?: TokenUsage;
};

/** A single turn in an assistant conversation. */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PendingToolCall = {
  name: string;
  args: Record<string, unknown>;
};

export type ChatResult = {
  text: string;
  usage?: TokenUsage;
  /**
   * Set when the model requested a write (mutating) tool. The loop stops
   * without executing it, so the caller can ask the user to confirm.
   */
  pendingToolCall?: PendingToolCall;
};

export type ChatOptions = {
  /** System prompt establishing the assistant's persona/instructions. */
  systemInstruction?: string;
};

/** Executes a tool call and returns a JSON-serializable result. */
export type ToolCallHandler = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

export type ChatToolOptions = ChatOptions & {
  tools?: ToolDeclaration[];
  onToolCall?: ToolCallHandler;
  /**
   * Tools that mutate data. When the model calls one, the loop stops and
   * returns it as `pendingToolCall` instead of executing.
   */
  writeToolNames?: string[];
};

export interface AiClient {
  draftEmail(input: EmailDraftInput): Promise<EmailDraft>;
  /** Multi-turn chat. `messages` is the full history, oldest first. */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
  /**
   * Multi-turn chat with tool/function calling. The client runs the
   * call→execute→continue loop internally via `opts.onToolCall`.
   */
  chatWithTools(
    messages: ChatMessage[],
    opts: ChatToolOptions,
  ): Promise<ChatResult>;
}

const MAX_TOOL_ROUNDS = 4;

const SCHEMA_TYPE_MAP: Record<string, SchemaType> = {
  string: SchemaType.STRING,
  number: SchemaType.NUMBER,
  integer: SchemaType.INTEGER,
  boolean: SchemaType.BOOLEAN,
};

/** Convert a provider-neutral tool declaration to Gemini's format. */
function toGeminiDeclaration(t: ToolDeclaration): FunctionDeclaration {
  const properties: Record<string, Schema> = {};
  for (const [key, prop] of Object.entries(t.parameters.properties)) {
    properties[key] = {
      type: SCHEMA_TYPE_MAP[prop.type] ?? SchemaType.STRING,
      description: prop.description,
      ...(prop.enum ? { enum: prop.enum, format: "enum" } : {}),
    } as Schema;
  }
  return {
    name: t.name,
    description: t.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties,
      required: t.parameters.required,
    },
  };
}

function buildPrompt(input: EmailDraftInput): string {
  const tone = input.tone ?? "friendly";
  const escalation = input.escalationLevel ?? 0;
  const escalationGuidance =
    escalation <= 0
      ? ""
      : escalation === 1
        ? "This is a follow-up because the recipient has not yet replied. Politely remind them and add gentle urgency."
        : "This is a later follow-up; the recipient still hasn't replied to earlier messages. Be courteous but more direct, acknowledge the previous emails, and clearly invite a response or a way to close the loop.";
  const priorThread =
    input.priorEmails && input.priorEmails.length > 0
      ? "Previous emails already sent in this thread (oldest first), do NOT repeat them verbatim:\n" +
        input.priorEmails
          .map(
            (e, i) =>
              `--- Email ${i + 1} ---\nSubject: ${e.subject}\n${e.body}`,
          )
          .join("\n")
      : "";
  return [
    "You are a professional sales assistant writing a business email on behalf of a company.",
    `Tone: ${tone}.`,
    input.customerName ? `Recipient name: ${input.customerName}` : "",
    input.company ? `Recipient company: ${input.company}` : "",
    input.senderName ? `Sender name / signature: ${input.senderName}` : "",
    `Purpose of the email: ${input.purpose}`,
    input.context ? `Additional context:\n${input.context}` : "",
    escalationGuidance,
    priorThread,
    "",
    "Return ONLY a JSON object with exactly two string fields: \"subject\" and \"body\".",
    "The body should be plain text with line breaks, ready to send. Do not include markdown.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseDraft(raw: string, fallbackSubject: string): EmailDraft {
  // Try to extract a JSON object even if wrapped in code fences.
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as Partial<EmailDraft>;
      if (parsed.body) {
        return {
          subject: parsed.subject?.trim() || fallbackSubject,
          body: parsed.body.trim(),
        };
      }
    } catch {
      // fall through to plain-text handling
    }
  }
  return { subject: fallbackSubject, body: raw.trim() };
}

class GeminiClient implements AiClient {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async draftEmail(input: EmailDraftInput): Promise<EmailDraft> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(buildPrompt(input));
    const text = result.response.text();
    const meta = result.response.usageMetadata;
    const usage: TokenUsage | undefined = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          completionTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : undefined;
    return { ...parseDraft(text, `Regarding: ${input.purpose}`), usage };
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult> {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: opts?.systemInstruction,
    });
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const result = await model.generateContent({ contents });
    const meta = result.response.usageMetadata;
    const usage: TokenUsage | undefined = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          completionTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : undefined;
    return { text: result.response.text().trim(), usage };
  }

  async chatWithTools(
    messages: ChatMessage[],
    opts: ChatToolOptions,
  ): Promise<ChatResult> {
    const declarations = (opts.tools ?? []).map(toGeminiDeclaration);
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: opts.systemInstruction,
      tools: declarations.length
        ? [{ functionDeclarations: declarations }]
        : undefined,
    });

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chatSession = model.startChat({ history });

    const last = messages[messages.length - 1];
    let result = await chatSession.sendMessage(last?.content ?? "");

    const writeNames = opts.writeToolNames ?? [];
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      // If the model wants a write tool, stop and surface it for confirmation
      // instead of executing.
      const writeCall = calls.find((c) => writeNames.includes(c.name));
      if (writeCall) {
        return {
          text: safeText(result),
          pendingToolCall: {
            name: writeCall.name,
            args: (writeCall.args ?? {}) as Record<string, unknown>,
          },
        };
      }

      const responseParts = [];
      for (const call of calls) {
        const output = opts.onToolCall
          ? await opts.onToolCall(
              call.name,
              (call.args ?? {}) as Record<string, unknown>,
            )
          : { error: "No tool executor available." };
        responseParts.push({
          functionResponse: { name: call.name, response: output as object },
        });
      }
      result = await chatSession.sendMessage(responseParts);
    }

    const meta = result.response.usageMetadata;
    const usage: TokenUsage | undefined = meta
      ? {
          promptTokens: meta.promptTokenCount ?? 0,
          completionTokens: meta.candidatesTokenCount ?? 0,
          totalTokens: meta.totalTokenCount ?? 0,
        }
      : undefined;
    return { text: result.response.text().trim(), usage };
  }
}

/** Gemini's response.text() throws when the candidate is only a function call. */
function safeText(result: {
  response: { text: () => string };
}): string {
  try {
    return result.response.text().trim();
  } catch {
    return "";
  }
}

class GroqClient implements AiClient {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async draftEmail(input: EmailDraftInput): Promise<EmailDraft> {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: buildPrompt(input) }],
          temperature: 0.6,
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const u = data.usage;
    const usage: TokenUsage | undefined = u
      ? {
          promptTokens: u.prompt_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
        }
      : undefined;
    return { ...parseDraft(text, `Regarding: ${input.purpose}`), usage };
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult> {
    const msgs: Array<{ role: string; content: string }> = [];
    if (opts?.systemInstruction) {
      msgs.push({ role: "system", content: opts.systemInstruction });
    }
    for (const m of messages) {
      msgs.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: msgs,
          temperature: 0.6,
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const u = data.usage;
    const usage: TokenUsage | undefined = u
      ? {
          promptTokens: u.prompt_tokens ?? 0,
          completionTokens: u.completion_tokens ?? 0,
          totalTokens: u.total_tokens ?? 0,
        }
      : undefined;
    return { text: text.trim(), usage };
  }

  async chatWithTools(
    messages: ChatMessage[],
    opts: ChatToolOptions,
  ): Promise<ChatResult> {
    const tools = (opts.tools ?? []).map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    const msgs: Array<Record<string, unknown>> = [];
    if (opts.systemInstruction) {
      msgs.push({ role: "system", content: opts.systemInstruction });
    }
    for (const m of messages) {
      msgs.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      });
    }

    let text = "";
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: msgs,
            temperature: 0.6,
            tools: tools.length ? tools : undefined,
          }),
        },
      );
      if (!res.ok) {
        throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message as
        | { content?: string; tool_calls?: Array<Record<string, unknown>> }
        | undefined;
      const toolCalls = msg?.tool_calls;
      if (toolCalls?.length && opts.onToolCall) {
        const writeNames = opts.writeToolNames ?? [];
        // Surface a write call for confirmation instead of executing it.
        for (const tc of toolCalls) {
          const fn = tc.function as { name: string; arguments?: string };
          if (writeNames.includes(fn.name)) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(fn.arguments || "{}");
            } catch {
              // ignore malformed args
            }
            return {
              text: msg?.content?.trim() ?? "",
              pendingToolCall: { name: fn.name, args },
            };
          }
        }

        msgs.push(msg as Record<string, unknown>);
        for (const tc of toolCalls) {
          const fn = tc.function as { name: string; arguments?: string };
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(fn.arguments || "{}");
          } catch {
            // ignore malformed args
          }
          const output = await opts.onToolCall(fn.name, args);
          msgs.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(output),
          });
        }
        continue;
      }
      text = msg?.content ?? "";
      break;
    }
    return { text: text.trim() };
  }
}

/** Offline fallback so the app works without any AI keys. */
class MockClient implements AiClient {
  async draftEmail(input: EmailDraftInput): Promise<EmailDraft> {
    const greeting = input.customerName
      ? `Dear ${input.customerName},`
      : "Hello,";
    const sign = input.senderName ?? "The Team";
    const body = [
      greeting,
      "",
      `I hope this message finds you well. I'm reaching out regarding ${input.purpose}.`,
      input.context ? `\n${input.context}\n` : "",
      "Please let me know if you have any questions — I'd be happy to help.",
      "",
      "Best regards,",
      sign,
    ]
      .filter((l) => l !== undefined)
      .join("\n");
    return { subject: `Regarding: ${input.purpose}`, body };
  }

  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    const last = messages[messages.length - 1]?.content ?? "";
    return {
      text:
        "I'm currently running in mock mode — no AI provider is configured. " +
        "Set AI_PROVIDER and an API key in the environment to enable real " +
        `responses.\n\nYou said: "${last}"`,
    };
  }

  async chatWithTools(messages: ChatMessage[]): Promise<ChatResult> {
    // Mock mode has no tool access; fall back to the plain reply.
    return this.chat(messages);
  }
}

export function getAiClient(): AiClient {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return new GeminiClient(
      process.env.GEMINI_API_KEY,
      // Use a `-latest` alias so the default doesn't break when a pinned model
      // version is retired. Override with GEMINI_MODEL when a specific model is needed.
      process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest",
    );
  }
  if (provider === "groq" && process.env.GROQ_API_KEY) {
    return new GroqClient(
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    );
  }
  return new MockClient();
}
