// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';
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
