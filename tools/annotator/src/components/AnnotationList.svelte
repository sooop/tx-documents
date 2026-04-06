<script lang="ts">
  import { state as appState, removeAnnotation, reorderAnnotations, renumberAnnotations } from '../lib/state.svelte';
  import { saveAnnotation } from '../lib/api';
  import type { Annotation } from '../lib/types';

  const LANGS = ['ko', 'en', 'ja', 'zh-hk', 'zh-cn'];
  let copyLang = $state('en');
  let copying = $state(false);

  function typeIcon(ann: Annotation): string {
    switch (ann.type) {
      case 'marker': return '●';
      case 'box': return '□';
      case 'arrow': return '↗';
      case 'line': return '─';
    }
  }

  function annLabel(ann: Annotation): string {
    if (ann.type === 'marker') return `${ann.number}`;
    if (ann.type === 'box') return ann.number != null ? `${ann.number}` : ann.id.slice(0, 8);
    return ann.id.slice(0, 8);
  }

  // 드래그 앤 드롭 정렬
  let dragIdx: number | null = null;

  function onDragstart(idx: number) { dragIdx = idx; }
  function onDragover(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const anns = [...appState.annotations];
    const [moved] = anns.splice(dragIdx, 1);
    anns.splice(idx, 0, moved);
    reorderAnnotations(anns);
    dragIdx = idx;
  }
  function onDragend() { dragIdx = null; }

  async function copyToLang() {
    if (!appState.currentImage || !copyLang) return;
    copying = true;
    try {
      const { section, name } = appState.currentImage;
      await saveAnnotation(section, name, copyLang, {
        imageId: name,
        annotations: appState.annotations,
      });
      alert(`${copyLang} 언어로 복사했습니다.`);
    } catch (err) {
      alert(String(err));
    } finally {
      copying = false;
    }
  }
</script>

<div class="list-panel">
  <div class="list-header">
    <span class="title">어노테이션 ({appState.annotations.length})</span>
    <button class="renum-btn" onclick={renumberAnnotations} title="번호 재부여">재번호</button>
  </div>

  <div class="list">
    {#each appState.annotations as ann, idx (ann.id)}
      <div
        class="item"
        class:selected={appState.selectedId === ann.id}
        draggable="true"
        ondragstart={() => onDragstart(idx)}
        ondragover={(e) => onDragover(e, idx)}
        ondragend={onDragend}
        onclick={() => { appState.selectedId = ann.id; }}
        role="option"
        aria-selected={appState.selectedId === ann.id}
      >
        <span class="type-icon">{typeIcon(ann)}</span>
        <span class="ann-label">{ann.type} {annLabel(ann)}</span>
        <button
          class="del-btn"
          onclick={(e) => { e.stopPropagation(); removeAnnotation(ann.id); }}
          title="삭제"
        >×</button>
      </div>
    {/each}
    {#if appState.annotations.length === 0}
      <div class="empty">어노테이션 없음</div>
    {/if}
  </div>

  {#if appState.currentImage}
    <div class="copy-row">
      <select bind:value={copyLang} class="lang-select">
        {#each LANGS.filter(l => l !== appState.currentImage?.lang) as l}
          <option value={l}>{l}</option>
        {/each}
      </select>
      <button class="copy-btn" disabled={copying} onclick={copyToLang}>
        {copying ? '복사 중...' : '→ 복사'}
      </button>
    </div>
  {/if}
</div>

<style>
  .list-panel {
    display: flex;
    flex-direction: column;
    border-top: 1px solid #333;
    max-height: 240px;
    flex-shrink: 0;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 8px;
    border-bottom: 1px solid #2a2a2a;
    flex-shrink: 0;
  }

  .title {
    font-size: 11px;
    color: #777;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .renum-btn {
    font-size: 10px;
    padding: 2px 8px;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #aaa;
    border-radius: 3px;
    cursor: pointer;
  }
  .renum-btn:hover { background: #3a3a3a; }

  .list {
    flex: 1;
    overflow-y: auto;
  }

  .item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    cursor: pointer;
    border-bottom: 1px solid #222;
    transition: background 0.1s;
  }
  .item:hover { background: #2a2a2a; }
  .item.selected { background: #1a3060; }

  .type-icon {
    font-size: 11px;
    color: #888;
    width: 14px;
    text-align: center;
    flex-shrink: 0;
  }

  .ann-label {
    flex: 1;
    font-size: 11px;
    color: #ccc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .del-btn {
    background: transparent;
    border: none;
    color: #555;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    padding: 0 2px;
    flex-shrink: 0;
  }
  .del-btn:hover { color: #ff6b6b; }

  .empty {
    font-size: 11px;
    color: #444;
    text-align: center;
    padding: 12px;
  }

  .copy-row {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    border-top: 1px solid #2a2a2a;
    flex-shrink: 0;
  }

  .lang-select {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #ccc;
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 11px;
  }

  .copy-btn {
    padding: 2px 10px;
    background: #2a3a4a;
    border: 1px solid #3a5a6a;
    color: #7aabe0;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    white-space: nowrap;
  }
  .copy-btn:disabled { opacity: 0.5; cursor: default; }
  .copy-btn:hover:not(:disabled) { background: #3a4a5a; }
</style>
