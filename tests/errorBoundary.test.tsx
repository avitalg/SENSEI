// Verifies the page-level error boundary: a throwing screen renders the
// recoverable fallback (role="alert") instead of white-screening, and a
// resetKey change (navigation) clears the error.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ErrorBoundary from '../src/components/shared/ErrorBoundary'

function Boom(): JSX.Element { throw new Error('boom') }
function Fine() { return <div>ok content</div> }

afterEach(cleanup)

describe('ErrorBoundary', () => {
  it('renders a recoverable alert instead of crashing when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary resetKey="a"><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('משהו השתבש במסך הזה')).toBeInTheDocument()
    // observability: the caught error is logged (not swallowed silently)
    expect(spy).toHaveBeenCalledWith('[ErrorBoundary] render error on route:', 'a', expect.any(Error), expect.anything())
    spy.mockRestore()
  })

  it('recovers (clears the error) when resetKey changes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender } = render(<ErrorBoundary resetKey="a"><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    rerender(<ErrorBoundary resetKey="b"><Fine /></ErrorBoundary>)
    expect(screen.getByText('ok content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    spy.mockRestore()
  })

  it('passes children through unchanged when there is no error', () => {
    render(<ErrorBoundary resetKey="a"><Fine /></ErrorBoundary>)
    expect(screen.getByText('ok content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
