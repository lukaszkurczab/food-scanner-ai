import fs from "fs";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../../..");

const AI_CHAT_SOURCES = [
  "src/feature/AI",
  "src/hooks/useChatHistory.ts",
  "src/services/ai/chatThreadRepository.ts",
];

const FORBIDDEN_CHAT_ENDPOINT_SNIPPETS = [
  "/api/v1",
  "/ai/ask",
  "ai/ask",
];

function listFiles(target: string): string[] {
  const absolute = path.join(REPO_ROOT, target);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];

  const result: string[] = [];
  for (const entry of fs.readdirSync(absolute)) {
    const entryPath = path.join(absolute, entry);
    const entryStat = fs.statSync(entryPath);
    if (entryStat.isDirectory()) {
      result.push(...listFiles(path.relative(REPO_ROOT, entryPath)));
    } else if (/\.(ts|tsx)$/.test(entryPath)) {
      result.push(entryPath);
    }
  }
  return result;
}

describe("AI Chat v2 boundary", () => {
  it("does not use v1 or legacy ask endpoints in AI Chat sources", () => {
    const files = AI_CHAT_SOURCES.flatMap(listFiles);

    for (const file of files) {
      if (file.endsWith("aiChatBoundary.test.ts")) continue;
      const content = fs.readFileSync(file, "utf8");
      for (const forbidden of FORBIDDEN_CHAT_ENDPOINT_SNIPPETS) {
        expect(content).not.toContain(forbidden);
      }
    }
  });
});
