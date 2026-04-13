<script lang="ts">
  import { state as appState, addAnnotation, updateAnnotation, moveAnnotationForward, moveAnnotationBackward } from '../lib/state.svelte';
  import { pushHistory, pushRedo, undo as undoHistory, redo as redoHistory } from '../lib/history.svelte';
  import { generateId } from '../lib/id';
  import {
    clientToSvg, svgToPct, hitTest, hitHandle,
    getBoxHandles, getLineHandles, getMosaicHandles,
    resizeBox, resizeLine, resizeMosaic, moveAnnotation
  } from '../lib/canvas-math';
  import { HANDLE_RADIUS } from '../lib/constants';
  import AnnotationRenderer from './AnnotationRenderer.svelte';
  import type { HandleId, BoxAnnotation, ArrowAnnotation, LineAnnotation, MosaicAnnotation } from '../lib/types';

  interface Props {
    getProcessedBlob?: () => Promise<Blob | null>;
  }
  let { getProcessedBlob = $bindable(undefined) }: Props = $props();

  let svgEl: SVGSVGElement | undefined = $state();
  let containerEl: HTMLDivElement | undefined = $state();
  let mosaicCanvas: HTMLCanvasElement | undefined = $state();
  let imgEl: HTMLImageElement | undefined = $state();

  $effect(() => {
    getProcessedBlob = async () => {
      if (!imgEl || !nw || !nh) return null;
      const out = document.createElement('canvas');
      out.width = nw;
      out.height = nh;
      const ctx = out.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(imgEl, 0, 0, nw, nh);
      if (mosaicCanvas) ctx.drawImage(mosaicCanvas, 0, 0);
      return new Promise<Blob | null>(resolve => out.toBlob(resolve, 'image/png'));
    };
  });

  // 모자이크 캔버스 렌더링
  function drawMosaics() {
    if (!mosaicCanvas || !imgEl || !imgEl.complete || !appState.currentImage) return;
    const ctx = mosaicCanvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, nw, nh);
    const mosaics = appState.annotations.filter((a): a is MosaicAnnotation => a.type === 'mosaic');
    for (const ann of mosaics) {
      const rx = Math.round(ann.x * nw / 100);
      const ry = Math.round(ann.y * nh / 100);
      const rw = Math.round(ann.width * nw / 100);
      const rh = Math.round(ann.height * nh / 100);
      if (rw <= 0 || rh <= 0) continue;
      const ps = Math.max(1, ann.pixelSize);
      const offW = Math.max(1, Math.ceil(rw / ps));
      const offH = Math.max(1, Math.ceil(rh / ps));
      const off = document.createElement('canvas');
      off.width = offW;
      off.height = offH;
      const offCtx = off.getContext('2d')!;
      offCtx.drawImage(imgEl, rx, ry, rw, rh, 0, 0, offW, offH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(off, 0, 0, offW, offH, rx, ry, rw, rh);
    }
  }

  $effect(() => {
    // 의존성 추적: annotations 변경 또는 이미지 변경 시 재렌더링
    void appState.annotations;
    void appState.currentImage;
    drawMosaics();
  });

  // 드래그 상태
  let dragState: {
    mode: 'move' | 'resize' | 'draw-box' | 'draw-arrow' | 'draw-line' | 'draw-mosaic' | 'pan';
    startSvgX: number;
    startSvgY: number;
    lastSvgX: number;
    lastSvgY: number;
    annId?: string;
    handle?: HandleId;
    drawingId?: string;
  } | null = $state(null);

  let spaceHeld = $state(false);

  const nw = $derived(appState.currentImage?.naturalWidth ?? 0);
  const nh = $derived(appState.currentImage?.naturalHeight ?? 0);

  function getSvgCoords(e: MouseEvent) {
    if (!svgEl) return { x: 0, y: 0 };
    return clientToSvg(svgEl, e.clientX, e.clientY);
  }

  function onMousedown(e: MouseEvent) {
    if (!appState.currentImage || !svgEl) return;
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      dragState = { mode: 'pan', startSvgX: e.clientX, startSvgY: e.clientY, lastSvgX: e.clientX, lastSvgY: e.clientY };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    const { x: svgX, y: svgY } = getSvgCoords(e);
    const tool = appState.activeTool;

    if (tool === 'select') {
      if (appState.selectedId) {
        const selAnn = appState.annotations.find(a => a.id === appState.selectedId);
        if (selAnn) {
          let handles: Record<string, { x: number; y: number }> = {};
          if (selAnn.type === 'box') handles = getBoxHandles(selAnn, nw, nh);
          else if (selAnn.type === 'mosaic') handles = getMosaicHandles(selAnn as MosaicAnnotation, nw, nh);
          else if (selAnn.type === 'arrow' || selAnn.type === 'line') handles = getLineHandles(selAnn, nw, nh);

          const hid = hitHandle(handles, svgX, svgY, HANDLE_RADIUS + 4);
          if (hid) {
            pushHistory(appState.annotations);
            dragState = { mode: 'resize', startSvgX: svgX, startSvgY: svgY, lastSvgX: svgX, lastSvgY: svgY, annId: selAnn.id, handle: hid as HandleId };
            e.preventDefault();
            return;
          }
        }
      }
      const hitId = hitTest(appState.annotations, svgX, svgY, nw, nh);
      if (hitId) {
        appState.selectedId = hitId;
        pushHistory(appState.annotations);
        dragState = { mode: 'move', startSvgX: svgX, startSvgY: svgY, lastSvgX: svgX, lastSvgY: svgY, annId: hitId };
      } else {
        appState.selectedId = null;
      }
      return;
    }

    if (tool === 'marker') {
      const { x, y } = svgToPct(svgX, svgY, nw, nh);
      const nextNumber = getNextNumber();
      pushHistory(appState.annotations);
      addAnnotation({ id: generateId('marker'), type: 'marker', number: nextNumber, x, y });
      return;
    }

    if (tool === 'box') {
      const { x, y } = svgToPct(svgX, svgY, nw, nh);
      const id = generateId('box');
      pushHistory(appState.annotations);
      addAnnotation({ id, type: 'box', x, y, width: 0, height: 0, strokeColor: appState.activeColor } as BoxAnnotation);
      appState.selectedId = id;
      dragState = { mode: 'draw-box', startSvgX: svgX, startSvgY: svgY, lastSvgX: svgX, lastSvgY: svgY, drawingId: id };
      e.preventDefault();
      return;
    }

    if (tool === 'mosaic') {
      const { x, y } = svgToPct(svgX, svgY, nw, nh);
      const id = generateId('mosaic');
      pushHistory(appState.annotations);
      addAnnotation({ id, type: 'mosaic', x, y, width: 0, height: 0, pixelSize: appState.mosaicPixelSize } as MosaicAnnotation);
      appState.selectedId = id;
      dragState = { mode: 'draw-mosaic', startSvgX: svgX, startSvgY: svgY, lastSvgX: svgX, lastSvgY: svgY, drawingId: id };
      e.preventDefault();
      return;
    }

    if (tool === 'arrow' || tool === 'line') {
      const { x, y } = svgToPct(svgX, svgY, nw, nh);
      const id = generateId(tool);
      pushHistory(appState.annotations);
      if (tool === 'arrow') {
        addAnnotation({ id, type: 'arrow', fromX: x, fromY: y, toX: x, toY: y, strokeColor: appState.activeColor } as ArrowAnnotation);
      } else {
        addAnnotation({ id, type: 'line', fromX: x, fromY: y, toX: x, toY: y, strokeColor: appState.activeColor } as LineAnnotation);
      }
      appState.selectedId = id;
      dragState = {
        mode: tool === 'arrow' ? 'draw-arrow' : 'draw-line',
        startSvgX: svgX, startSvgY: svgY, lastSvgX: svgX, lastSvgY: svgY,
        drawingId: id
      };
      e.preventDefault();
    }
  }

  function onMousemove(e: MouseEvent) {
    if (!dragState || !appState.currentImage) return;

    if (dragState.mode === 'pan') {
      const dx = e.clientX - dragState.lastSvgX;
      const dy = e.clientY - dragState.lastSvgY;
      appState.panX += dx / appState.zoom;
      appState.panY += dy / appState.zoom;
      dragState.lastSvgX = e.clientX;
      dragState.lastSvgY = e.clientY;
      return;
    }

    const { x: svgX, y: svgY } = getSvgCoords(e);

    if (dragState.mode === 'move' && dragState.annId) {
      const ann = appState.annotations.find(a => a.id === dragState!.annId);
      if (!ann) return;
      const dX = svgX - dragState.lastSvgX;
      const dY = svgY - dragState.lastSvgY;
      updateAnnotation(ann.id, moveAnnotation(ann, dX, dY, nw, nh));
      dragState.lastSvgX = svgX;
      dragState.lastSvgY = svgY;
      return;
    }

    if (dragState.mode === 'resize' && dragState.annId && dragState.handle) {
      const ann = appState.annotations.find(a => a.id === dragState!.annId);
      if (!ann) return;
      if (ann.type === 'box') {
        updateAnnotation(ann.id, resizeBox(ann, dragState.handle, svgX, svgY, nw, nh));
      } else if (ann.type === 'mosaic') {
        updateAnnotation(ann.id, resizeMosaic(ann as MosaicAnnotation, dragState.handle, svgX, svgY, nw, nh));
      } else if (ann.type === 'arrow' || ann.type === 'line') {
        updateAnnotation(ann.id, resizeLine(ann, dragState.handle as 'from' | 'to', svgX, svgY, nw, nh));
      }
      return;
    }

    if (dragState.mode === 'draw-box' && dragState.drawingId) {
      const ann = appState.annotations.find(a => a.id === dragState!.drawingId) as BoxAnnotation | undefined;
      if (!ann) return;
      const startPct = svgToPct(dragState.startSvgX, dragState.startSvgY, nw, nh);
      const curPct = svgToPct(svgX, svgY, nw, nh);
      updateAnnotation(ann.id, {
        x: Math.min(startPct.x, curPct.x),
        y: Math.min(startPct.y, curPct.y),
        width: Math.abs(curPct.x - startPct.x),
        height: Math.abs(curPct.y - startPct.y),
      });
      return;
    }

    if (dragState.mode === 'draw-mosaic' && dragState.drawingId) {
      const startPct = svgToPct(dragState.startSvgX, dragState.startSvgY, nw, nh);
      const curPct = svgToPct(svgX, svgY, nw, nh);
      updateAnnotation(dragState.drawingId, {
        x: Math.min(startPct.x, curPct.x),
        y: Math.min(startPct.y, curPct.y),
        width: Math.abs(curPct.x - startPct.x),
        height: Math.abs(curPct.y - startPct.y),
      });
      return;
    }

    if ((dragState.mode === 'draw-arrow' || dragState.mode === 'draw-line') && dragState.drawingId) {
      const { x, y } = svgToPct(svgX, svgY, nw, nh);
      updateAnnotation(dragState.drawingId, { toX: x, toY: y });
    }
  }

  function onMouseup(_e: MouseEvent) {
    if (!dragState) return;

    if (dragState.mode === 'draw-mosaic' && dragState.drawingId) {
      const ann = appState.annotations.find(a => a.id === dragState!.drawingId) as MosaicAnnotation | undefined;
      if (ann && (ann.width < 0.5 || ann.height < 0.5)) {
        appState.annotations = appState.annotations.filter(a => a.id !== dragState!.drawingId);
        appState.selectedId = null;
      }
    }

    if (dragState.mode === 'draw-box' && dragState.drawingId) {
      const ann = appState.annotations.find(a => a.id === dragState!.drawingId) as BoxAnnotation | undefined;
      if (ann && (ann.width < 0.5 || ann.height < 0.5)) {
        appState.annotations = appState.annotations.filter(a => a.id !== dragState!.drawingId);
        appState.selectedId = null;
      }
    }
    if ((dragState.mode === 'draw-arrow' || dragState.mode === 'draw-line') && dragState.drawingId) {
      const ann = appState.annotations.find(a => a.id === dragState!.drawingId) as ArrowAnnotation | LineAnnotation | undefined;
      const dist = ann ? Math.hypot(ann.toX - ann.fromX, ann.toY - ann.fromY) : 0;
      if (dist < 1) {
        appState.annotations = appState.annotations.filter(a => a.id !== dragState!.drawingId);
        appState.selectedId = null;
      }
    }

    dragState = null;
  }

  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = Math.max(0.25, Math.min(4, appState.zoom * factor));

    if (containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      appState.panX = cx / newZoom - cx / appState.zoom + appState.panX;
      appState.panY = cy / newZoom - cy / appState.zoom + appState.panY;
    }
    appState.zoom = newZoom;
  }

  function getNextNumber(): number {
    const used = appState.annotations
      .filter(a => a.type === 'marker' || (a.type === 'box' && (a as { number?: number }).number != null))
      .map(a => (a as { number: number }).number);
    let n = appState.startingNumber;
    while (used.includes(n)) n++;
    return n;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!appState.currentImage) return;

    if (e.key === ' ') { spaceHeld = true; e.preventDefault(); return; }
    if (e.key === 'Escape') { appState.selectedId = null; appState.activeTool = 'select'; dragState = null; return; }

    if ((e.key === 'Delete' || e.key === 'Backspace') && appState.selectedId) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      pushHistory(appState.annotations);
      appState.annotations = appState.annotations.filter(a => a.id !== appState.selectedId);
      appState.selectedId = null;
      appState.dirty = true;
      return;
    }

    if (appState.selectedId && !e.ctrlKey && !e.metaKey) {
      if (e.key === ']') { pushHistory(appState.annotations); moveAnnotationForward(appState.selectedId); return; }
      if (e.key === '[') { pushHistory(appState.annotations); moveAnnotationBackward(appState.selectedId); return; }
    }

    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      const prev = undoHistory();
      if (prev) { pushRedo(appState.annotations); appState.annotations = prev; appState.dirty = true; }
      return;
    }
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      const next = redoHistory();
      if (next) { pushHistory(appState.annotations); appState.annotations = next; appState.dirty = true; }
      return;
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (e.key === ' ') spaceHeld = false;
  }
</script>

<svelte:window onkeydown={onKeydown} onkeyup={onKeyup} onmouseup={onMouseup} onmousemove={onMousemove} />

<div
  class="canvas-container"
  class:panning={spaceHeld || dragState?.mode === 'pan'}
  bind:this={containerEl}
  onwheel={onWheel}
  role="application"
  aria-label="어노테이션 편집 캔버스"
>
  {#if appState.currentImage}
    <div
      class="canvas-inner"
      style="transform: scale({appState.zoom}) translate({appState.panX}px, {appState.panY}px); transform-origin: 0 0;"
    >
      <div class="image-wrap">
        <img
          bind:this={imgEl}
          src={appState.currentImage.url}
          alt="편집 중인 이미지"
          style="display:block; max-width:none; width:{nw}px; height:{nh}px;"
          draggable="false"
          onload={drawMosaics}
        />
        {#if nw > 0 && nh > 0}
          <canvas
            bind:this={mosaicCanvas}
            width={nw}
            height={nh}
            style="position:absolute; top:0; left:0; pointer-events:none; z-index:1;"
          ></canvas>
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <svg
            bind:this={svgEl}
            class="ann-svg"
            viewBox={`0 0 ${nw} ${nh}`}
            width={nw}
            height={nh}
            onmousedown={onMousedown}
            style="cursor: {appState.activeTool === 'select' ? 'default' : 'crosshair'}; z-index:2;"
          >
            <AnnotationRenderer
              annotations={appState.annotations}
              naturalWidth={nw}
              naturalHeight={nh}
              selectedId={appState.selectedId}
              editorMode={true}
              onHandleMousedown={(annId, handle, e) => {
                pushHistory(appState.annotations);
                dragState = { mode: 'resize', startSvgX: 0, startSvgY: 0, lastSvgX: 0, lastSvgY: 0, annId, handle };
                e.stopPropagation();
              }}
            />
          </svg>
        {/if}
      </div>
    </div>
  {:else}
    <div class="empty-state">
      <p>좌측에서 이미지를 선택하세요</p>
    </div>
  {/if}
</div>

<style>
  .canvas-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: #2a2a2a;
    background-image: radial-gradient(circle, #3a3a3a 1px, transparent 1px);
    background-size: 20px 20px;
  }

  .canvas-container.panning {
    cursor: grab;
  }

  .canvas-inner {
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
  }

  .image-wrap {
    position: relative;
    line-height: 0;
    display: inline-block;
  }

  .ann-svg {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 14px;
  }
</style>
