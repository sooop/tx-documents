// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import { visit } from 'unist-util-visit';

/** @type {import('unified').Plugin} */
function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (/** @type {any} */ node) => {
      if (
        node.tagName === 'a' &&
        typeof node.properties?.href === 'string' &&
        /^https?:\/\//.test(node.properties.href)
      ) {
        node.properties.target = '_blank';
        node.properties.rel = ['noopener', 'noreferrer'];
        // CSS ::after 아이콘을 위한 마커 클래스 (빌드 타임 주입)
        const cls = node.properties.className;
        node.properties.className = [
          ...(Array.isArray(cls) ? cls : cls ? [cls] : []),
          'external-link',
        ];
      }
    });
  };
}

/** @returns {import('vite').Plugin} */
function watchAnnotationsAndImages() {
  return {
    name: 'watch-annotations-and-images',
    configureServer(server) {
      // public/images 하위 PNG 파일 감시 (기본적으로 감시 안 됨)
      server.watcher.add('public/images/**/*.png');
      server.watcher.add('public/images/**/*.jpg');
      server.watcher.add('public/images/**/*.jpeg');
      server.watcher.add('public/images/**/*.webp');

      const shouldReload = (/** @type {string} */ file) =>
        /public[\\/]images[\\/].*\.(png|jpe?g|webp)$/.test(file) ||
        /src[\\/]assets[\\/]images[\\/].*\.annotations\.json$/.test(file);

      const reload = (/** @type {string} */ file) => {
        if (shouldReload(file)) {
          server.ws.send({ type: 'full-reload' });
        }
      };

      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
      server.watcher.on('unlink', reload);
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [
    icon({
      include: {
        lucide: [
          'info',
          'alert-triangle',
          'shield-alert',
          'lightbulb',
          'chevron-right',
          'chevron-down',
          'external-link',
          'file-warning',
          'list',
          'mail',
          'message-circle',
        ],
        flagpack: [
          'jp', 'us', 'sg', 'tw', 'cn', 'hk',
          'th', 'vn', 'my', 'id', 'ph',
          'gb', 'de', 'fr', 'au', 'ca', 'kr',
        ],
        solar: [
          'gallery-wide-bold-duotone',
          'earth-bold-duotone',
          'cpu-bolt-bold-duotone',
          'box-bold-duotone',
          'route-bold-duotone',
          'user-check-rounded-bold-duotone',
          'wallet-money-bold-duotone',
          'checklist-bold-duotone',
          'delivery-bold-duotone',
          'map-point-wave-bold-duotone',
          // sidebar nav icons
          'shield-user-bold-duotone',
          'star-shine-bold-duotone',
          'user-plus-rounded-bold-duotone',
          'settings-bold-duotone',
          'archive-down-bold-duotone',
          'pen-new-square-bold-duotone',
          'undo-left-round-bold-duotone',
          'bill-list-bold-duotone',
          'question-circle-bold-duotone',
          'document-text-bold-duotone',
          'global-bold-duotone',
          'mailbox-bold-duotone',
          // callout background icons
          'info-circle-bold',
          'danger-triangle-bold',
          'shield-warning-bold',
          'lightbulb-bold',
        ],
      },
    }),
    mdx({
      rehypePlugins: [rehypeExternalLinks],
    }),
    svelte(),
  ],
  vite: {
    plugins: [tailwindcss(), watchAnnotationsAndImages()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
});
