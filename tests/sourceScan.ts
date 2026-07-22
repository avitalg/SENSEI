// Shared helpers for the source-scanning guards (canonical / tokenReferences).
//
// Why this exists: the repo checks out with CRLF on Windows, so `split('\n')`
// leaves a trailing '\r' on every line. In JavaScript `.` does NOT match '\r'
// (it is a line terminator), so the comment-strip regex /\/\/.*$/ silently fails
// to match — comments were NOT stripped on Windows, while they were on Linux CI.
// The guards then flagged illustrative prose inside comments (an em dash next to
// Hebrew, a literal `var(--token)`) as real violations. Platform-dependent guard
// behaviour is worse than a noisy guard: it trains people to ignore red locally.

/** Split source into lines, tolerating both LF and CRLF checkouts. */
export const sourceLines = (text: string): string[] => text.split(/\r?\n/);

/**
 * Drop a trailing `// …` line comment so guards only inspect real code.
 * Requires a CRLF-safe line (use `sourceLines`), otherwise the trailing '\r'
 * defeats the `$` anchor.
 */
export const stripLineComment = (line: string): string => line.replace(/\/\/.*$/, '');
