<script lang="ts">
  import { state as appState } from '../lib/state.svelte';
  import { saveAnnotation } from '../lib/api';
  import type { ToolMode } from '../lib/types';
  import { PALETTE } from '../lib/constants';

  interface Props {
    onSaved?: () => void;
  }
  let { onSaved }: Props = $props();

  let saving = $state(false);
  let saveError = $state('');

  const tools: { mode: ToolMode; label: string; key: string; icon: string }[] = [
    { mode: 'select', label: '선택 (V)', key: 'V', icon: '↖' },
    { mode: 'marker', label: '마크 (N)', key: 'N', icon: '●' },
    { mode: 'box',    label: '박스 (M)', key: 'M', icon: '□' },
    { mode: 'arrow',  label: '화살표 (B)', key: 'B', icon: '↗' },
    { mode: 'line',   label: '직선 (X)', key: 'X', icon: '─' },
  ];

  async function save() {
    if (!appState.currentImage) return;
    saving = true;
    saveError = '';
    try {
      const { section, name, lang } = appState.currentImage;
      await saveAnnotation(section, name, lang, {
        imageId: name,
        annotations: appState.annotations,
      });
      appState.dirty = false;
      onSaved?.();
    } catch (err) {
      saveError = String(err);
    } finally {
      saving = false;
    }
  }

  function zoomIn() { appState.zoom = Math.min(4, appState.zoom * 1.25); }
  function zoomOut() { appState.zoom = Math.max(0.25, appState.zoom / 1.25); }
  function zoomReset() { appState.zoom = 1; appState.panX = 0; appState.panY = 0; }

  // 키보드 단축키
  function onKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const tool = tools.find(t => t.key === e.key.toUpperCase());
    if (tool && !e.ctrlKey && !e.metaKey) { appState.activeTool = tool.mode; return; }
    if (e.ctrlKey && (e.key === '=' || e.key === '+')) { zoomIn(); e.preventDefault(); }
    if (e.ctrlKey && e.key === '-') { zoomOut(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 's') { save(); e.preventDefault(); }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="toolbar">
  <div class="tool-group">
    {#each tools as tool}
      <button
        class="tool-btn"
        class:active={appState.activeTool === tool.mode}
        onclick={() => { appState.activeTool = tool.mode; }}
        title={tool.label}
      >
        <span class="icon">{tool.icon}</span>
      </button>
    {/each}
  </div>

  <div class="tool-group">
    <span class="label">색상</span>
    <div class="palette">
      {#each PALETTE as color}
        <button
          class="swatch"
          class:active={appState.activeColor === color}
          style="background: {color}"
          onclick={() => { appState.activeColor = color; }}
          title={color}
        ></button>
      {/each}
    </div>
  </div>

  <div class="tool-group">
    <span class="label">시작 번호</span>
    <input
      type="number"
      class="number-input"
      min="1"
      bind:value={appState.startingNumber}
    />
  </div>

  <div class="tool-group zoom-group">
    <button class="icon-btn" onclick={zoomOut} title="줌 아웃 (Ctrl+-)">−</button>
    <button class="zoom-label" onclick={zoomReset} title="줌 리셋">
      {Math.round(appState.zoom * 100)}%
    </button>
    <button class="icon-btn" onclick={zoomIn} title="줌 인 (Ctrl+=)">+</button>
  </div>

  <div class="spacer"></div>

  {#if appState.currentImage}
    <span class="image-info">
      {appState.currentImage.section}/{appState.currentImage.name}-{appState.currentImage.lang}
    </span>
  {/if}

  {#if saveError}
    <span class="error">{saveError}</span>
  {/if}

  <button
    class="save-btn"
    class:dirty={appState.dirty}
    disabled={saving || !appState.currentImage}
    onclick={save}
    title="저장 (Ctrl+S)"
  >
    {saving ? '저장 중...' : (appState.dirty ? '● 저장' : '저장됨')}
  </button>
</div>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: #252525;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px;
    border-right: 1px solid #3a3a3a;
  }

  .tool-btn {
    width: 32px;
    height: 28px;
    background: transparent;
    border: 1px solid transparent;
    color: #aaa;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s;
  }
  .tool-btn:hover { background: #3a3a3a; color: #fff; }
  .tool-btn.active { background: #2d5a9e; border-color: #4a9eff; color: #fff; }

  .label {
    font-size: 11px;
    color: #888;
    margin-right: 4px;
  }

  .palette {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .swatch {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: border-color 0.1s, transform 0.1s;
  }
  .swatch:hover { transform: scale(1.2); }
  .swatch.active { border-color: #fff; }

  .number-input {
    width: 48px;
    background: #333;
    border: 1px solid #444;
    color: #e0e0e0;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
    text-align: center;
  }

  .zoom-group { gap: 4px; }

  .icon-btn {
    width: 24px;
    height: 24px;
    background: #333;
    border: 1px solid #444;
    color: #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-btn:hover { background: #444; }

  .zoom-label {
    min-width: 44px;
    text-align: center;
    font-size: 11px;
    color: #aaa;
    background: transparent;
    border: none;
    cursor: pointer;
  }
  .zoom-label:hover { color: #fff; }

  .spacer { flex: 1; }

  .image-info {
    font-size: 11px;
    color: #666;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error {
    font-size: 11px;
    color: #ff6b6b;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .save-btn {
    padding: 4px 14px;
    background: #2a3a2a;
    border: 1px solid #3a5a3a;
    color: #7ab87a;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    white-space: nowrap;
    transition: background 0.1s;
  }
  .save-btn:hover:not(:disabled) { background: #3a4a3a; }
  .save-btn.dirty { background: #2d4a2d; border-color: #4a9e4a; color: #8ece8e; }
  .save-btn:disabled { opacity: 0.5; cursor: default; }
</style>
