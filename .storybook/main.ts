import type { StorybookConfig } from '@storybook/react-vite'

// Storybook for Sensei's reusable presentational components + design tokens.
// The app is otherwise inline-styled per screen (see ARCHITECTURE.md); only the
// genuinely shared, prop-isolated components and the CSS-variable token system
// are documented here — the single source of truth remains the code.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Serve public/ so the bundled Heebo @font-face (url('/fonts/…')) resolves.
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
}
export default config
