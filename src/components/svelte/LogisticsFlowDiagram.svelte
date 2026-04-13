<script lang="ts">
  let {
    lang = 'ko',
    variant = 'bypass',
  }: { lang?: string; variant?: 'bypass' | 'fulfillment' } = $props();

  // Normalize zh-hk / zh-cn → zh
  const dl = lang === 'zh-hk' || lang === 'zh-cn' ? 'zh' : lang;

  const i18nBypass: Record<string, { legend: [string, string]; steps: { title: string; label: string }[] }> = {
    ko: {
      legend: ['판매자 진행', '트랙스로지스 진행'],
      steps: [
        { title: 'Step 1', label: '상품 정보 등록' },
        { title: 'Step 2', label: '주문건 등록\n(자동/수동)' },
        { title: 'Step 3', label: '바코드 출력\n/ 부착' },
        { title: 'Step 4', label: '센터로 발송' },
        { title: 'Step 5', label: '센터 입고\n작업 진행' },
        { title: 'Step 6', label: '센터 출고\n작업 진행' },
        { title: 'Step 7', label: '배송비 자동\n결제' },
        { title: 'Step 8', label: '해외 배송\n시작' },
      ],
    },
    en: {
      legend: ['Seller Process', 'TracX Logis Process'],
      steps: [
        { title: 'Step 1', label: 'Register\nProduct Info' },
        { title: 'Step 2', label: 'Register Orders\n(Auto/Manual)' },
        { title: 'Step 3', label: 'Print & Attach\nBarcode' },
        { title: 'Step 4', label: 'Ship to\nWarehouse' },
        { title: 'Step 5', label: 'Warehouse\nInbound' },
        { title: 'Step 6', label: 'Warehouse\nOutbound' },
        { title: 'Step 7', label: 'Auto Shipping\nFee Payment' },
        { title: 'Step 8', label: 'International\nShipping Start' },
      ],
    },
    ja: {
      legend: ['販売者プロセス', 'TracX Logisプロセス'],
      steps: [
        { title: 'Step 1', label: '商品情報\n登録' },
        { title: 'Step 2', label: '注文登録\n(自動/手動)' },
        { title: 'Step 3', label: 'バーコード\n印刷/貼付' },
        { title: 'Step 4', label: 'センターへ\n発送' },
        { title: 'Step 5', label: 'センター\n入庫作業' },
        { title: 'Step 6', label: 'センター\n出庫作業' },
        { title: 'Step 7', label: '送料自動\n決済' },
        { title: 'Step 8', label: '海外配送\n開始' },
      ],
    },
    zh: {
      legend: ['卖家流程', 'TracX Logis流程'],
      steps: [
        { title: 'Step 1', label: '注册商品\n信息' },
        { title: 'Step 2', label: '注册订单\n(自动/手动)' },
        { title: 'Step 3', label: '打印/粘贴\n条形码' },
        { title: 'Step 4', label: '发送至\n仓库' },
        { title: 'Step 5', label: '仓库\n入库作业' },
        { title: 'Step 6', label: '仓库\n出库作业' },
        { title: 'Step 7', label: '运费自动\n结算' },
        { title: 'Step 8', label: '海外配送\n开始' },
      ],
    },
  };

  const i18nFulfillment: Record<string, { legend: [string, string]; steps: { title: string; label: string }[] }> = {
    ko: {
      legend: ['판매자 진행', '트랙스로지스 진행'],
      steps: [
        { title: 'Step 1', label: 'SKU 생성' },
        { title: 'Step 2', label: '입고 신청' },
        { title: 'Step 3', label: '센터로 발송' },
        { title: 'Step 4', label: '주문건 등록\n(자동/수동)' },
        { title: 'Step 5', label: '센터 입고\n작업 진행' },
        { title: 'Step 6', label: '센터 출고\n작업 진행' },
        { title: 'Step 7', label: '배송비 자동\n결제' },
        { title: 'Step 8', label: '해외 배송\n시작' },
      ],
    },
    en: {
      legend: ['Seller Process', 'TracX Logis Process'],
      steps: [
        { title: 'Step 1', label: 'Create SKU' },
        { title: 'Step 2', label: 'Request\nInbound' },
        { title: 'Step 3', label: 'Ship to\nWarehouse' },
        { title: 'Step 4', label: 'Register Orders\n(Auto/Manual)' },
        { title: 'Step 5', label: 'Warehouse\nInbound' },
        { title: 'Step 6', label: 'Warehouse\nOutbound' },
        { title: 'Step 7', label: 'Auto Shipping\nFee Payment' },
        { title: 'Step 8', label: 'International\nShipping Start' },
      ],
    },
    ja: {
      legend: ['販売者プロセス', 'TracX Logisプロセス'],
      steps: [
        { title: 'Step 1', label: 'SKU作成' },
        { title: 'Step 2', label: '入庫申請' },
        { title: 'Step 3', label: 'センターへ\n発送' },
        { title: 'Step 4', label: '注文登録\n(自動/手動)' },
        { title: 'Step 5', label: 'センター\n入庫作業' },
        { title: 'Step 6', label: 'センター\n出庫作業' },
        { title: 'Step 7', label: '送料自動\n決済' },
        { title: 'Step 8', label: '海外配送\n開始' },
      ],
    },
    zh: {
      legend: ['卖家流程', 'TracX Logis流程'],
      steps: [
        { title: 'Step 1', label: '创建SKU' },
        { title: 'Step 2', label: '申请\n入库' },
        { title: 'Step 3', label: '发送至\n仓库' },
        { title: 'Step 4', label: '注册订单\n(自动/手动)' },
        { title: 'Step 5', label: '仓库\n入库作业' },
        { title: 'Step 6', label: '仓库\n出库作业' },
        { title: 'Step 7', label: '运费自动\n结算' },
        { title: 'Step 8', label: '海外配送\n开始' },
      ],
    },
  };

  const i18n = variant === 'fulfillment' ? i18nFulfillment : i18nBypass;
  const t = $derived(i18n[dl] ?? i18n['ko']);

  const row1 = $derived(t.steps.slice(0, 4));
  // row2 displayed right→left: Step5 on right, Step8 on left
  const row2 = $derived([...t.steps.slice(4, 8)].reverse());
  // step indices for row2 in display order [7,6,5,4]
  const row2Indices = [7, 6, 5, 4];

  let activeStep = $state<number | null>(null);
</script>

<div class="flow-wrapper">
  <!-- Legend -->
  <div class="legend">
    <span class="legend-item seller">
      <span class="legend-dot"></span>
      {t.legend[0]}
    </span>
    <span class="legend-item tracx">
      <span class="legend-dot"></span>
      {t.legend[1]}
    </span>
  </div>

  <!-- Diagram -->
  <div class="diagram">

    <!-- ── Row 1: Seller steps left → right ── -->
    <div class="row row1">
      {#each row1 as step, i}
        <div
          class="node seller"
          class:active={activeStep === i}
          onmouseenter={() => (activeStep = i)}
          onmouseleave={() => (activeStep = null)}
          role="listitem"
          style="animation-delay:{i * 70}ms"
        >
          <span class="step-label">{step.title}</span>
          <span class="step-text">{step.label}</span>
        </div>
        {#if i < 3}
          <div class="h-arrow" class:lit={activeStep === i || activeStep === i + 1}>
            <!-- Lucide ArrowRight -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14"/>
              <path d="m12 5 7 7-7 7"/>
            </svg>
          </div>
        {/if}
      {/each}
    </div>

    <!-- ── Turn connector: right side down arrow ── -->
    <div class="turn-row">
      <!-- spacer fills width of (3 nodes + 3 h-arrows) to push arrow to the 4th column -->
      <div class="turn-spacer"></div>
      <!-- node-width column with down arrow centered -->
      <div class="turn-cell">
        <!-- Lucide ArrowDown -->
        <svg class="v-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14"/>
          <path d="m19 12-7 7-7-7"/>
        </svg>
      </div>
    </div>

    <!-- ── Row 2: TracX steps right → left ── -->
    <div class="row row2">
      {#each row2 as step, i}
        <div
          class="node tracx"
          class:active={activeStep === row2Indices[i]}
          onmouseenter={() => (activeStep = row2Indices[i])}
          onmouseleave={() => (activeStep = null)}
          role="listitem"
          style="animation-delay:{(i + 4) * 70}ms"
        >
          <span class="step-label">{step.title}</span>
          <span class="step-text">{step.label}</span>
        </div>
        {#if i < 3}
          <div class="h-arrow left" class:lit={activeStep === row2Indices[i] || activeStep === row2Indices[i + 1]}>
            <!-- Lucide ArrowLeft -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5"/>
              <path d="m12 19-7-7 7-7"/>
            </svg>
          </div>
        {/if}
      {/each}
    </div>

  </div>
</div>

<style>
  /* ── Tokens ──────────────────────────────────────────────────── */
  .flow-wrapper {
    --node-w: 128px;
    --node-h: 80px;
    --gap-w: 36px;      /* width of h-arrow cell */
    --turn-h: 44px;     /* height of turn connector row */
    --arrow-idle: #D1D5DB;
    --arrow-lit:  #6B7FE0;

    font-family: 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', system-ui, sans-serif;
    display: inline-flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px 28px 28px;
    background: #FAFAFA;
    border: 1px solid #E5E7EB;
    border-radius: 18px;
    user-select: none;
    max-width: 100%;
    overflow-x: auto;
  }

  /* ── Legend ──────────────────────────────────────────────────── */
  .legend {
    display: flex;
    gap: 20px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend-dot {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .legend-item.seller .legend-dot { background: #FFE08A; border: 1.5px solid #D6A728; }
  .legend-item.tracx  .legend-dot { background: #BFDBFE; border: 1.5px solid #60A5FA; }

  /* ── Diagram container ───────────────────────────────────────── */
  .diagram {
    display: flex;
    flex-direction: column;
  }

  /* ── Rows ────────────────────────────────────────────────────── */
  .row {
    display: flex;
    align-items: center;
  }

  /* ── Nodes ───────────────────────────────────────────────────── */
  .node {
    width: var(--node-w);
    height: var(--node-h);
    flex-shrink: 0;
    border-radius: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: default;
    transition:
      transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.2s ease;
    animation: nodeIn 0.45s ease both;
  }
  @keyframes nodeIn {
    from { opacity: 0; transform: translateY(6px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }

  .node.seller { background: #FFFBEB; border: 1.5px solid #D6A728; }
  .node.tracx  { background: #EFF6FF; border: 1.5px solid #60A5FA; }

  .node:hover,
  .node.active {
    transform: translateY(-3px) scale(1.04);
    z-index: 2;
  }
  .node.seller:hover, .node.seller.active {
    background: #FEF3C7;
    box-shadow: 0 6px 20px rgba(214, 167, 40, 0.25);
  }
  .node.tracx:hover, .node.tracx.active {
    background: #DBEAFE;
    box-shadow: 0 6px 20px rgba(96, 165, 250, 0.25);
  }

  .step-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .node.seller .step-label { color: #92400E; }
  .node.tracx  .step-label { color: #1D4ED8; }

  .step-text {
    font-size: 12.5px;
    font-weight: 600;
    text-align: center;
    white-space: pre-line;
    line-height: 1.45;
  }
  .node.seller .step-text { color: #78350F; }
  .node.tracx  .step-text { color: #1E3A5F; }

  /* ── Horizontal arrows ───────────────────────────────────────── */
  .h-arrow {
    width: var(--gap-w);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--arrow-idle);
    transition: color 0.2s ease;
  }
  .h-arrow.lit { color: var(--arrow-lit); }
  .h-arrow svg {
    width: 22px;
    height: 22px;
  }

  /* ── Turn connector ──────────────────────────────────────────── */
  /*
   * Layout: [spacer = 3 nodes + 3 gaps] [turn-cell = 1 node wide]
   * The down arrow is centered inside turn-cell.
   */
  .turn-row {
    display: flex;
    height: var(--turn-h);
  }
  .turn-spacer {
    /* 3 nodes + 3 arrows */
    width: calc(3 * var(--node-w) + 3 * var(--gap-w));
    flex-shrink: 0;
  }
  .turn-cell {
    width: var(--node-w);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--arrow-idle);
  }
  .v-arrow {
    width: 22px;
    height: 22px;
  }

  /* ── Responsive ──────────────────────────────────────────────── */
  @media (max-width: 680px) {
    .flow-wrapper {
      --node-w: 96px;
      --node-h: 72px;
      --gap-w: 26px;
      padding: 18px 16px 22px;
    }
    .step-text { font-size: 11px; }
    .h-arrow svg, .v-arrow { width: 18px; height: 18px; }
  }
</style>
