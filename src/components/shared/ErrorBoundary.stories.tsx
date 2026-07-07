import type { Meta, StoryObj } from '@storybook/react'
import ErrorBoundary from './ErrorBoundary'

// The page-level error boundary's recovery UI — states users rarely see in the
// running app, documented here so design/QA can review both variants in light and
// dark. A child that throws during render triggers the boundary; the thrown
// message decides which recovery card renders (stale-chunk vs generic).
function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

const meta = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'fullscreen' },
  // Defaults satisfy the required props; the render-based stories below ignore them.
  args: { children: null, resetKey: 'demo' },
} satisfies Meta<typeof ErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

// A generic render error → the recoverable "something went wrong" card
// ("העבודה שלכם נשמרה") with a back-to-home action.
export const GenericError: Story = {
  render: () => (
    <ErrorBoundary resetKey="demo">
      <Boom message="Cannot read properties of undefined (reading 'x')" />
    </ErrorBoundary>
  ),
}

// A stale-chunk error after a deploy → the "new version available" card
// ("גרסה חדשה של סנסיי זמינה") whose only working action is a reload.
export const NewVersionAvailable: Story = {
  render: () => (
    <ErrorBoundary resetKey="demo">
      <Boom message="Failed to fetch dynamically imported module: /assets/Page-abc123.js" />
    </ErrorBoundary>
  ),
}
