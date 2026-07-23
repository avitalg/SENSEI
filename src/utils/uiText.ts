/**
 * Keep backend and browser diagnostics out of the Hebrew interface.
 * A specific Hebrew message from the API is preserved; technical or English
 * diagnostics remain available to developer tooling but are not shown to users.
 */
export function hebrewUiError(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return /[\u0590-\u05FF]/.test(text) ? text : fallback;
}
