<script lang="ts">
  import Toolbar from './components/Toolbar.svelte';
  import ImageBrowser from './components/ImageBrowser.svelte';
  import Canvas from './components/Canvas.svelte';
  import PropertyPanel from './components/PropertyPanel.svelte';
  import AnnotationList from './components/AnnotationList.svelte';
  import { state as appState } from './lib/state.svelte';

  let savedMsg = $state('');
  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  function onSaved() {
    savedMsg = '저장됨!';
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { savedMsg = ''; }, 2000);
  }
</script>

<svelte:window
  onbeforeunload={(e) => {
    if (appState.dirty) {
      e.preventDefault();
      return '저장하지 않은 변경사항이 있습니다.';
    }
  }}
/>

<div class="app">
  <Toolbar {onSaved} />

  {#if savedMsg}
    <div class="saved-toast">{savedMsg}</div>
  {/if}

  <div class="main">
    <ImageBrowser />
    <Canvas />

    <aside class="right-panel">
      <PropertyPanel />
      <AnnotationList />
    </aside>
  </div>
</div>

<style>
  .app {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
  }

  .right-panel {
    width: 220px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #333;
    background: #1e1e1e;
    overflow: hidden;
  }

  .saved-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2d4a2d;
    border: 1px solid #4a7a4a;
    color: #8ece8e;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    z-index: 100;
    pointer-events: none;
    animation: fadein 0.2s ease;
  }

  @keyframes fadein {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
