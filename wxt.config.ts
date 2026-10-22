import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifest: {
    name: 'Geja Time Tracker - Redmine',
    description: 'Controle de tempo para Redmine',
    version: '0.1.0',
    icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
    permissions: ['storage', 'sidePanel', 'windows', 'scripting'],
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    action: { default_title: 'Geja Time Tracker - Redmine', default_popup: 'popup.html' },
    side_panel: { default_path: 'sidepanel.html' },
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'" }
  }
});
