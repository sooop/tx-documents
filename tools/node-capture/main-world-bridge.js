'use strict';

// MAIN 월드에서 실행 → window.__i18nBridge에 직접 접근 가능
// content script(isolated world)와 CustomEvent로 통신

window.addEventListener('__nc_to_page', (e) => {
  // 크로스-컨텍스트 전달은 문자열(JSON)만 안전하므로 parse
  const { id, action, locale } = JSON.parse(e.detail);

  function reply(result, error) {
    window.dispatchEvent(new CustomEvent('__nc_from_page', {
      // 문자열로 직렬화하여 isolated world에서 안전하게 읽힘
      detail: JSON.stringify({ id, result: result ?? null, error: error ?? null }),
    }));
  }

  if (action === 'HAS_BRIDGE') {
    reply(!!window.__i18nBridge);
    return;
  }

  if (action === 'GET_LOCALE') {
    reply(window.__i18nBridge ? window.__i18nBridge.getLocale() : null);
    return;
  }

  if (action === 'SET_LOCALE') {
    if (!window.__i18nBridge) {
      reply(null, '__i18nBridge 없음');
      return;
    }
    function onReady(e) { reply(e.detail.locale); }
    window.addEventListener('localeReady', onReady, { once: true });
    window.__i18nBridge.setLocale(locale).catch((err) => {
      window.removeEventListener('localeReady', onReady);
      reply(null, err.message);
    });
    return;
  }
});
