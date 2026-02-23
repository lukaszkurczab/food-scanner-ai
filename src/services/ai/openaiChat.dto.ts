import { asString, isRecord } from "@/services/contracts/guards";

export type OpenAiChatResponseEnvelope = {
  content: string | null;
  hasError: boolean;
  errorCode: string | null;
};

export function parseOpenAiChatResponse(payload: unknown): OpenAiChatResponseEnvelope {
  if (!isRecord(payload)) {
    return { content: null, hasError: false, errorCode: null };
  }

  const errorRaw = payload.error;
  if (isRecord(errorRaw)) {
    const errorCode = asString(errorRaw.code) ?? null;
    return { content: null, hasError: true, errorCode };
  }

  const choicesRaw = payload.choices;
  if (!Array.isArray(choicesRaw)) {
    return { content: null, hasError: false, errorCode: null };
  }

  for (const choice of choicesRaw) {
    if (!isRecord(choice)) continue;
    const message = choice.message;
    if (!isRecord(message)) continue;
    const content = asString(message.content);
    if (content) return { content, hasError: false, errorCode: null };
  }

  return { content: null, hasError: false, errorCode: null };
}

