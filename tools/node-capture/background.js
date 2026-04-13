'use strict';

// 설치/업데이트 시 아이콘 클릭 → 사이드패널 자동 열기
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});
// 캡쳐·다운로드는 항상 살아있는 extension page(sidepanel)에서 직접 처리
