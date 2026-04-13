'use strict';

(function () {
  if (window.__nodeCaptureLoaded) return;
  window.__nodeCaptureLoaded = true;

  // ─── 상태 ─────────────────────────────────────────────
  let isSelecting = false;
  let highlightedEl = null;
  let selectedEl = null;   // 노드 확정 후 DO_CAPTURE까지 보관
  let mouseX = 0;
  let mouseY = 0;
  let overlayEl = null;
  let captureCounter = 1;

  const SUPPORTED_LOCALES = ['ko', 'en', 'ja'];

  // ─── 유틸리티 ─────────────────────────────────────────

  function sanitize(str) {
    return String(str)
      .replace(/[^\w가-힣\-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getDefaultPageName() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const name = segments.length > 0 ? segments.join('-') : document.title;
    return sanitize(name) || 'page';
  }

  function getDefaultNodeName(el) {
    const candidates = [
      el.getAttribute('data-testid'),
      el.getAttribute('id'),
      el.getAttribute('aria-label'),
      Array.from(el.classList).filter((c) => !c.startsWith('__nc-')).slice(0, 2).join('-'),
      el.tagName.toLowerCase(),
    ];
    for (const c of candidates) {
      const v = sanitize(c || '');
      if (v) return v;
    }
    return 'node';
  }

  function formatSeq(n) { return String(n).padStart(2, '0'); }

  function buildFilename(pageName, nodeName, seq, locale) {
    return `${sanitize(pageName)}-${sanitize(nodeName)}-${formatSeq(seq)}-${locale}.png`;
  }

  // ─── 페이지 내 상태 알림 (캡쳐 진행 중 하단 표시) ──────

  function showStatus(message, type = '') {
    let el = document.getElementById('__nc-status');
    if (!el) {
      el = document.createElement('div');
      el.id = '__nc-status';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `__nc-status-visible${type ? ` __nc-status-${type}` : ''}`;
  }

  function hideStatus() {
    const el = document.getElementById('__nc-status');
    if (el) el.className = '';
  }

  // 사이드패널에도 동일 메시지 전달
  function reportProgress(message, step, total) {
    showStatus(message);
    chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', message, step, total }).catch(() => {});
  }

  // ─── 하이라이트 ───────────────────────────────────────

  function highlight(el) {
    if (highlightedEl === el) return;
    unhighlight();
    if (!el || el === document.body || el === document.documentElement) return;
    if (el.closest && el.closest('#__nc-overlay, #__nc-status')) return;
    highlightedEl = el;
    el.classList.add('__nc-highlight');
  }

  function unhighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove('__nc-highlight');
      highlightedEl = null;
    }
  }

  // ─── 선택 모드 이벤트 핸들러 ──────────────────────────

  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && !el.closest('#__nc-overlay, #__nc-status')) {
      highlight(el);
    }
  }

  function navigateUp() {
    if (!highlightedEl) return;
    const parent = highlightedEl.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      highlight(parent);
    }
  }

  function navigateDown() {
    if (!highlightedEl) return;
    const children = Array.from(highlightedEl.children).filter(
      (c) => !c.id || !c.id.startsWith('__nc-')
    );
    if (children.length === 0) return;
    let best = children[0];
    for (const child of children) {
      const r = child.getBoundingClientRect();
      if (mouseX >= r.left && mouseX <= r.right && mouseY >= r.top && mouseY <= r.bottom) {
        best = child;
        break;
      }
    }
    highlight(best);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      exitSelectionMode();
      chrome.runtime.sendMessage({ type: 'SELECTION_CANCELLED' }).catch(() => {});
      return;
    }

    if (!highlightedEl) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      navigateUp();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      navigateDown();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      confirmSelection(highlightedEl);
    }
  }

  function onClick(e) {
    if (e.target.closest && e.target.closest('#__nc-overlay, #__nc-status')) return;
    e.preventDefault();
    e.stopPropagation();
    confirmSelection(highlightedEl || e.target);
  }

  // ─── 선택 모드 진입/종료 ──────────────────────────────

  function enterSelectionMode() {
    if (isSelecting) return;
    isSelecting = true;
    document.body.classList.add('__nc-selecting');

    overlayEl = document.createElement('div');
    overlayEl.id = '__nc-overlay';
    overlayEl.textContent = '캡쳐할 노드를 클릭하세요  ↑↓ 부모/자식 이동  Enter 확정  Esc 취소';
    document.body.appendChild(overlayEl);

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
  }

  function exitSelectionMode() {
    if (!isSelecting) return;
    isSelecting = false;
    document.body.classList.remove('__nc-selecting');

    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('click', onClick, true);

    unhighlight();

    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
  }

  function confirmSelection(el) {
    if (!el) return;
    exitSelectionMode();

    selectedEl = el;
    el.classList.add('__nc-selected');

    // 사이드패널에 노드 선택 완료 알림 → 사이드패널이 입력 폼을 보여줌
    chrome.runtime.sendMessage({
      type: 'NODE_SELECTED',
      defaultPage: getDefaultPageName(),
      defaultNode: getDefaultNodeName(el),
      defaultSeq: captureCounter,
    }).catch(() => {});
  }

  function clearSelection() {
    if (selectedEl) {
      selectedEl.classList.remove('__nc-selected');
      selectedEl = null;
    }
  }

  // ─── i18n 유틸리티 (MAIN 월드 브릿지 경유) ──────────────
  // window.__i18nBridge는 페이지 MAIN 월드에만 존재하므로
  // main-world-bridge.js와 CustomEvent(__nc_to_page / __nc_from_page)로 통신

  let _bridgeCallId = 0;

  function pageCall(action, data = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const id = ++_bridgeCallId;
      const timer = setTimeout(() => {
        window.removeEventListener('__nc_from_page', handler);
        reject(new Error(`bridge timeout: ${action}`));
      }, timeout);

      function handler(e) {
        const msg = JSON.parse(e.detail);
        if (msg.id !== id) return;
        clearTimeout(timer);
        window.removeEventListener('__nc_from_page', handler);
        if (msg.error) reject(new Error(msg.error));
        else resolve(msg.result);
      }
      window.addEventListener('__nc_from_page', handler);
      window.dispatchEvent(new CustomEvent('__nc_to_page', { detail: JSON.stringify({ id, action, ...data }) }));
    });
  }

  async function hasBridge() {
    try { return await pageCall('HAS_BRIDGE', {}, 2000); } catch { return false; }
  }

  async function getCurrentLocale() {
    try {
      const locale = await pageCall('GET_LOCALE', {}, 2000);
      return locale || document.documentElement.lang || 'ko';
    } catch {
      return document.documentElement.lang || 'ko';
    }
  }

  function changeLocale(locale) {
    return pageCall('SET_LOCALE', { locale }, 10000);
  }

  // ─── 캡쳐 유틸리티 ───────────────────────────────────
  // 엘리먼트 위치·크기를 sidepanel에 전달 → sidepanel이 chrome.debugger로 캡쳐

  async function captureAndSave(el, filename) {
    el.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      throw new Error('엘리먼트가 화면에 보이지 않습니다');
    }

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_ELEMENT',
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      dpr: window.devicePixelRatio || 1,
      filename,
    });

    if (!response || response.error) throw new Error(response?.error || '캡쳐 실패');
  }

  // ─── 메인 캡쳐 시퀀스 ────────────────────────────────

  async function runCaptureSequence(el, pageName, nodeName, seq) {
    captureCounter = seq + 1;

    const bridgeAvailable = await hasBridge();
    const originalLocale = await getCurrentLocale();

    const locales = bridgeAvailable
      ? [originalLocale, ...SUPPORTED_LOCALES.filter((l) => l !== originalLocale)]
      : [originalLocale];

    const total = locales.length;
    const savedFiles = [];

    try {
      for (let i = 0; i < locales.length; i++) {
        const locale = locales[i];

        if (i > 0 && bridgeAvailable) {
          reportProgress(`언어 전환 중: ${locale}...`, i, total);
          await changeLocale(locale);
          // localeReady 이후 React 리렌더링 완료까지 대기
          await new Promise((r) => setTimeout(r, 1000));
        }

        reportProgress(`캡쳐 중... [${locale}]  (${i + 1}/${total})`, i + 1, total);
        const filename = buildFilename(pageName, nodeName, seq, locale);
        await captureAndSave(el, filename);
        savedFiles.push(filename);
        chrome.runtime.sendMessage({ type: 'CAPTURE_FILE_SAVED', filename }).catch(() => {});
      }

      if (bridgeAvailable && (await getCurrentLocale()) !== originalLocale) {
        reportProgress(`원래 언어(${originalLocale})로 복원 중...`, total, total);
        await changeLocale(originalLocale);
      }

      hideStatus();
      chrome.runtime.sendMessage({ type: 'CAPTURE_DONE', files: savedFiles }).catch(() => {});
    } catch (err) {
      if (hasBridge) {
        try { if (bridgeAvailable && (await getCurrentLocale()) !== originalLocale) await changeLocale(originalLocale); } catch {}
      }
      hideStatus();
      chrome.runtime.sendMessage({ type: 'CAPTURE_ERROR', message: err.message }).catch(() => {});
    }
  }

  // ─── 사이드패널 / background 메시지 수신 ─────────────

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'START_SELECTION':
        if (isSelecting) exitSelectionMode();
        enterSelectionMode();
        break;

      case 'CANCEL_SELECTION':
        exitSelectionMode();
        clearSelection();
        break;

      case 'NAVIGATE':
        if (!isSelecting) return;
        if (message.direction === 'up') navigateUp();
        else navigateDown();
        break;

      case 'CONFIRM_SELECTION':
        if (!isSelecting || !highlightedEl) return;
        confirmSelection(highlightedEl);
        break;

      case 'DO_CAPTURE':
        if (!selectedEl) return;
        const el = selectedEl;
        clearSelection();
        runCaptureSequence(el, message.pageName, message.nodeName, message.seq ?? captureCounter);
        break;
    }
  });
})();
