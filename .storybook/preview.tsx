import type { Preview } from '@storybook/react'
import '../src/styles/tokens.css'
import '../src/styles/global.css'

// Every story renders inside the app's real context: RTL, Heebo, token-driven
// background/foreground, and a light/dark toggle that mirrors the app's
// [data-theme="dark"] mechanism. The a11y addon runs axe on each story.
const preview: Preview = {
  parameters: {
    layout: 'padded',
    controls: { expanded: true, matchers: { color: /(background|color)$/i } },
    options: { storySort: { order: ['Design Tokens', 'Components'] } },
  },
  globalTypes: {
    theme: {
      description: 'ערכת נושא',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'בהיר' },
          { value: 'dark', title: 'כהה' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const dark = ctx.globals.theme === 'dark'
      return (
        <div
          dir="rtl"
          data-theme={dark ? 'dark' : undefined}
          style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Heebo', system-ui, sans-serif", padding: 24, minHeight: 160 }}
        >
          <Story />
        </div>
      )
    },
  ],
}
export default preview
