import { GoogleGenerativeAI } from "@google/generative-ai";

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

export type ChatResult = {
  text: string;
  usage?: TokenUsage;
};

export type ChatOptions = {
  /** System prompt establishing the assistant's persona/instructions. */
  systemInstruction?: string;
};

export interface AiClient {
  draftEmail(input: EmailDraftInput): Promise<EmailDraft>;
  /** Multi-turn chat. `messages` is the full history, oldest first. */
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
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
