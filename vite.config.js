import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const leagueGothicSource = readFileSync(
  new URL('./public/fonts/league-gothic-regular.woff2', import.meta.url),
).toString('base64');

const criticalIdentityFont = {
  name: 'critical-identity-font',
  transformIndexHtml() {
    return [
      {
        tag: 'style',
        attrs: { 'data-critical-font': 'league-gothic' },
        children: `@font-face{font-family:'League Gothic';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${leagueGothicSource}) format('woff2')}`,
        injectTo: 'head-prepend',
      },
    ];
  },
};

export default defineConfig({
  plugins: [criticalIdentityFont, react()],
});
