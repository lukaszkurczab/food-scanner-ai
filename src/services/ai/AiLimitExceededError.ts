import type { AiUsageStatus } from "@/services/ai/contracts";

export class AiLimitExceededError extends Error {
  readonly code = "ai/limit-exceeded";
  readonly usage?: AiUsageStatus;

  constructor(message = "AI usage limit exceeded", usage?: AiUsageStatus) {
    super(message);
    this.name = "AiLimitExceededError";
    this.usage = usage;
  }
}
