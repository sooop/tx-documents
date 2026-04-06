import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { annotatorPlugin } from './server/plugin';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [svelte(), annotatorPlugin()],
  server: {
    port: 5174,
    fs: {
      allow: [PROJECT_ROOT, __dirname],
    },
    // public 폴더를 프로젝트 루트로 설정 (이미지 서빙)
    proxy: {},
  },
  // 프로젝트 루트의 public 폴더 정적 서빙
  publicDir: path.join(PROJECT_ROOT, 'public'),
});
