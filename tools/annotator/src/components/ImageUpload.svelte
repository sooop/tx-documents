<script lang="ts">
  import { uploadImage } from '../lib/api';

  interface Props { onUploaded?: () => void; }
  let { onUploaded }: Props = $props();

  let section = $state('');
  let name = $state('');
  let lang = $state('ko');
  let file: File | null = $state(null);
  let uploading = $state(false);
  let error = $state('');
  let dragOver = $state(false);

  const LANGS = ['ko', 'en', 'ja', 'zh-hk', 'zh-cn'];

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    const f = e.dataTransfer?.files[0];
    if (f && f.type.startsWith('image/')) file = f;
  }

  async function upload() {
    if (!file || !section || !name || !lang) { error = '모든 필드를 입력하세요.'; return; }
    uploading = true;
    error = '';
    try {
      await uploadImage(section, name, lang, file);
      file = null;
      section = '';
      name = '';
      onUploaded?.();
    } catch (err) {
      error = String(err);
    } finally {
      uploading = false;
    }
  }
</script>

<svelte:document
  onpaste={(e) => {
    const f = e.clipboardData?.files[0];
    if (f && f.type.startsWith('image/')) file = f;
  }}
/>

<div class="upload-panel">
  <div
    class="dropzone"
    class:over={dragOver}
    class:has-file={!!file}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => dragOver = false}
    ondrop={onDrop}
    role="region"
    aria-label="이미지 드롭 영역"
  >
    {#if file}
      <span class="file-name">{file.name}</span>
    {:else}
      <span>드래그 또는 붙여넣기</span>
    {/if}
  </div>

  <div class="field-row">
    <input placeholder="section" bind:value={section} class="input" />
    <input placeholder="name" bind:value={name} class="input" />
  </div>
  <div class="field-row">
    <select bind:value={lang} class="input">
      {#each LANGS as l}<option value={l}>{l}</option>{/each}
    </select>
    <button class="upload-btn" disabled={uploading || !file} onclick={upload}>
      {uploading ? '...' : '업로드'}
    </button>
  </div>
  {#if error}<div class="err">{error}</div>{/if}
</div>

<style>
  .upload-panel {
    padding: 8px;
    border-bottom: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .dropzone {
    border: 1px dashed #444;
    border-radius: 4px;
    padding: 10px;
    text-align: center;
    font-size: 11px;
    color: #666;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }
  .dropzone.over { border-color: #4a9eff; background: #1a2a3a; color: #4a9eff; }
  .dropzone.has-file { border-color: #4a7a4a; color: #8aaa8a; }
  .file-name { word-break: break-all; }
  .field-row { display: flex; gap: 4px; }
  .input {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #e0e0e0;
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 11px;
    min-width: 0;
  }
  .upload-btn {
    padding: 3px 10px;
    background: #2d4a2d;
    border: 1px solid #3a6a3a;
    color: #8ece8e;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    flex-shrink: 0;
  }
  .upload-btn:disabled { opacity: 0.5; cursor: default; }
  .err { font-size: 10px; color: #ff6b6b; }
</style>
