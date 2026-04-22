<script lang="ts">
  import type { Annotation } from '../../lib/annotations';
  import { onMount } from 'svelte';

  interface Props {
    imageSrc: string;
    annotations: Annotation[];
    alt: string;
    caption?: string;
    lang: string;
  }

  let { imageSrc, annotations, alt, caption, lang }: Props = $props();

  let naturalWidth = $state(0);
  let naturalHeight = $state(0);
  let imageLoaded = $state(false);
  let modalOpen = $state(false);
  let thumbSvgWidth = $state(0);
  let modalSvgWidth = $state(0);

  // 표시 크기에 상관없이 일정한 화면 픽셀 크기를 유지하기 위한 스케일.
  // SVG viewBox는 naturalWidth 기준이므로, (natural / displayed)만큼 곱해야
  // 실제 화면에서 일정한 px로 렌더된다.
  const thumbScale = $derived(
    thumbSvgWidth > 0 && naturalWidth > 0 ? naturalWidth / thumbSvgWidth : 1,
  );
  const modalScale = $derived(
    modalSvgWidth > 0 && naturalWidth > 0 ? naturalWidth / modalSvgWidth : 1,
  );

  const MARKER_RADIUS = 14;
  const MARKER_FONT_SIZE = 13;
  const DEFAULT_COLOR = 'oklch(51.4% 0.222 16.935)';
  const BOX_STROKE_WIDTH = 4;
  const ARROW_STROKE_WIDTH = 3;
  // 화살표 마커 크기 (이미지 좌표계 기준 px)
  const ARROW_HEAD_SIZE = 16;

  function onImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    naturalWidth = img.naturalWidth;
    naturalHeight = img.naturalHeight;
    imageLoaded = true;
  }

  function px(pct: number, dim: number): number {
    return (pct / 100) * dim;
  }

  function openModal() {
    modalOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOpen = false;
    document.body.style.overflow = '';
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) closeModal();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }

  onMount(() => {
    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

<svelte:window onkeydown={onKeydown} />

<!-- 썸네일 -->
<figure class="annotated-image">
  <div
    class="image-container clickable"
    onclick={openModal}
    role="button"
    tabindex="0"
    aria-label="이미지 크게 보기"
    onkeydown={(e) => e.key === 'Enter' && openModal()}
  >
    <img
      src={imageSrc}
      {alt}
      loading="lazy"
      onload={onImageLoad}
    />
    {#if imageLoaded && naturalWidth > 0}
      <svg
        class="annotation-overlay"
        viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
        bind:clientWidth={thumbSvgWidth}
      >
        {@render annotationLayer(thumbScale, 'thumb')}
      </svg>
    {/if}
    <div class="zoom-hint" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    </div>
  </div>
  {#if caption}
    <figcaption class="image-caption">{caption}</figcaption>
  {/if}
</figure>

<!-- 모달 -->
{#if modalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={onBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-label={caption ?? alt}
  >
    <div class="modal-inner">
      <button class="modal-close" onclick={closeModal} aria-label="닫기">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="modal-image-wrap">
        <div class="image-container">
          <img src={imageSrc} {alt} />
          {#if naturalWidth > 0}
            <svg
              class="annotation-overlay"
              viewBox={`0 0 ${naturalWidth} ${naturalHeight}`}
              bind:clientWidth={modalSvgWidth}
            >
              {@render annotationLayer(modalScale, 'modal')}
            </svg>
          {/if}
        </div>
      </div>
      {#if caption}
        <p class="modal-caption">{caption}</p>
      {/if}
    </div>
  </div>
{/if}

{#snippet annotationLayer(scale: number, id: string)}
  {@const markerR = MARKER_RADIUS * scale}
  {@const markerFont = MARKER_FONT_SIZE * scale}
  {@const arrowSize = ARROW_HEAD_SIZE * scale}
  {@const arrowId = `arrowhead-${id}`}
  <defs>
    <marker
      id={arrowId}
      markerWidth={arrowSize}
      markerHeight={arrowSize * 0.7}
      refX={arrowSize}
      refY={arrowSize * 0.35}
      orient="auto"
      markerUnits="userSpaceOnUse"
    >
      <polygon
        points={`0 0, ${arrowSize} ${arrowSize * 0.35}, 0 ${arrowSize * 0.7}`}
        fill={DEFAULT_COLOR}
      />
    </marker>
  </defs>

  {#each annotations as ann}
    {#if ann.type === 'box'}
      {@const bx = px(ann.x, naturalWidth)}
      {@const by = px(ann.y, naturalHeight)}
      {@const bw = px(ann.width, naturalWidth)}
      {@const bh = px(ann.height, naturalHeight)}
      <rect
        x={bx} y={by} width={bw} height={bh}
        fill="none"
        stroke={ann.strokeColor ?? DEFAULT_COLOR}
        stroke-width={BOX_STROKE_WIDTH}
        vector-effect="non-scaling-stroke"
        rx="3" ry="3"
      />
      {#if ann.number != null}
        {@const mx = bx - markerR * 0.3}
        {@const my = by - markerR * 0.3}
        <circle cx={mx} cy={my} r={markerR} fill={ann.strokeColor ?? DEFAULT_COLOR} />
        <text
          x={mx} y={my}
          text-anchor="middle" dominant-baseline="central"
          fill="white" font-size={markerFont} font-weight="700"
        >{ann.number}</text>
      {/if}
    {:else if ann.type === 'marker'}
      {@const mx = px(ann.x, naturalWidth)}
      {@const my = px(ann.y, naturalHeight)}
      <circle cx={mx} cy={my} r={markerR} fill={DEFAULT_COLOR} />
      <text
        x={mx} y={my}
        text-anchor="middle" dominant-baseline="central"
        fill="white" font-size={markerFont} font-weight="700"
      >{ann.number}</text>
    {:else if ann.type === 'arrow'}
      <line
        x1={px(ann.fromX, naturalWidth)} y1={px(ann.fromY, naturalHeight)}
        x2={px(ann.toX, naturalWidth)} y2={px(ann.toY, naturalHeight)}
        stroke={ann.strokeColor ?? DEFAULT_COLOR}
        stroke-width={ARROW_STROKE_WIDTH}
        marker-end={`url(#${arrowId})`}
        vector-effect="non-scaling-stroke"
      />
    {:else if ann.type === 'line'}
      <line
        x1={px(ann.fromX, naturalWidth)} y1={px(ann.fromY, naturalHeight)}
        x2={px(ann.toX, naturalWidth)} y2={px(ann.toY, naturalHeight)}
        stroke={ann.strokeColor ?? DEFAULT_COLOR}
        stroke-width={ann.strokeWidth ?? ARROW_STROKE_WIDTH}
        vector-effect="non-scaling-stroke"
      />
    {/if}
  {/each}
{/snippet}

<style>
  /* 공통 */
  .annotated-image {
    margin: 1.5rem 0;
    text-align: center;
  }

  .image-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
    line-height: 0;
  }

  .image-container img {
    display: block;
    max-width: 100%;
    max-height: 500px;
    width: auto;
    height: auto;
  }

  .annotation-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  }

  /* 썸네일 클릭 힌트 */
  .image-container.clickable {
    cursor: zoom-in;
  }

  .zoom-hint {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border-radius: 6px;
    padding: 5px 6px;
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 0.15s;
    pointer-events: none;
  }

  .image-container.clickable:hover .zoom-hint {
    opacity: 1;
  }

  /* 캡션 */
  .image-caption {
    font-size: 0.85rem;
    color: var(--color-text-muted, #6b7280);
    text-align: center;
    margin-top: 0.5rem;
    line-height: 1.5;
  }

  /* 모달 배경 */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    backdrop-filter: blur(2px);
  }

  /* 모달 내부 */
  .modal-inner {
    position: relative;
    max-width: min(90vw, 1200px);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    background: #1a1a2e;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  }

  .modal-image-wrap {
    overflow: auto;
    flex: 1;
    min-height: 0;
    /* 이미지 바깥으로 나간 마커/번호가 잘리지 않도록 여유 공간 확보 */
    padding: 24px;
  }

  .modal-image-wrap .image-container {
    display: inline-block;
    max-width: 100%;
  }

  .modal-image-wrap img {
    width: auto;
    max-width: 100%;
    /* padding(24px × 2)만큼 빼서 스크롤이 생기지 않도록 */
    max-height: calc(80vh - 48px);
    height: auto;
    display: block;
  }

  /* 닫기 버튼 */
  .modal-close {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 10;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    color: #fff;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }

  .modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* 모달 캡션 */
  .modal-caption {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.75);
    text-align: center;
    padding: 0.75rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0;
    flex-shrink: 0;
  }
</style>
