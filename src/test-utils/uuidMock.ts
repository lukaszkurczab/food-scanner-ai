let counter = 0;

function toUuidSequence(value: number): string {
  const hex = value.toString(16).padStart(12, "0").slice(-12);
  return `00000000-0000-4000-8000-${hex}`;
}

export function v4(): string {
  counter += 1;
  return toUuidSequence(counter);
}

