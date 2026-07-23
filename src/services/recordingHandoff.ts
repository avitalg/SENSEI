// In-memory handoff for a just-recorded session file on its way into the
// upload pipeline. The app store persists to localStorage, so a File/Blob must
// never live in S — the recorder stashes the file here, navigates to the upload
// screen with the right patient selected, and UploadPage takes (and clears) it
// on mount, feeding it through the exact same validation + pipeline as a
// hand-picked file. Get-and-clear semantics: a recording is consumed once.
let pending: File | null = null;

export function stashRecording(file: File): void {
  pending = file;
}

/** The pending recording, if any — clears it so it can't be double-consumed. */
export function takeRecording(): File | null {
  const f = pending;
  pending = null;
  return f;
}
