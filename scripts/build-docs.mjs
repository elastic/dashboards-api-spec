import { execSync } from 'node:child_process';

const theme = {
  'typography.fontSize': '14px',
  'typography.fontFamily': 'Inter,ui-sans-serif,system-ui,sans-serif',
  'typography.code.fontFamily': 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace',
  'colors.primary.main': '#0b64dd',
  'colors.text.primary': '#343741',
  'colors.text.secondary': '#516381',
  'sidebar.backgroundColor': '#f6f9fc',
  'sidebar.textColor': '#343741',
  'sidebar.activeTextColor': '#0b64dd',
  'rightPanel.backgroundColor': '#111c2c',
  'rightPanel.textColor': '#ffffff',
  'codeBlock.backgroundColor': '#22272e',
};

const themeFlags = Object.entries(theme)
  .map(([k, v]) => `--theme.openapi.${k}=${v}`)
  .join(' ');

const cmd = [
  'redocly build-docs generated/dashboard-openapi.yaml',
  '--output dist/index.html',
  '--title "Dashboard API Reference"',
  '--disableGoogleFont',
  '--template scripts/redoc-template.hbs',
  themeFlags,
].join(' ');

execSync(cmd, { stdio: 'inherit' });
