// Tasks screen management flows — inline rename (no delete-and-recreate),
// composer feedback instead of a silent no-op, accessible filter state, and
// contextual empty states that match the active filter.
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { AppStoreProvider } from '../src/store/AppStore'
import App from '../src/App'

const PKEY = 'sensei_session_react_v1'
function mount(patch: Record<string, any> = {}) {
  localStorage.setItem(PKEY, JSON.stringify({ __savedAt: Date.now(), view: 'app', route: 'tasks', ...patch }))
  return render(<AppStoreProvider><App /></AppStoreProvider>)
}
const settle = () => act(() => new Promise((r) => setTimeout(r, 90)))
afterEach(() => { cleanup(); localStorage.clear() })

describe('tasks — inline rename', () => {
  it('the pencil edits in place; Enter saves the new text', async () => {
    mount()
    await settle()
    const pencil = await waitFor(() => {
      const b = document.querySelector('[aria-label^="עריכת משימה:"]') as HTMLElement
      expect(b).toBeTruthy(); return b
    })
    fireEvent.click(pencil)
    const box = document.querySelector('input[aria-label="עריכת תיאור המשימה"]') as HTMLInputElement
    expect(box).toBeTruthy()
    fireEvent.change(box, { target: { value: 'טקסט משימה מעודכן' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await settle()
    expect(document.body.textContent).toContain('טקסט משימה מעודכן')
    expect(document.querySelector('input[aria-label="עריכת תיאור המשימה"]'), 'edit mode closed').toBeFalsy()
  })

  it('Escape cancels the edit without saving and without closing anything else', async () => {
    mount()
    await settle()
    const firstTaskText = (document.querySelector('[aria-label^="עריכת משימה:"]') as HTMLElement).getAttribute('aria-label')!.replace('עריכת משימה: ', '')
    fireEvent.click(document.querySelector('[aria-label^="עריכת משימה:"]') as HTMLElement)
    const box = document.querySelector('input[aria-label="עריכת תיאור המשימה"]') as HTMLInputElement
    fireEvent.change(box, { target: { value: 'לא לשמור את זה' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    await settle()
    expect(document.body.textContent).not.toContain('לא לשמור את זה')
    expect(document.body.textContent).toContain(firstTaskText)
  })
})

describe('tasks — composer feedback & filter accessibility', () => {
  it('adding with an empty description gives guidance instead of a silent no-op', async () => {
    mount()
    await settle()
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent?.includes('הוספה')) as HTMLElement)
    await waitFor(() => expect(document.body.textContent).toContain('הזינו תיאור משימה'))
  })

  it('the active filter chip exposes aria-pressed', async () => {
    mount({ taskFilter: 'open' })
    await settle()
    const pressed = [...document.querySelectorAll('[aria-pressed="true"]')].map((e) => e.textContent || '')
    expect(pressed.some((t) => t.includes('פתוחות')), 'the open filter reads as pressed').toBe(true)
    expect(document.querySelectorAll('[aria-pressed="false"]').length).toBeGreaterThanOrEqual(4)
  })
})

describe('tasks — contextual empty states', () => {
  it('an empty filtered view offers a one-click way back to all tasks', async () => {
    // seed: only done tasks → the "overdue" filter view is empty but tasks exist
    mount({ taskFilter: 'overdue', tasks: [{ id: 't1', text: 'הושלמה', patient: '', patientId: '', due: 'היום', overdue: false, priority: 'low', done: true }] })
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('אין משימות פתוחות בסינון הזה'))
    fireEvent.click([...document.querySelectorAll('button')].find((b) => b.textContent === 'הצגת כל המשימות') as HTMLElement)
    await settle()
    expect(document.body.textContent).toContain('הושלמה')
  })

  it('the done filter, when empty, explains what will appear — no false praise', async () => {
    mount({ taskFilter: 'done', tasks: [{ id: 't1', text: 'פתוחה', patient: '', patientId: '', due: 'היום', overdue: false, priority: 'low', done: false }] })
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('משימות שתסמנו כהושלמו יופיעו כאן'))
  })

  it('with no tasks at all, the empty state points at the composer', async () => {
    mount({ tasks: [] })
    await settle()
    await waitFor(() => expect(document.body.textContent).toContain('הוסיפו את המשימה הראשונה'))
  })
})
