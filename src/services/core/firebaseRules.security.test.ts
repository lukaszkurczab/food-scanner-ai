import { readFileSync } from "fs";
import path from "path";

const rulesPath = path.resolve(__dirname, "../../../firebaseRules.txt");
const rules = readFileSync(rulesPath, "utf8");

describe("firebaseRules security model v2", () => {
  it("locks billing writes and exposes owner-only reads on canonical billing paths", () => {
    expect(rules).toMatch(
      /match \/users\/\{userId\}\/billing\/main\/aiCredits\/current \{\s*allow read: if isOwner\(userId\);\s*allow write: if false;/m,
    );
    expect(rules).toMatch(
      /match \/users\/\{userId\}\/billing\/main\/aiCreditTransactions\/\{txId\} \{\s*allow read: if isOwner\(userId\);\s*allow write: if false;/m,
    );
  });

  it("uses user-owned feedback storage path and blocks legacy feedbacks path", () => {
    expect(rules).toMatch(
      /match \/feedback\/\{userId\}\/\{feedbackId\}\/\{filename\} \{\s*allow write: if isOwner\(userId\);\s*allow read: if isOwner\(userId\) \|\| isAdmin\(\);/m,
    );
    expect(rules).toMatch(/match \/feedbacks\/\{document=\*\*\} \{\s*allow read, write: if false;/m);
  });

  it("explicitly denies legacy top-level credits and gateway log collections", () => {
    expect(rules).toMatch(/match \/ai_credits\/\{document=\*\*\} \{\s*allow read, write: if false;/m);
    expect(rules).toMatch(
      /match \/ai_credit_transactions\/\{document=\*\*\} \{\s*allow read, write: if false;/m,
    );
    expect(rules).toMatch(/match \/ai_gateway_logs\/\{document=\*\*\} \{\s*allow read, write: if false;/m);
  });

  it("keeps a deny-by-default fallback", () => {
    expect(rules).toMatch(/match \/\{document=\*\*\} \{\s*allow read, write: if false;/m);
  });
});
