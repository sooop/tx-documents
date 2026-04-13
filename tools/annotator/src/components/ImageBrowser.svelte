<script lang="ts">
  import { getImages, loadAnnotation } from '../lib/api';
  import { state as appState, setAnnotations } from '../lib/state.svelte';
  import { clearHistory } from '../lib/history.svelte';
  import type { ImageEntry } from '../lib/types';
  import ImageUpload from './ImageUpload.svelte';

  let images: ImageEntry[] = $state([]);
  let annotationMap: Set<string> = $state(new Set());
  let originalSet: Set<string> = $state(new Set());
  let search = $state('');
  let loading = $state(false);
  let showUpload = $state(false);

  const LANGS = ['ko', 'en', 'ja', 'zh-hk', 'zh-cn'];

  $effect(() => { loadImages(); });

  async function loadImages() {
    loading = true;
    try {
      const [imgs, anns] = await Promise.all([
        getImages(),
        fetch('/__api/annotations').then(r => r.json()) as Promise<ImageEntry[]>,
      ]);
      images = imgs;
      annotationMap = new Set(anns.map(a => `${a.section}/${a.name}-${a.lang}`));
      originalSet = new Set(
        imgs
          .filter(i => i.hasOriginal)
          .map(i => `${i.section}/${i.name}-${i.lang}`)
      );
    } finally {
      loading = false;
    }
  }

  async function selectImage(img: ImageEntry, lang: string) {
    if (appState.dirty) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return;
    }

    // 원본 백업이 있으면 편집 시 원본을 사용 (모자이크가 적용되지 않은 이미지)
    const key = `${img.section}/${img.name}-${lang}`;
    const ext = img.filename.split('.').pop() ?? 'png';
    const url = originalSet.has(key)
      ? `/images/${img.section}/.originals/${img.name}-${lang}.${ext}`
      : `/images/${img.section}/${img.name}-${lang}.${ext}`;

    // 이미지 자연 크기 읽기
    const { naturalWidth, naturalHeight } = await new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve) => {
      const i = new Image();
      i.onload = () => resolve({ naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight });
      i.onerror = () => resolve({ naturalWidth: 800, naturalHeight: 600 });
      i.src = url;
    });

    appState.currentImage = { section: img.section, name: img.name, lang, url, naturalWidth, naturalHeight };
    appState.selectedId = null;
    appState.dirty = false;
    clearHistory();

    // 어노테이션 로드 (없으면 빈 배열)
    const annFile = await loadAnnotation(img.section, img.name, lang);
    setAnnotations(annFile?.annotations ?? []);
  }

  // 섹션별 그룹화
  const grouped = $derived(() => {
    const q = search.toLowerCase();
    const filtered = images.filter(img =>
      !q || img.name.includes(q) || img.section.includes(q)
    );
    const map = new Map<string, ImageEntry[]>();
    for (const img of filtered) {
      const list = map.get(img.section) ?? [];
      if (!list.some(i => i.name === img.name)) list.push(img);
      map.set(img.section, list);
    }
    return map;
  });

  // 해당 이미지에 존재하는 언어 목록
  function availableLangs(img: ImageEntry): string[] {
    return LANGS.filter(l => images.some(i => i.section === img.section && i.name === img.name && i.lang === l));
  }

  function hasAnnotation(img: ImageEntry, lang: string): boolean {
    return annotationMap.has(`${img.section}/${img.name}-${lang}`);
  }

  function isSelected(img: ImageEntry, lang: string): boolean {
    return appState.currentImage?.section === img.section &&
           appState.currentImage?.name === img.name &&
           appState.currentImage?.lang === lang;
  }
</script>

<aside class="browser">
  <div class="browser-header">
    <input
      class="search"
      type="text"
      placeholder="이미지 검색..."
      bind:value={search}
    />
    <button class="upload-btn" onclick={() => showUpload = !showUpload} title="이미지 업로드">+</button>
    <button class="refresh-btn" onclick={loadImages} title="새로고침">↻</button>
  </div>

  {#if showUpload}
    <ImageUpload onUploaded={() => { loadImages(); showUpload = false; }} />
  {/if}

  <div class="image-list">
    {#if loading}
      <div class="loading">로딩 중...</div>
    {:else}
      {#each [...grouped().entries()] as [section, imgs]}
        <div class="section">
          <div class="section-title">{section}</div>
          {#each imgs as img}
            <div class="image-item">
              <div class="image-name">{img.name}</div>
              <div class="lang-row">
                {#each availableLangs(img) as lang}
                  <button
                    class="lang-btn"
                    class:selected={isSelected(img, lang)}
                    class:has-ann={hasAnnotation(img, lang)}
                    onclick={() => selectImage(img, lang)}
                    title={hasAnnotation(img, lang) ? '어노테이션 있음' : '어노테이션 없음'}
                  >{lang}</button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/each}
      {#if grouped().size === 0 && !loading}
        <div class="empty">이미지 없음</div>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .browser {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #333;
    background: #1e1e1e;
    overflow: hidden;
  }

  .browser-header {
    display: flex;
    gap: 4px;
    padding: 8px 8px 6px;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }

  .search {
    flex: 1;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #e0e0e0;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    min-width: 0;
  }

  .upload-btn, .refresh-btn {
    width: 26px;
    height: 26px;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #aaa;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .upload-btn:hover, .refresh-btn:hover { background: #3a3a3a; color: #fff; }

  .image-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .section {
    margin-bottom: 4px;
  }

  .section-title {
    font-size: 10px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 6px 10px 2px;
    font-weight: 600;
  }

  .image-item {
    padding: 4px 10px;
  }

  .image-name {
    font-size: 11px;
    color: #bbb;
    margin-bottom: 3px;
    word-break: break-all;
  }

  .lang-row {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .lang-btn {
    padding: 1px 6px;
    background: #2a2a2a;
    border: 1px solid #3a3a3a;
    color: #888;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
    transition: background 0.1s;
  }
  .lang-btn:hover { background: #3a3a3a; color: #ccc; }
  .lang-btn.selected { background: #2d5a9e; border-color: #4a9eff; color: #fff; }
  .lang-btn.has-ann { border-color: #4a7a4a; color: #8aaa8a; }
  .lang-btn.has-ann.selected { background: #2d5a9e; border-color: #4a9eff; color: #fff; }

  .loading, .empty {
    font-size: 12px;
    color: #555;
    padding: 16px;
    text-align: center;
  }
</style>
