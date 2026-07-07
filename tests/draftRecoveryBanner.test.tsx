// Canonical DraftRecoveryBanner — one implementation for every editor's
// unsaved-draft recovery (summaries, notes, future editors). Locks the a11y
// contract and the resume/discard wiring the pages depend on.
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach } from 'vitest'
import DraftRecoveryBanner from '../src/components/shared/DraftRecoveryBanner'

afterEach(cleanup)

describe('DraftRecoveryBanner (canonical)', () => {
  it('announces politely (role=status) with text-labelled resume/discard buttons', () => {
    render(<DraftRecoveryBanner onResume={() => {}} onDiscard={() => {}} />)
    const banner = document.querySelector('[role="status"]') as HTMLElement
    expect(banner).toBeTruthy()
    expect(banner.textContent).toContain('יש טיוטה שלא נשמרה')
    expect([...banner.querySelectorAll('button')].map((b) => b.textContent))
      .toEqual(['המשך עריכה', 'מחיקת הטיוטה'])
  })

  it('wires the resume and discard handlers to their buttons', () => {
    const onResume = vi.fn(); const onDiscard = vi.fn()
    render(<DraftRecoveryBanner onResume={onResume} onDiscard={onDiscard} />)
    const btns = [...document.querySelectorAll('[role="status"] button')]
    fireEvent.click(btns[0]); expect(onResume).toHaveBeenCalledOnce()
    fireEvent.click(btns[1]); expect(onDiscard).toHaveBeenCalledOnce()
  })

  it('accepts an override message', () => {
    render(<DraftRecoveryBanner onResume={() => {}} onDiscard={() => {}} message="הודעה מותאמת" />)
    expect(document.querySelector('[role="status"]')?.textContent).toContain('הודעה מותאמת')
  })
})
