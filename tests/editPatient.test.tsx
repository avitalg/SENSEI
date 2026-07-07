// Edit-patient flow — the EDIT branch of the shared patient dialog (add is covered
// by formValidation.test). Verifies the row's edit control opens a modal PRE-FILLED
// with the existing patient's name, and that renaming + saving closes the dialog and
// surfaces the new name in the roster. The old name is read straight from the
// prefilled input so the assertions hold regardless of list sort order / pagination.
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
afterEach(() => { cleanup(); localStorage.clear() })

// A deterministic two-patient roster with distinct, non-duplicate names (no dedup banner).
const PATIENTS = [
  { id: 'p1', name: 'דנה לוי', age: 34, gender: 'נ', focus: 'חרדה', risk: 'medium', sessions: 8, lastSession: '22.06.2026', phone: '054-1234567', email: 'dana@mail.com', since: '01.2025', initials: 'דל', color: '#1F63D6' },
  { id: 'p2', name: 'יוסי מזרחי', age: 41, gender: 'ז', focus: 'דיכאון', risk: 'low', sessions: 12, lastSession: '20.06.2026', phone: '052-7654321', email: 'yossi@mail.com', since: '09.2024', initials: 'ימ', color: '#2E6BA8' },
]

const dialog = () => document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement
const nameField = () => document.querySelector('[data-field="name"]') as HTMLInputElement
const list = () => document.querySelector('#main-content') as HTMLElement
const firstEditBtn = () => document.querySelector('[aria-label="עריכת מטופל"]') as HTMLElement
const saveBtn = () => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('שמירת שינויים')) as HTMLElement

async function openEditFirst() {
  mount({ view: 'app', route: 'patients', patients: PATIENTS })
  await settle()
  await waitFor(() => expect(firstEditBtn()).toBeTruthy())
  fireEvent.click(firstEditBtn())
  await waitFor(() => expect(dialog()).toBeTruthy())
  return dialog()
}

describe('edit patient — prefilled dialog & rename', () => {
  it('opens a modal prefilled with the patient\'s existing name', async () => {
    await openEditFirst()
    // the shared form is in EDIT mode (its heading + save label are the edit copy)
    expect(dialog().textContent).toContain('עריכת מטופל')
    expect(saveBtn(), 'the edit dialog exposes a save-changes action').toBeTruthy()
    // the name field is prefilled with a real, non-empty seeded name
    const val = nameField().value
    expect(val, 'name input is prefilled').toBeTruthy()
    expect(PATIENTS.map((p) => p.name)).toContain(val)
  })

  it('renaming and saving closes the dialog and shows the new name in the roster', async () => {
    await openEditFirst()
    const oldName = nameField().value
    const newName = 'שם חדש לבדיקה'

    fireEvent.input(nameField(), { target: { value: newName } })
    await waitFor(() => expect(nameField().value).toBe(newName))

    fireEvent.click(saveBtn())

    // the dialog closes and the roster now shows the new name (async store update — polled)
    await waitFor(() => expect(dialog(), 'dialog closes after save').toBeFalsy())
    await waitFor(() => expect(list().textContent, 'renamed patient appears').toContain(newName))
    expect(list().textContent, 'the old name is replaced').not.toContain(oldName)
  })
})
