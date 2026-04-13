<script lang="ts">
  import { state as appState, updateAnnotation } from '../lib/state.svelte';
  import type { Annotation, BoxAnnotation, MarkerAnnotation, ArrowAnnotation, LineAnnotation, MosaicAnnotation } from '../lib/types';
  import { PALETTE, DEFAULT_COLOR } from '../lib/constants';

  const LANGS = ['ko', 'en', 'ja', 'zh-hk', 'zh-cn'];

  const selected = $derived(
    appState.selectedId ? appState.annotations.find(a => a.id === appState.selectedId) ?? null : null
  );

  function update(patch: Partial<Annotation>) {
    if (!selected) return;
    updateAnnotation(selected.id, patch);
  }

  function updateLabel(lang: string, value: string) {
    if (!selected) return;
    const label = { ...(selected.label ?? {}), [lang]: value || undefined };
    // 빈 값은 제거
    if (!value) delete label[lang];
    update({ label } as Partial<Annotation>);
  }

  function numericUpdate(key: string, value: string) {
    const n = parseFloat(value);
    if (!isNaN(n)) update({ [key]: n } as Partial<Annotation>);
  }
</script>

<div class="panel">
  {#if !selected}
    <div class="empty">어노테이션을 선택하세요</div>
  {:else}
    <div class="section-title">공통</div>
    <div class="field">
      <label>ID</label>
      <input class="inp" value={selected.id} readonly />
    </div>
    <div class="field">
      <label>타입</label>
      <input class="inp" value={selected.type} readonly />
    </div>

    <div class="section-title">레이블 (다국어)</div>
    {#each LANGS as lang}
      <div class="field">
        <label>{lang}</label>
        <input
          class="inp"
          value={selected.label?.[lang] ?? ''}
          oninput={(e) => updateLabel(lang, (e.target as HTMLInputElement).value)}
        />
      </div>
    {/each}

    {#if selected.type === 'marker'}
      {@const ann = selected as MarkerAnnotation}
      <div class="section-title">마커</div>
      <div class="field">
        <label>번호</label>
        <input class="inp num" type="number" value={ann.number} oninput={(e) => numericUpdate('number', (e.target as HTMLInputElement).value)} />
      </div>
      <div class="field-row">
        <div class="field">
          <label>X (%)</label>
          <input class="inp num" type="number" step="0.1" value={ann.x.toFixed(2)} oninput={(e) => numericUpdate('x', (e.target as HTMLInputElement).value)} />
        </div>
        <div class="field">
          <label>Y (%)</label>
          <input class="inp num" type="number" step="0.1" value={ann.y.toFixed(2)} oninput={(e) => numericUpdate('y', (e.target as HTMLInputElement).value)} />
        </div>
      </div>

    {:else if selected.type === 'box'}
      {@const ann = selected as BoxAnnotation}
      <div class="section-title">박스</div>
      <div class="field">
        <label>번호</label>
        <input class="inp num" type="number" value={ann.number ?? ''} placeholder="없음"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            update({ number: v ? parseInt(v) : undefined } as Partial<Annotation>);
          }}
        />
      </div>
      <div class="field-row">
        <div class="field"><label>X</label><input class="inp num" type="number" step="0.1" value={ann.x.toFixed(2)} oninput={(e) => numericUpdate('x', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>Y</label><input class="inp num" type="number" step="0.1" value={ann.y.toFixed(2)} oninput={(e) => numericUpdate('y', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>W</label><input class="inp num" type="number" step="0.1" value={ann.width.toFixed(2)} oninput={(e) => numericUpdate('width', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>H</label><input class="inp num" type="number" step="0.1" value={ann.height.toFixed(2)} oninput={(e) => numericUpdate('height', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field">
        <label>색상</label>
        <div class="palette">
          {#each PALETTE as color}
            <button
              class="swatch"
              class:selected={( ann.strokeColor ?? DEFAULT_COLOR) === color}
              style="background: {color}"
              onclick={() => update({ strokeColor: color })}
              title={color}
            ></button>
          {/each}
        </div>
      </div>

    {:else if selected.type === 'mosaic'}
      {@const ann = selected as MosaicAnnotation}
      <div class="section-title">모자이크</div>
      <div class="field-row">
        <div class="field"><label>X</label><input class="inp num" type="number" step="0.1" value={ann.x.toFixed(2)} oninput={(e) => numericUpdate('x', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>Y</label><input class="inp num" type="number" step="0.1" value={ann.y.toFixed(2)} oninput={(e) => numericUpdate('y', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>W</label><input class="inp num" type="number" step="0.1" value={ann.width.toFixed(2)} oninput={(e) => numericUpdate('width', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>H</label><input class="inp num" type="number" step="0.1" value={ann.height.toFixed(2)} oninput={(e) => numericUpdate('height', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field">
        <label>픽셀 크기 (1–20px)</label>
        <div class="slider-row">
          <input
            type="range"
            class="slider"
            min="1"
            max="20"
            value={ann.pixelSize}
            oninput={(e) => numericUpdate('pixelSize', (e.target as HTMLInputElement).value)}
          />
          <span class="slider-val">{ann.pixelSize}px</span>
        </div>
      </div>

    {:else if selected.type === 'arrow' || selected.type === 'line'}
      {@const ann = selected as ArrowAnnotation | LineAnnotation}
      <div class="section-title">{selected.type === 'arrow' ? '화살표' : '직선'}</div>
      <div class="field-row">
        <div class="field"><label>시작X</label><input class="inp num" type="number" step="0.1" value={ann.fromX.toFixed(2)} oninput={(e) => numericUpdate('fromX', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>시작Y</label><input class="inp num" type="number" step="0.1" value={ann.fromY.toFixed(2)} oninput={(e) => numericUpdate('fromY', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>끝X</label><input class="inp num" type="number" step="0.1" value={ann.toX.toFixed(2)} oninput={(e) => numericUpdate('toX', (e.target as HTMLInputElement).value)} /></div>
        <div class="field"><label>끝Y</label><input class="inp num" type="number" step="0.1" value={ann.toY.toFixed(2)} oninput={(e) => numericUpdate('toY', (e.target as HTMLInputElement).value)} /></div>
      </div>
      <div class="field">
        <label>색상</label>
        <div class="palette">
          {#each PALETTE as color}
            <button
              class="swatch"
              class:selected={(ann.strokeColor ?? DEFAULT_COLOR) === color}
              style="background: {color}"
              onclick={() => update({ strokeColor: color })}
              title={color}
            ></button>
          {/each}
        </div>
      </div>
      <div class="field">
        <label>굵기</label>
        <input class="inp num" type="number" min="1" max="20" value={ann.strokeWidth ?? 3} oninput={(e) => numericUpdate('strokeWidth', (e.target as HTMLInputElement).value)} />
      </div>
    {/if}
  {/if}
</div>

<style>
  .panel {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
  }

  .empty {
    color: #555;
    font-size: 12px;
    padding: 16px 0;
    text-align: center;
  }

  .section-title {
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    margin: 10px 0 5px;
    border-top: 1px solid #2a2a2a;
    padding-top: 8px;
  }
  .section-title:first-child { border-top: none; margin-top: 0; padding-top: 0; }

  .field {
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }

  .field-row {
    display: flex;
    gap: 6px;
  }

  label {
    font-size: 10px;
    color: #777;
  }

  .inp {
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #e0e0e0;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 11px;
    width: 100%;
  }
  .inp:read-only { color: #666; }
  .inp.num { text-align: right; }

  .palette {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: border-color 0.1s, transform 0.1s;
  }
  .swatch:hover { transform: scale(1.15); }
  .swatch.selected { border-color: #fff; }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .slider {
    flex: 1;
    accent-color: #4a9eff;
    cursor: pointer;
  }

  .slider-val {
    font-size: 11px;
    color: #aaa;
    min-width: 28px;
    text-align: right;
  }
</style>
