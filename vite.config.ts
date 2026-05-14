import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';

const ADSENSE_ID_PATTERN = /^ca-pub-\d{16}$/;

function adsenseHeadPlugin(clientId: string): Plugin {
  const publisherId = clientId.replace(/^ca-/, '');

  return {
    name: 'pdfspark-adsense-head',
    transformIndexHtml(html: string) {
      if (!ADSENSE_ID_PATTERN.test(clientId)) return html;
      const tags: HtmlTagDescriptor[] = [
        {
          tag: 'meta',
          attrs: {
            name: 'google-adsense-account',
            content: clientId,
          },
          injectTo: 'head',
        },
        {
          tag: 'script',
          attrs: {
            async: true,
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`,
            crossorigin: 'anonymous',
          },
          injectTo: 'head',
        },
      ];

      return {
        html,
        tags,
      };
    },
    generateBundle() {
      if (!ADSENSE_ID_PATTERN.test(clientId)) return;

      this.emitFile({
        type: 'asset',
        fileName: 'ads.txt',
        source: `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react(), tailwindcss(), adsenseHeadPlugin(env.VITE_ADSENSE_CLIENT_ID || '')],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
