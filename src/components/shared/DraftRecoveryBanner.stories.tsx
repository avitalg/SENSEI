import type { Meta, StoryObj } from '@storybook/react'
import { fn } from '@storybook/test'
import DraftRecoveryBanner from './DraftRecoveryBanner'

// The one canonical "unsaved draft" recovery banner, shared by every auto-saving
// editor (clinical summaries, patient notes). Pure/presentational — the caller
// owns the draft state and passes resume/discard handlers.
const meta = {
  title: 'Components/DraftRecoveryBanner',
  component: DraftRecoveryBanner,
  parameters: { layout: 'padded' },
  args: { onResume: fn(), onDiscard: fn() },
  argTypes: { message: { control: 'text' } },
} satisfies Meta<typeof DraftRecoveryBanner>

export default meta
type Story = StoryObj<typeof meta>

// Default copy — the wording used across the app.
export const Default: Story = {}

// The caller can override the message for a specific editor context.
export const CustomMessage: Story = {
  args: { message: 'נמצאה טיוטת סיכום שלא נשמרה. לשחזר אותה?' },
}
