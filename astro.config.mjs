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
    plugins: [tailwindcss()],
    server: {
      watch: {
        usePolling: true,
      },
    },
  },
});
