type ProcessEnvMap = Record<string, string | undefined>;

type ProcessLike = {
  env?: ProcessEnvMap;
};

type GlobalWithProcess = typeof globalThis & {
  process?: ProcessLike;
};

export function readPublicEnv(name: string): string | undefined {
  return (globalThis as GlobalWithProcess).process?.env?.[name];
}
