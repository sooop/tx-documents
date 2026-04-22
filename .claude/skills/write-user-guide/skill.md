---
name: write-user-guide
description: SmartShip Guide의 온라인 가이드 사이트의 페이지를 추가/개선하기 위해  기능 및 작업별 사용자매뉴얼 및 업무 가이드를 작성합니다. 
---
# SKILL: 가이드 페이지 콘텐츠 작성

AI 에이전트가 주어진 문서(원고, 기획안, 메모 등)와 이미지 파일을 바탕으로 SmartShip Guide 사이트의 가이드 페이지를 작성하는 방법을 안내합니다. 원고는 대화를 통해 직접 전달하며, 관련 이미지는 임시 이미지 폴더에서 찾도록 합니다. 임시 이미지 폴더에 언어별 이미지가 있는 경우 모두 사용하도록 하며, 어노테이션은 기본적으로 주요 언어 (ko 혹은 en)하나에 대해서만 작성하고 복사하도록 합니다.
---

## 프로젝트 구조 개요

```
D:/Projects/tx-documents/
├── src/
│   ├── content/docs/        ← MDX 문서 파일 (라우팅 소스)
│   │   └── {lang}/          ← ko, en, ja, zh-hk, zh-cn
│   │       ├── _nav.json    ← 사이드바 네비게이션 정의
│   │       └── {section}/
│   │           └── {page}/
│   │               └── index.mdx
│   └── assets/images/       ← 어노테이션 JSON 파일
│       └── {section}/
│           └── {image-name}-{lang}.annotations.json
└── public/images/           ← 실제 이미지 파일 (PNG 등)
    └── {section}/
        └── {image-name}-{lang}.png
```

---

## 1. 파일 라우팅 규칙

### URL 구조

```
/{lang}/{section}/{page}/
```

| 세그먼트 | 값 | 예시 |
|----------|-----|------|
| `lang` | `ko`, `en`, `ja`, `zh-hk`, `zh-cn` | `ko` |
| `section` | 최상위 분류 (영문 소문자, 하이픈) | `settings`, `fulfillment`, `delivery` |
| `page` | 세부 페이지 경로 (중첩 가능) | `charge-shipping`, `sites/shopify` |

### MDX 파일 경로 규칙

- **모든 문서 파일명은 반드시 `index.mdx`**
- 파일이 위치한 **폴더 이름**이 URL 경로가 됨
- 최상위 섹션 페이지(목차/소개)는 `{section}/index.mdx`
- 하위 페이지는 `{section}/{page}/index.mdx`

**예시:**

| URL | 파일 경로 |
|-----|-----------|
| `/ko/settings/` | `src/content/docs/ko/settings/index.mdx` |
| `/ko/settings/charge-shipping/` | `src/content/docs/ko/settings/charge-shipping/index.mdx` |
| `/ko/api-guide/sites/shopify/` | `src/content/docs/ko/api-guide/sites/shopify/index.mdx` |

---

## 2. MDX 파일 작성 규칙

### Frontmatter (필수)

모든 `index.mdx` 파일은 다음 frontmatter로 시작해야 합니다:

```yaml
---
title: "페이지 제목"
description: "페이지 설명 (검색엔진 메타태그용, 선택)"
---
```

| 항목 | 필수 | 설명 |
|------|------|------|
| `title` | 필수 | 페이지 제목. 본문 최상단에 h1으로 자동 표시됨 |
| `description` | 선택 | SEO용 설명 |
| `draft` | 선택 | `true`로 설정하면 개발 서버에서만 보임 |
| `updatedAt` | 선택 | 마지막 수정일 (`YYYY-MM-DD`) |

### 헤딩 구조

- **`# 제목` (h1) 사용 금지** — frontmatter `title`이 h1을 자동 생성
- 본문은 `## 제목` (h2)부터 시작
- h2, h3는 우측 목차(TOC)에 자동 표시됨

### 사용 가능한 커스텀 컴포넌트

import 없이 바로 사용 가능:

#### Callout (강조 박스)

```mdx
<Callout type="info" title="참고">내용</Callout>
<Callout type="tip" title="팁">내용</Callout>
<Callout type="warning" title="주의">내용</Callout>
<Callout type="danger" title="중요">내용</Callout>
```

- `title` 생략 가능

#### Collapse (접기/펼치기)

```mdx
<Collapse title="자세히 보기">
  접힌 내용
</Collapse>

<Collapse title="기본 펼침" open>
  처음부터 보이는 내용
</Collapse>
```

#### AnnotatedImage (어노테이션 이미지)

```mdx
<AnnotatedImage src="이미지이름" section="섹션폴더" alt="대체 텍스트" caption="캡션 텍스트" />
```

| 속성 | 필수 | 설명 |
|------|------|------|
| `src` | 필수 | 이미지 이름 (언어코드·확장자 제외) |
| `section` | 필수 | 이미지가 저장된 섹션 폴더명 |
| `alt` | 선택 | 접근성용 대체 텍스트 |
| `caption` | 선택 | 이미지 하단 캡션 |

자동 처리:
1. 현재 페이지 언어 감지
2. `{src}-{lang}.png` → `{src}-en.png` → `{src}-ko.png` 순으로 이미지 탐색
3. 같은 순서로 어노테이션 JSON 탐색 후 오버레이

---

## 3. 이미지 파일 규칙

### 이미지 파일명

```
{이미지이름}-{언어코드}.{확장자}
```

| 구성 요소 | 규칙 | 예시 |
|-----------|------|------|
| 이미지이름 | 영문 소문자, 하이픈 구분, 화면/기능 설명 | `topup-txmoney-page`, `stripe-pg-page` |
| 언어코드 | `ko`, `en`, `ja`, `zh-hk`, `zh-cn` | `ko` |
| 확장자 | `png` 권장 | `png` |

### 이미지 저장 위치

```
public/images/{section}/{이미지이름}-{lang}.png
```

예: `public/images/settings/topup-txmoney-page-ko.png`

> 모든 언어의 이미지를 준비하지 않아도 됩니다. 없으면 `en` → `ko` 순으로 자동 폴백됩니다.

---

## 4. 어노테이션 JSON 규칙

### 파일 경로

```
src/assets/images/{section}/{이미지이름}-{lang}.annotations.json
```

예: `src/assets/images/settings/topup-txmoney-page-ko.annotations.json`

### 기본 구조

```json
{
  "imageId": "이미지이름",
  "annotations": [
    { ... }
  ]
}
```

### 색상 사용

- 별도의 요청이 없는 한 모든 어노테이션은 기본색(oklch(51.4% 0.222 16.935))을 사용함
- 그외 사용 가능한 주요 색으로는 다음 색 사용
    - oklch(45.7% 0.24 277.023)
    - oklch(60% 0.118 184.704)
    - oklch(66.6% 0.179 58.318)
    - oklch(50% 0.134 242.749)

### 좌표 체계

- 모든 좌표는 **이미지 크기 대비 퍼센트(0~100)**
- `(0, 0)` = 좌상단, `(100, 100)` = 우하단

### 어노테이션 유형

#### box (영역 박스)

```json
{
  "id": "고유-id",
  "type": "box",
  "number": 1,
  "x": 10.5,
  "y": 20.0,
  "width": 40.0,
  "height": 8.0,
  "strokeColor": "#FF4444",
  "label": {
    "ko": "한국어 설명",
    "en": "English description"
  }
}
```

#### marker (번호 마커)

```json
{
  "id": "고유-id",
  "type": "marker",
  "number": 2,
  "x": 75.0,
  "y": 45.0,
  "markerRadius": 1.5,
  "label": {
    "ko": "한국어 설명"
  }
}
```

#### arrow (화살표)

```json
{
  "id": "고유-id",
  "type": "arrow",
  "fromX": 50.0,
  "fromY": 30.0,
  "toX": 50.0,
  "toY": 75.0,
  "strokeColor": "#FF4444"
}
```

### 다국어 처리

- 하나의 어노테이션 JSON은 여러 언어가 공유 가능
- `label` 필드에 언어별 텍스트를 담으면 페이지 언어에 맞게 자동 표시
- 언어별로 레이아웃이 달라 좌표가 다른 경우에만 언어별 파일 별도 작성

---

## 5. 네비게이션 등록 규칙

### `_nav.json` 파일 위치

```
src/content/docs/{lang}/_nav.json
```

각 언어마다 별도 파일로 관리합니다.

### 구조

```json
[
  { "slug": "intro", "title": "스마트십이란?" },
  {
    "slug": "settings",
    "title": "주문 등록 전 필수 설정",
    "children": [
      { "slug": "settings/charge-shipping", "title": "배송비 충전하기" }
    ]
  }
]
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `slug` | 필수 | 언어코드 제외한 폴더 경로 (`ko/settings/charge-shipping` → `settings/charge-shipping`) |
| `title` | 필수 | 사이드바 표시 제목 |
| `children` | 선택 | 하위 메뉴 배열 (동일 구조 중첩 가능) |

- 배열 순서 = 사이드바 표시 순서
- `slug`는 `index.mdx`가 위치한 폴더 경로와 정확히 일치해야 함

---

## 6. 임시 이미지 자동 처리

원고 작업 시 이미지 파일을 `public/temp-image/`에 미리 넣어두면, 에이전트가 이미지 내용을 분석하여 이름을 자동으로 결정하고 적절한 경로로 복사합니다.

### 임시 이미지 처리 절차

#### 6-1. temp-image 스캔

작업 시작 시 `public/temp-image/`에 파일이 있는지 확인합니다.

```bash
ls public/temp-image/
```

파일이 있으면 이미지 자동 처리를 진행합니다.

#### 6-2. 이미지 내용 분석 및 이름 결정

각 이미지를 Read 도구로 열어 화면 내용을 파악합니다.

- **이미지에서 파악할 정보:**
  - 어떤 기능/화면인지 (예: TxMoney 충전 화면, Stripe 결제 설정 등)
  - 언어 (한국어/영어/일본어 등) → 언어코드 결정
  - 페이지 URL 힌트가 있으면 section 추론

- **이름 결정 원칙:**
  - 화면/기능을 설명하는 영문 소문자 + 하이픈 조합
  - 끝에 `-page` 또는 `-screen` 등 구분자 사용
  - 예: `topup-txmoney-page`, `stripe-pg-settings`, `order-register-page`

- **불확실한 경우 사용자에게 질문:**
  - 이미지 내용만으로 section을 특정하기 어려운 경우
  - 여러 이미지가 같은 기능처럼 보일 때 구분 방법이 필요한 경우
  - 예: "이미지 파일 `1.png`는 주문 목록 화면으로 보입니다. 어느 섹션에 속하나요? (`orders`, `fulfillment`, 기타)"

#### 6-3. 이미지 파일 복사

이름과 경로가 결정되면 `cp` 명령으로 복사합니다. **Read/Write 도구 사용 금지.**

```bash
cp public/temp-image/{원본파일명} public/images/{section}/{이미지이름}-{lang}.png
```

복사 후 반드시 존재 여부 확인:

```bash
ls public/images/{section}/
```

#### 6-4. 작업 완료 후 temp-image 정리

MDX 파일 작성까지 모든 작업이 완료된 후, 사용한 임시 이미지를 삭제합니다.

```bash
rm public/temp-image/{사용한파일명}
```

삭제 후 확인:

```bash
ls public/temp-image/
```

> **주의:** temp-image 전체를 일괄 삭제(`rm -rf`)하지 않고, 이번 작업에서 사용한 파일만 개별 삭제합니다. 다른 작업을 위해 미리 넣어둔 파일이 있을 수 있습니다.

---

## 7. 작업 순서 (에이전트 체크리스트)

새 가이드 페이지를 추가할 때 다음 순서로 진행합니다:

### 단계 1: 임시 이미지 처리 (temp-image에 파일이 있는 경우)

`public/temp-image/`를 스캔하고, 파일이 있으면 **섹션 6**의 절차에 따라 이미지 이름을 결정합니다. 이미지 복사는 파일 경로가 결정된 후(단계 2 이후) 수행합니다.

### 단계 2: 파일 경로 결정

원고의 주제와 현재 `_nav.json`을 참고하여 적절한 섹션(`section`)과 페이지 경로(`page`)를 결정합니다.

### 단계 3: 이미지 파일 배치

temp-image에서 가져온 이미지 또는 기존 이미지를 `public/images/{section}/` 에 배치합니다.

- temp-image 이미지: `cp` 명령으로 복사 (섹션 6-3 참고)
- 파일명: `{이미지이름}-{lang}.png`
- 한국어 이미지만 있어도 모든 언어 페이지에서 표시됨

### 단계 4: MDX 파일 작성

`src/content/docs/{lang}/{section}/{page}/index.mdx` 파일을 생성합니다.

- frontmatter에 `title` 포함
- 본문은 `##`(h2)부터 시작
- 이미지가 있는 경우 `<AnnotatedImage>` 컴포넌트 사용
- 주의/팁/정보는 `<Callout>` 컴포넌트 사용

### 단계 5: 어노테이션 JSON 작성

이미지에 번호, 박스, 화살표 표시가 필요한 경우:

**어노테이션이 필요한 경우, 박스 사용 금지. 번호만 표시합니다.**

`src/assets/images/{section}/{이미지이름}-{lang}.annotations.json` 파일을 작성합니다.

- `imageId`는 이미지이름(언어코드·확장자 제외)
- 좌표는 이미지 크기 대비 퍼센트(0~100)
- `label`에 언어별 설명 텍스트 포함

### 단계 6: 네비게이션 등록

`src/content/docs/{lang}/_nav.json` 에 항목을 추가합니다.

- `slug`는 정확한 폴더 경로 (언어코드 제외)
- 하위 페이지는 `children` 배열에 추가

### 단계 7: 임시 이미지 정리

모든 작업이 완료된 후 섹션 6-4에 따라 이번 작업에서 사용한 temp-image 파일을 삭제합니다.

---

## 8. 작업 예시

### 예시: `ko/settings/charge-shipping` 페이지

**MDX 파일:** `src/content/docs/ko/settings/charge-shipping/index.mdx`

```mdx
---
title: "배송비 충전하기"
description: "TxMoney 충전 방법 안내"
---

SmartShip에서 배송비를 결제하려면 TxMoney를 먼저 충전해야 합니다.

<Callout type="info">
### TxMoney란?
TxMoney는 배송비 결제에 사용되는 전용 화폐입니다.
</Callout>

## 충전 방법

<AnnotatedImage src="topup-txmoney-page" section="settings" alt="TxMoney 충전 페이지" caption="비용관리 > TxMoney 충전 화면" />

1. **충전 금액 선택** — 원하는 금액을 입력하거나 버튼으로 추가합니다.
2. **결제 방식 선택** — 무통장입금 또는 카드 결제 중 선택합니다.
```

**이미지 파일:** `public/images/settings/topup-txmoney-page-ko.png`

**어노테이션:** `src/assets/images/settings/topup-txmoney-page-ko.annotations.json`

```json
{
  "imageId": "topup-txmoney-page",
  "annotations": [
    {
      "id": "balance",
      "type": "box",
      "number": 1,
      "x": 2.5,
      "y": 73.7,
      "width": 94.5,
      "height": 12.4,
      "label": { "ko": "현재 잔액 및 미결제 청구 금액" }
    },
    {
      "id": "amount-input",
      "type": "marker",
      "number": 2,
      "x": 3.9,
      "y": 92.4,
      "label": { "ko": "충전 금액 입력" }
    }
  ]
}
```

**네비게이션 등록:** `src/content/docs/ko/_nav.json`

```json
{
  "slug": "settings/charge-shipping",
  "title": "배송비 충전하기"
}

## 이미지가 아직 준비되지 않은 경우

- 이미지가 아직 준비되지 않은 경우, 해당 이미지가 방법을 설명하는 절차에서 꼭 필요하다고 예상된다면 placeholder 이미지를 하나 추가합니다. 
- 해당 이미지의 캡션에는 어떤 장면을 캡쳐해야 하는지 설명해둡니다.
```
