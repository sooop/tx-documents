<script lang="ts">
  import type { Annotation, HandleId, MosaicAnnotation } from '../lib/types';
  import { MARKER_RADIUS, MARKER_FONT_SIZE, DEFAULT_COLOR, BOX_STROKE_WIDTH, ARROW_STROKE_WIDTH, ARROW_HEAD_SIZE, HANDLE_RADIUS, SELECTION_COLOR } from '../lib/constants';
  import { pct2px, getBoxHandles, getLineHandles, getMosaicHandles } from '../lib/canvas-math';

  interface Props {
    annotations: Annotation[];
    naturalWidth: number;
    naturalHeight: number;
    selectedId?: string | null;
    /** 에디터 모드에서는 핸들 표시, 뷰어 모드에서는 숨김 */
    editorMode?: boolean;
    onHandleMousedown?: (annId: string, handle: HandleId, e: MouseEvent) => void;
  }

  let {
    annotations,
    naturalWidth: nw,
    naturalHeight: nh,
    selectedId = null,
    editorMode = false,
    onHandleMousedown,
  }: Props = $props();

  function px(pct: number, dim: number) { return pct2px(pct, dim); }
</script>

<defs>
  <marker
    id="arrowhead"
    markerWidth={ARROW_HEAD_SIZE}
    markerHeight={ARROW_HEAD_SIZE * 0.7}
    refX={ARROW_HEAD_SIZE}
    refY={ARROW_HEAD_SIZE * 0.35}
    orient="auto"
    markerUnits="userSpaceOnUse"
  >
    <polygon
      points={`0 0, ${ARROW_HEAD_SIZE} ${ARROW_HEAD_SIZE * 0.35}, 0 ${ARROW_HEAD_SIZE * 0.7}`}
      fill={DEFAULT_COLOR}
    />
  </marker>
  <marker
    id="arrowhead-selected"
    markerWidth={ARROW_HEAD_SIZE}
    markerHeight={ARROW_HEAD_SIZE * 0.7}
    refX={ARROW_HEAD_SIZE}
    refY={ARROW_HEAD_SIZE * 0.35}
    orient="auto"
    markerUnits="userSpaceOnUse"
  >
    <polygon
      points={`0 0, ${ARROW_HEAD_SIZE} ${ARROW_HEAD_SIZE * 0.35}, 0 ${ARROW_HEAD_SIZE * 0.7}`}
      fill={SELECTION_COLOR}
    />
  </marker>
</defs>

{#each annotations as ann (ann.id)}
  {@const selected = editorMode && ann.id === selectedId}

  {#if ann.type === 'box'}
    {@const bx = px(ann.x, nw)}
    {@const by = px(ann.y, nh)}
    {@const bw = px(ann.width, nw)}
    {@const bh = px(ann.height, nh)}
    <rect
      x={bx} y={by} width={bw} height={bh}
      fill="none"
      stroke={selected ? SELECTION_COLOR : (ann.strokeColor ?? DEFAULT_COLOR)}
      stroke-width={BOX_STROKE_WIDTH}
      vector-effect="non-scaling-stroke"
      rx="3" ry="3"
    />
    {#if ann.number != null}
      {@const mx = bx - MARKER_RADIUS * 0.3}
      {@const my = by - MARKER_RADIUS * 0.3}
      <circle cx={mx} cy={my} r={MARKER_RADIUS} fill={selected ? SELECTION_COLOR : (ann.strokeColor ?? DEFAULT_COLOR)} />
      <text
        x={mx} y={my}
        text-anchor="middle" dominant-baseline="central"
        fill="white" font-size={MARKER_FONT_SIZE} font-weight="700"
        style="user-select:none"
      >{ann.number}</text>
    {/if}
    {#if editorMode && selected}
      {@const handles = getBoxHandles(ann, nw, nh)}
      {#each Object.entries(handles) as [hid, pos]}
        <circle
          cx={pos.x} cy={pos.y} r={HANDLE_RADIUS}
          fill="white" stroke={SELECTION_COLOR} stroke-width="2"
          vector-effect="non-scaling-stroke"
          style="cursor:nwse-resize"
          onmousedown={(e) => onHandleMousedown?.(ann.id, hid as HandleId, e)}
        />
      {/each}
    {/if}

  {:else if ann.type === 'marker'}
    {@const mx = px(ann.x, nw)}
    {@const my = px(ann.y, nh)}
    <circle cx={mx} cy={my} r={MARKER_RADIUS}
      fill={selected ? SELECTION_COLOR : DEFAULT_COLOR}
      stroke={selected ? 'white' : 'none'} stroke-width="2"
      vector-effect="non-scaling-stroke"
    />
    <text
      x={mx} y={my}
      text-anchor="middle" dominant-baseline="central"
      fill="white" font-size={MARKER_FONT_SIZE} font-weight="700"
      style="user-select:none"
    >{ann.number}</text>

  {:else if ann.type === 'arrow'}
    <line
      x1={px(ann.fromX, nw)} y1={px(ann.fromY, nh)}
      x2={px(ann.toX, nw)} y2={px(ann.toY, nh)}
      stroke={selected ? SELECTION_COLOR : (ann.strokeColor ?? DEFAULT_COLOR)}
      stroke-width={ann.strokeWidth ?? ARROW_STROKE_WIDTH}
      marker-end={selected ? 'url(#arrowhead-selected)' : 'url(#arrowhead)'}
      vector-effect="non-scaling-stroke"
    />
    {#if editorMode && selected}
      {@const handles = getLineHandles(ann, nw, nh)}
      {#each Object.entries(handles) as [hid, pos]}
        <circle
          cx={pos.x} cy={pos.y} r={HANDLE_RADIUS}
          fill="white" stroke={SELECTION_COLOR} stroke-width="2"
          vector-effect="non-scaling-stroke"
          onmousedown={(e) => onHandleMousedown?.(ann.id, hid as HandleId, e)}
        />
      {/each}
    {/if}

  {:else if ann.type === 'line'}
    <line
      x1={px(ann.fromX, nw)} y1={px(ann.fromY, nh)}
      x2={px(ann.toX, nw)} y2={px(ann.toY, nh)}
      stroke={selected ? SELECTION_COLOR : (ann.strokeColor ?? DEFAULT_COLOR)}
      stroke-width={ann.strokeWidth ?? ARROW_STROKE_WIDTH}
      vector-effect="non-scaling-stroke"
    />
    {#if editorMode && selected}
      {@const handles = getLineHandles(ann, nw, nh)}
      {#each Object.entries(handles) as [hid, pos]}
        <circle
          cx={pos.x} cy={pos.y} r={HANDLE_RADIUS}
          fill="white" stroke={SELECTION_COLOR} stroke-width="2"
          vector-effect="non-scaling-stroke"
          onmousedown={(e) => onHandleMousedown?.(ann.id, hid as HandleId, e)}
        />
      {/each}
    {/if}

  {:else if ann.type === 'mosaic'}
    {@const mx = px(ann.x, nw)}
    {@const my = px(ann.y, nh)}
    {@const mw = px(ann.width, nw)}
    {@const mh = px(ann.height, nh)}
    {#if editorMode}
      <rect
        x={mx} y={my} width={mw} height={mh}
        fill="none"
        stroke={selected ? SELECTION_COLOR : 'rgba(255,255,255,0.5)'}
        stroke-width={2}
        stroke-dasharray={selected ? 'none' : '6 3'}
        vector-effect="non-scaling-stroke"
        rx="2" ry="2"
      />
      {#if selected}
        {@const handles = getMosaicHandles(ann as MosaicAnnotation, nw, nh)}
        {#each Object.entries(handles) as [hid, pos]}
          <circle
            cx={pos.x} cy={pos.y} r={HANDLE_RADIUS}
            fill="white" stroke={SELECTION_COLOR} stroke-width="2"
            vector-effect="non-scaling-stroke"
            style="cursor:nwse-resize"
            onmousedown={(e) => onHandleMousedown?.(ann.id, hid as HandleId, e)}
          />
        {/each}
      {/if}
    {/if}
  {/if}
{/each}
