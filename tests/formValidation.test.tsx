// Form validation + error-state accessibility — the add-patient dialog.
// Verifies the required-field validation path end to end: the error message
// renders, is announced (role="alert"), is programmatically connected to its
// field (aria-invalid + aria-describedby → a real element), focus moves to the
// first errored field (WCAG 3.3.1 / 2.4.3), and a valid submission succeeds.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any>) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 80)))
const submitBtn = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('יצירת מטופל')) as HTMLElement

afterEach(() => { cleanup(); localStorage.clear() })

async function openAddPatient() {
  const { container } = mount({ view: 'app', route: 'patients' })
  await settle()
  const addBtn = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('מטופל חדש')) as HTMLElement
  fireEvent.click(addBtn)
  await waitFor(() => expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy())
  return container
}

describe('add-patient form — validation & error-state a11y', () => {
  it('empty submit shows an announced error wired to the field, and moves focus there', async () => {
    await openAddPatient()
    fireEvent.click(submitBtn())

    // the error renders (async validation) — poll rather than a fixed delay so the test
    // is deterministic under parallel load
    await waitFor(() => expect(document.getElementById('err-name')).toBeTruthy())
    const nameErr = document.getElementById('err-name')!
    expect(nameErr.getAttribute('role')).toBe('alert')
    expect(nameErr.textContent).toContain('שם')

    // the field is marked invalid and described by that error element
    const nameInput = document.querySelector('[data-field="name"]') as HTMLElement
    expect(nameInput.getAttribute('aria-invalid')).toBe('true')
    expect(nameInput.getAttribute('aria-describedby')).toBe('err-name')

    // focus moved to the first errored field — polled (focus is applied asynchronously,
    // so assert with waitFor rather than a fixed delay to stay deterministic under load)
    await waitFor(() => expect(document.activeElement).toBe(nameInput))
  })

  it('an invalid age (out of range) is rejected with a specific message', async () => {
    await openAddPatient()
    fireEvent.input(document.querySelector('[data-field="name"]')!, { target: { value: 'דוד כהן' } })
    fireEvent.input(document.querySelector('[data-field="age"]')!, { target: { value: '200' } })
    await settle()
    fireEvent.click(submitBtn())
    await waitFor(() => expect(document.getElementById('err-age')).toBeTruthy())
    expect(document.getElementById('err-age')!.textContent).toMatch(/120/) // "…גיל בין 1 ל-120"
    expect(document.querySelector('[role="dialog"][aria-modal="true"]'), 'dialog stays open on invalid input').toBeTruthy()
  })

  it('a valid submission adds the patient and closes the dialog', async () => {
    await openAddPatient()
    fireEvent.input(document.querySelector('[data-field="name"]')!, { target: { value: 'ישראל ישראלי' } })
    fireEvent.input(document.querySelector('[data-field="age"]')!, { target: { value: '40' } })
    await settle()
    fireEvent.click(submitBtn())
    // dialog closes + the new patient appears (async) — poll for determinism under load
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeFalsy())
    expect(document.body.textContent).toContain('ישראל ישראלי') // new patient shown in the list
  })

  it('required fields expose aria-required to assistive tech (not just the visual asterisk)', async () => {
    await openAddPatient()
    // the visual "*" alone is ambiguous when read aloud; the input must be
    // programmatically required (WCAG 3.3.2)
    expect(document.querySelector('[data-field="name"]')?.getAttribute('aria-required')).toBe('true')
    expect(document.querySelector('[data-field="age"]')?.getAttribute('aria-required')).toBe('true')
    // and the optional notes field must NOT claim to be required
    const notes = document.querySelector('textarea[aria-label="הערות קליניות"]')
    if (notes) expect(notes.getAttribute('aria-required')).not.toBe('true')
  })
})
