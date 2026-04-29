import type { AiChatRunRequest } from "@/services/ai/contracts";

export const AI_CHAT_RUN_REQUEST_MINIMAL_CONTRACT = {
  threadId: "thread-1",
  clientMessageId: "client-1",
  message: "Summarize today's nutrition.",
  language: "en",
} satisfies AiChatRunRequest;

export const AI_CHAT_RUN_REQUEST_REJECTS_MEALS = {
  threadId: "thread-1",
  clientMessageId: "client-1",
  message: "Summarize today's nutrition.",
  language: "en",
  // @ts-expect-error AI Chat v2 request must stay backend-owned; do not send raw meals history.
  meals: [],
} satisfies AiChatRunRequest;

export const AI_CHAT_RUN_REQUEST_REJECTS_PROFILE = {
  threadId: "thread-1",
  clientMessageId: "client-1",
  message: "Summarize today's nutrition.",
  language: "en",
  // @ts-expect-error AI Chat v2 request must stay backend-owned; do not send frontend profile payloads.
  profile: {},
} satisfies AiChatRunRequest;
