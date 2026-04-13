'use strict';

// ── 상태 ──────────────────────────────────────────────────
// idle | selecting | input | capturing | done
let currentState = 'idle';
let capturedFiles = [];

// ── 뷰 전환 ──────────────────────────────────────────────

function setState(newState, data = {}) {
  currentState = newState;

  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const view = document.getElementById(`view-${newState}`);
  if (view) view.classList.add('active');

  if (newState === 'input') {
    document.getElementById('page-name').value = data.defaultPage || '';
    document.getElementById('node-name').value = data.defaultNode || '';
    if (data.defaultSeq != null) document.getElementById('seq-num').value = data.defaultSeq;
    // 사이드패널은 별도 창이므로 바로 포커스 가능
    setTimeout(() => {
      const input = document.getElementById('node-name');
      input.focus();
      input.select();
    }, 30);
  }

  if (newState === 'capturing') {
    setProgress(data.message || '캡쳐 준비 중...', data.step, data.total);
  }

  if (newState === 'done') {
    document.getElementById('done-files').innerHTML = (data.files || [])
      .map((f) => `<div>${f}</div>`)
      .join('');
  }
}

function setProgress(message, step, total) {
  document.getElementById('progress-text').textContent = message;
  const bar = document.getElementById('progress-bar');
  if (step != null && total != null) {
    bar.style.width = `${Math.round((step / total) * 100)}%`;
  } else {
    bar.style.width = '30%';
  }
}

// ── 오류 표시 ─────────────────────────────────────────────

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.classList.add('visible');
  setTimeout(() => box.classList.remove('visible'), 5000);
}

// ── 콘텐츠 스크립트 메시지 전송 ──────────────────────────

async function sendToContent(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('활성 탭을 찾을 수 없습니다');
  return chrome.tabs.sendMessage(tab.id, message);
}

// ── 버튼 핸들러 ──────────────────────────────────────────

document.getElementById('btn-start').addEventListener('click', async () => {
  setState('selecting');
  try {
    await sendToContent({ type: 'START_SELECTION' });
  } catch (err) {
    setState('idle');
    showError('페이지에 연결할 수 없습니다. 페이지를 새로고침하고 다시 시도하세요.');
  }
});

document.getElementById('btn-nav-up').addEventListener('click', () => {
  sendToContent({ type: 'NAVIGATE', direction: 'up' }).catch(() => {});
});

document.getElementById('btn-nav-down').addEventListener('click', () => {
  sendToContent({ type: 'NAVIGATE', direction: 'down' }).catch(() => {});
});

document.getElementById('btn-confirm').addEventListener('click', () => {
  sendToContent({ type: 'CONFIRM_SELECTION' }).catch(() => {});
});

document.getElementById('btn-cancel-selecting').addEventListener('click', async () => {
  setState('idle');
  try { await sendToContent({ type: 'CANCEL_SELECTION' }); } catch {}
});

document.getElementById('btn-cancel-input').addEventListener('click', async () => {
  setState('idle');
  try { await sendToContent({ type: 'CANCEL_SELECTION' }); } catch {}
});

document.getElementById('btn-capture').addEventListener('click', doCapture);

document.getElementById('btn-retry').addEventListener('click', () => setState('idle'));

document.addEventListener('keydown', (e) => {
  if (currentState === 'selecting') {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      sendToContent({ type: 'NAVIGATE', direction: 'up' }).catch(() => {});
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      sendToContent({ type: 'NAVIGATE', direction: 'down' }).catch(() => {});
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      sendToContent({ type: 'CONFIRM_SELECTION' }).catch(() => {});
      return;
    }
    if (e.key === 'Escape') {
      setState('idle');
      sendToContent({ type: 'CANCEL_SELECTION' }).catch(() => {});
      return;
    }
  }

  if (currentState === 'input') {
    if (e.key === 'Enter') { e.preventDefault(); doCapture(); return; }
    if (e.key === 'Escape') {
      setState('idle');
      sendToContent({ type: 'CANCEL_SELECTION' }).catch(() => {});
    }
  }
});

async function doCapture() {
  const pageName = document.getElementById('page-name').value.trim() || 'page';
  const nodeName = document.getElementById('node-name').value.trim() || 'node';
  const seqRaw = parseInt(document.getElementById('seq-num').value, 10);
  const seq = seqRaw >= 1 ? seqRaw : 1;
  capturedFiles = [];
  setState('capturing', { message: '캡쳐 준비 중...' });
  try {
    await sendToContent({ type: 'DO_CAPTURE', pageName, nodeName, seq });
  } catch (err) {
    setState('idle');
    showError('캡쳐 명령 전송 실패: ' + err.message);
  }
}

// ── 콘텐츠 스크립트에서 오는 메시지 처리 ─────────────────

chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'NODE_SELECTED':
      setState('input', {
        defaultPage: message.defaultPage,
        defaultNode: message.defaultNode,
        defaultSeq: message.defaultSeq,
      });
      break;

    case 'SELECTION_CANCELLED':
      if (currentState === 'selecting') setState('idle');
      break;

    case 'CAPTURE_PROGRESS':
      if (currentState === 'capturing') {
        setProgress(message.message, message.step, message.total);
      }
      break;

    case 'CAPTURE_FILE_SAVED':
      capturedFiles.push(message.filename);
      break;

    case 'CAPTURE_DONE':
      setState('done', { files: capturedFiles });
      break;

    case 'CAPTURE_ERROR':
      setState('idle');
      showError(message.message);
      break;
  }
});

// ── 탭 전환 시 선택/입력 상태 초기화 ────────────────────

chrome.tabs.onActivated.addListener(() => {
  if (['selecting', 'input', 'capturing'].includes(currentState)) {
    setState('idle');
  }
});

// ── chrome.debugger 캡쳐 + 다운로드 ──────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'CAPTURE_ELEMENT') return;

  const tabId = sender.tab?.id;
  if (!tabId) { sendResponse({ error: '탭 ID를 확인할 수 없습니다' }); return; }

  const { rect, scrollX, scrollY, dpr, filename } = message;

  (async () => {
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
    } catch (e) {
      // 이미 attach된 경우 무시하고 진행
      if (!e.message?.includes('already attached')) {
        sendResponse({ error: `debugger attach 실패: ${e.message}` });
        return;
      }
    }

    try {
      const result = await chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
          scale: dpr,
        },
        fromSurface: true,
      });

      const dataUrl = `data:image/png;base64,${result.data}`;
      await chrome.downloads.download({ url: dataUrl, filename, saveAs: false });
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ error: err.message });
    } finally {
      chrome.debugger.detach({ tabId }).catch(() => {});
    }
  })();

  return true; // 비동기 sendResponse
});

// ── 초기 렌더 ─────────────────────────────────────────────
setState('idle');
