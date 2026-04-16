# edream_frontend 프로젝트 인수인계 가이드

## 📋 목차

1. [🚀 빠른 참조 (Quick Reference)](#-빠른-참조-quick-reference)
2. [📖 프로젝트 개요](#-프로젝트-개요)
3. [🔧 공통 규칙](#-공통-규칙)
4. [👨‍💼 관리자 웹 (Admin Web)](#-관리자-웹-admin-web)
5. [👤 사용자 웹 (User Web)](#-사용자-웹-user-web)
6. [🔄 개발 워크플로우](#-개발-워크플로우)
7. [🐛 트러블슈팅](#-트러블슈팅)

---

## 🚀 빠른 참조 (Quick Reference)

### Rule 사용 가이드 매트릭스

| 작업 | 공통 | Admin Web | User Web |
|------|------|-----------|----------|
| **리스트 페이지** | FSD 구조, 라우팅 | Custom CSS, 검색폼, 상태배지, 페이지네이션 | Tailwind만, 반응형 높이 |
| **등록/수정 폼** | FSD 구조, 라우팅 | FormField, 유효성검사 UI, 2-column 레이아웃 | Tailwind만 |
| **상세 페이지** | Query Parameter, Suspense | 리스트-상세 상태 유지 | Tailwind만 |
| **모달/다이얼로그** | - | Modal, ConfirmDialog, API 에러 처리 | - |
| **Excel 다운로드** | - | exceljs, `shared/lib/exceljsAdminExcel`, 엔티티 `excelUtils` | - |
| **스타일링** | Tailwind 기본 | Tailwind + Custom CSS | Tailwind만 |
| **반응형** | Mobile-first | 검색폼 토글, 모바일 테이블 | Viewport 높이 (vh) |

### Rule 파일 선택 Decision Tree

```
새 페이지/기능 개발 시작
│
├─ Admin Web 페이지인가?
│  ├─ YES → Admin Web 규칙 확인
│  │  ├─ 리스트 페이지?
│  │  │  └─ admin-web-list-pagination-guide.mdc
│  │  ├─ 등록/수정 폼?
│  │  │  └─ admin-web-validation-ui-rules.mdc
│  │  ├─ 모달/다이얼로그?
│  │  │  └─ admin-web-modal-component-rules.mdc
│  │  ├─ Excel 다운로드?
│  │  │  └─ admin-web-excel-export-implementation-guide.mdc
│  │  └─ 스타일링?
│  │     └─ admin-web-rules.mdc
│  │
│  └─ NO → User Web 페이지인가?
│     ├─ YES → User Web 규칙 확인
│     │  └─ user-web-rules.mdc
│     │
│     └─ NO → 공통 규칙 확인
│        └─ edream-front-rule.mdc
│
└─ 공통 작업
   ├─ FSD 구조 확인?
   │  └─ edream-front-rule.mdc
   ├─ 라우팅 (상세 페이지)?
   │  └─ edream-front-rule.mdc (Query Parameter)
   └─ 리스트-상세 상태 유지?
      └─ admin-web-list-detail-state-persistence.mdc
```

### Admin Web vs User Web 비교표

| 항목 | Admin Web | User Web |
|------|-----------|----------|
| **스타일링** | Tailwind + Custom CSS | Tailwind만 |
| **CSS Import** | ✅ 필수 (`@/shared/styles/admin/*.css`) | ❌ 금지 |
| **검색 폼** | 토글 버튼, Custom CSS 클래스 | - |
| **테이블** | Custom CSS (mobile-table, resizable-table) | Tailwind만 |
| **상태 배지** | 고정 크기/스타일 (`text-[13px]`, `px-2.5 py-0.5`) | - |
| **액션 버튼** | 고정 템플릿 (등록: `✏️ 등록`, `bg-green-600`) | - |
| **FormField** | ✅ 사용 (FormField, FormInput, FormSelect) | - |
| **유효성 검사** | 내부 wrapper div 구조 | - |
| **모달** | Modal, ConfirmDialog | - |
| **페이지네이션** | 서버 사이드 (useRef, Debounce) | - |
| **Excel 다운로드** | ✅ 지원 | ❌ |
| **반응형 높이** | - | Viewport 기반 (`max-h-[90vh]`) |
| **고정 높이** | - | ❌ 금지 (`h-[880px]` 등) |

### 작업별 체크리스트

#### 리스트 페이지 (Admin Web)
- [ ] Custom CSS import (search-form, mobile-table, table-filter)
- [ ] 서버 사이드 페이지네이션 (useRef, Debounce 800ms)
- [ ] 명시적 검색 (Enter 키 또는 버튼 클릭)
- [ ] `rnum` 필드로 행 번호 표시
- [ ] 검색 폼 토글 버튼 (모바일)
- [ ] Suspense fallback 사용
- [ ] 상태 배지 일관성 (`text-[13px]`, `px-2.5 py-0.5`)

#### 등록/수정 폼 (Admin Web)
- [ ] FormField, FormInput, FormSelect 사용
- [ ] 2-column 레이아웃
- [ ] 유효성 검사 에러 메시지 (내부 wrapper div)
- [ ] 필수 필드 표시 (`*`)
- [ ] API 에러는 ConfirmDialog (`type="danger"`)
- [ ] 성공 메시지는 ConfirmDialog (`type="success"`)
- [ ] 버튼 순서: 등록 (왼쪽) → 닫기 (오른쪽)

#### 상세 페이지 (공통)
- [ ] Query Parameter 사용 (`?id=...`)
- [ ] Suspense fallback 사용
- [ ] 리스트로 돌아갈 때 상태 유지 (Query Parameter)

#### User Web 페이지
- [ ] Tailwind CSS만 사용 (Custom CSS 금지)
- [ ] Viewport 기반 높이 (`max-h-[90vh]`)
- [ ] 고정 픽셀 높이 금지 (`h-[880px]` 등)

---

## 📖 프로젝트 개요

### 프로젝트 소개

**edream_frontend**는 Next.js 14 기반의 관리자 웹 애플리케이션입니다. Feature-Sliced Design (FSD) 아키텍처를 따르며, TypeScript와 Tailwind CSS를 사용합니다.

### 주요 특징

- **Next.js 14 (App Router)**: 최신 Next.js App Router 사용
- **TypeScript (Strict Mode)**: 엄격한 타입 체크
- **Static Export Mode**: `output: 'export'` 모드로 정적 사이트 생성
- **FSD 아키텍처**: Feature-Sliced Design 패턴 준수
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **이중 웹 구조**: Admin Web (`/adminWeb/*`)과 User Web (`/userWeb/*`) 분리

### 프로젝트 구조

```
edream_frontend/
├── src/
│   ├── app/              # Next.js App Router (라우팅 레이어)
│   │   ├── adminWeb/     # 관리자 웹 페이지
│   │   └── userWeb/      # 사용자 웹 페이지
│   ├── entities/         # 비즈니스 엔티티 (재사용 가능한 도메인 로직)
│   │   ├── adminWeb/     # 관리자 웹 엔티티 (member, board, article, etc.)
│   │   └── auth/         # 인증 엔티티
│   ├── features/           # 기능 단위 (비즈니스 기능)
│   │   ├── adminWeb/     # 관리자 웹 기능
│   │   └── userWeb/      # 사용자 웹 기능
│   ├── widgets/          # 복합 UI 컴포넌트
│   │   ├── adminWeb/     # 관리자 웹 위젯 (AdminLayout, Header, Sidebar)
│   │   └── userWeb/      # 사용자 웹 위젯
│   └── shared/           # 공유 리소스
│       ├── config/       # 설정
│       ├── hooks/        # 커스텀 훅
│       ├── lib/          # 유틸리티
│       ├── styles/       # 스타일 파일
│       └── ui/           # 공통 UI 컴포넌트
├── .cursor/
│   └── rules/            # Cursor AI 규칙 파일들
└── public/               # 정적 파일
```

**⚠️ 중요: 프로젝트 구조 일관성**
- 모든 Admin Web 관련 디렉토리는 `adminWeb`으로 통일되어 있습니다:
  - `app/adminWeb/`
  - `entities/adminWeb/`
  - `features/adminWeb/`
  - `widgets/adminWeb/`

### 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 14.0.4 | React 프레임워크 (App Router) |
| **React** | 18.2.0 | UI 라이브러리 |
| **TypeScript** | 5.5.3 | 타입 안전성 |
| **Tailwind CSS** | 3.4.19 | 유틸리티 퍼스트 CSS |
| **exceljs** | ^4.4 | Excel 파일 생성·읽기 (스타일 지원) |

### 빌드 설정

- **Static Export**: `output: 'export'` 모드
- **이미지 최적화**: 비활성화 (`unoptimized: true`)
- **React Strict Mode**: 활성화

---

## 🔧 공통 규칙

### FSD 아키텍처

**레이어 구조:**
```
app → widgets → features → entities → shared
```

**의존성 규칙:**
- ✅ 하위 레이어만 import 가능
- ❌ 상위 레이어 import 금지
- ❌ 순환 의존성 금지

#### app/ 레이어 - 라우팅만 담당 (CRITICAL)

**포함 가능:**
- ✅ Layout wrapper (`<AdminLayout>`)
- ✅ Feature/widget 컴포넌트 import 및 렌더링
- ✅ Route parameter 처리 (query params, path params)
- ✅ Suspense boundaries

**포함 불가:**
- ❌ UI 마크업 (page headers, breadcrumbs, cards, containers)
- ❌ Form elements, buttons, inputs
- ❌ 스타일링 클래스 또는 인라인 스타일
- ❌ 비즈니스 로직 또는 상태 관리
- ❌ API 호출 또는 데이터 페칭

**올바른 예시:**
```typescript
// ✅ CORRECT: src/app/adminWeb/member/list/page.tsx
"use client";

import { Suspense } from "react";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { MemberListPageView } from "@/features/adminWeb/member/list/ui";
import { LoadingFallback } from "@/shared/ui/adminWeb";

export default function MemberListPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<LoadingFallback />}>
        <MemberListPageView />
      </Suspense>
    </AdminLayout>
  );
}
```

### 라우팅 규칙 (Static Export 모드)

**⚠️ CRITICAL**: Dynamic Routes (`[id]`) 대신 Query Parameters (`?id=...`) 사용

**이유:**
- `output: 'export'` 모드는 정적 사이트 생성
- Dynamic Routes는 `generateStaticParams()` 필요 (모든 ID를 빌드 타임에 알아야 함)
- Query Parameters는 런타임에 동적으로 처리 가능

**올바른 패턴:**
```typescript
// ✅ CORRECT: Query Parameter 사용
// src/app/adminWeb/board/detail/page.tsx
export default function BoardDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BoardDetailContent />
    </Suspense>
  );
}

// src/features/adminWeb/board/detail/ui/BoardDetailPageView.tsx
export const BoardDetailPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const bbsid = searchParams?.get("bbsid") || "";  // Query parameter 사용
  // ...
};
```

### Suspense Fallback

**Suspense**는 React의 비동기 작업 대기 중 UI를 표시하는 기능입니다.

**왜 필요한가?**
- `useSearchParams()` 사용 시 필수 (Next.js 요구사항)
- URL 파라미터를 읽는 동안 로딩 상태 표시
- FSD 아키텍처 준수 (인라인 UI 마크업 대신 컴포넌트 사용)

**올바른 사용:**
```typescript
import { LoadingFallback } from "@/shared/ui/adminWeb";

<Suspense fallback={<LoadingFallback />}>
  <DetailContent />  {/* useSearchParams() 사용 */}
</Suspense>
```

### TypeScript 규칙

**MUST:**
- ✅ Strict mode 사용
- ✅ `any` 타입 금지
- ✅ 명시적 타입 정의
- ✅ Interface 사용 (Props, API Response 등)

**MUST NOT:**
- ❌ `any` 타입 사용
- ❌ 타입 단언 (`as`) 남용
- ❌ `@ts-ignore` 사용 (필요 시 `@ts-expect-error` 사용)

### Import 규칙

**순서:**
1. React 및 Next.js
2. Third-party 라이브러리
3. Internal 모듈 (`@/` 절대 경로)
4. Relative imports
5. Styles (항상 마지막)

**절대 경로 사용:**
```typescript
// ✅ CORRECT
import { MemberService } from "@/entities/adminWeb/member/api";
import { AdminLayout } from "@/widgets/adminWeb/layout";

// ❌ WRONG
import { MemberService } from "../../../entities/adminWeb/member/api";
```

---

## 👨‍💼 관리자 웹 (Admin Web)

### 스타일링 규칙

#### Custom CSS Import (CRITICAL)

Admin Web 페이지는 **Tailwind CSS + Custom CSS**를 사용합니다.

**필수 CSS 파일:**
```typescript
import "@/shared/styles/admin/search-form.css";      // 검색 폼
import "@/shared/styles/admin/mobile-table.css";     // 모바일 테이블
import "@/shared/styles/admin/resizable-table.css";   // 리사이즈 가능한 테이블
import "@/shared/styles/admin/table-filter.css";     // 테이블 필터
```

**예시:**
```typescript
// ✅ CORRECT: Admin Web 페이지
"use client";

import React from "react";
import { useProgramList } from "../model";
import "@/shared/styles/admin/search-form.css";  // ✅ 필수
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/table-filter.css";

export const ProgramListPageView: React.FC = () => {
  // ...
};
```

#### 검색 폼 구조 패턴

```typescript
// ✅ CORRECT: 검색 폼 구조
<div className="md:hidden mb-2">
  <button onClick={() => setShowSearchForm(!showSearchForm)}>
    {showSearchForm ? "▲ 조회조건 닫기" : "▼ 조회조건 열기"}
  </button>
</div>

<div className={`bg-white mb-3 rounded-lg shadow search-form-container ${
  showSearchForm ? "show" : ""
}`}>
  {/* 검색 필드만 */}
</div>

{/* 조회 버튼은 폼 밖에 별도 배치 */}
<div className="flex justify-end mb-3 gap-2">
  <button onClick={handleSearch}>🔍 조회</button>
</div>
```

#### 상태 배지 일관성

모든 상태 배지는 동일한 크기와 스타일을 사용해야 합니다:

```typescript
// ✅ CORRECT: 상태 배지
<span
  className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
    status === "Y" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  }`}
>
  {status === "Y" ? "사용" : "미사용"}
</span>
```

**필수 속성:**
- `text-[13px]` (NOT `text-xs`)
- `px-2.5 py-0.5` (NOT `px-2 py-1`)
- `inline-flex items-center` (NOT `inline-block`)
- `rounded-[5px]` (NOT `rounded`)
- `font-medium`

#### 액션 버튼 일관성

**등록 버튼 템플릿:**
```typescript
<button
  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
  style={{ minWidth: "100px" }}
  onClick={handleRegister}
>
  ✏️ 등록
</button>
```

**필수 속성:**
- 배경색: `bg-green-600`
- 아이콘: `✏️` (연필 이모지)
- 텍스트: `등록`
- 최소 너비: `minWidth: "100px"`

### 폼 유효성 검사 UI

#### 에러 메시지 구조 (CRITICAL)

에러 메시지는 **내부 wrapper div 안에** 위치해야 합니다.

```typescript
// ✅ CORRECT: 에러 메시지 구조
<div
  className="register-form-mobile-field w-full md:w-3/4 flex items-center"
  style={{ border: "1px solid #dee2e6", padding: "5px" }}
>
  <div className="w-full">  {/* ✅ 내부 wrapper 필수 */}
    <input
      type="text"
      name="userId"
      className={`w-full border rounded-none px-3 py-2 ${
        errors.userId ? "border-red-500" : ""
      }`}
      style={{
        border: errors.userId ? "1px solid #dc3545" : "1px solid #e0e0e0",
      }}
      value={formData.userId}
      onChange={handleInputChange}
    />
    {/* ✅ 에러 메시지가 내부 wrapper 안에 */}
    {errors.userId && (
      <div className="text-red-600 text-sm mt-1 px-2">{errors.userId}</div>
    )}
  </div>
</div>
```

#### 필수 필드 표시 (CRITICAL)

유효성 검사가 있는 모든 필드의 라벨에 필수 표시(`*`)를 추가해야 합니다.

```typescript
// ✅ CORRECT: 필수 필드 표시
<label
  className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
  style={{ border: "1px solid #dee2e6", padding: "5px" }}
>
  User ID <span className="text-red-600 ml-1">*</span>  {/* ✅ 필수 표시 */}
</label>
```

**템플릿:**
```typescript
Field Name <span className="text-red-600 ml-1">*</span>
```

### 모달 컴포넌트

#### 컴포넌트 선택 가이드

**Modal Component** (`@/shared/ui/adminWeb/Modal`):
- 복잡한 콘텐츠 (폼, 트리, 리스트, 데이터 테이블)
- 스크롤이 필요한 콘텐츠
- 크기 옵션: `sm`, `md`, `lg`, `xl`

**ConfirmDialog Component** (`@/shared/ui/adminWeb/ConfirmDialog`):
- 간단한 확인 다이얼로그
- 삭제 확인, 경고, 성공 메시지
- 타입: `danger`, `warning`, `success`

**예시:**
```typescript
// ✅ CORRECT: Modal 사용
<Modal
  isOpen={isModalOpen}
  title="Modal Title"
  onClose={handleCloseModal}
  size="md"
>
  <ComplexForm />
</Modal>

// ✅ CORRECT: ConfirmDialog 사용
<ConfirmDialog
  type="success"  // ✅ 성공 메시지는 "success" 타입
  title="등록 완료"
  message="정상적으로 등록되었습니다."
  confirmText="확인"
  onConfirm={handleClose}
  onCancel={handleClose}
/>
```

#### API 에러 처리 패턴 (CRITICAL)

**모든 API 통신 에러는 ConfirmDialog로 표시**해야 합니다 (빨간 텍스트 아님).

```typescript
// ✅ CORRECT: API 에러 처리
catch (err) {
  console.error("등록 오류:", err);
  
  if (err instanceof ApiError) {
    setMessageDialogTitle("등록 실패");
    setMessageDialogMessage(
      err.message || "등록 중 오류가 발생했습니다."
    );
    setMessageDialogType("danger");  // ✅ "danger" 타입 사용
    setShowMessageDialog(true);
  }
}

// 컴포넌트에서
<ConfirmDialog
  isOpen={showMessageDialog}
  title={messageDialogTitle}
  message={messageDialogMessage}
  type={messageDialogType}  // "danger" for API errors
  onConfirm={handleMessageDialogClose}
  onCancel={handleMessageDialogClose}
/>
```

**절대 사용 금지:**
```typescript
// ❌ WRONG: 빨간 텍스트로 에러 표시
catch (err) {
  setError(err.message);  // ❌
}

// 컴포넌트에서
{error && <div className="text-red-600">{error}</div>}  // ❌
```

### 리스트 페이지네이션

#### 서버 사이드 페이지네이션 + 필터링 (표준 패턴)

이 프로젝트는 **서버 사이드 페이지네이션 + 서버 사이드 필터링**을 표준 패턴으로 사용합니다.

**핵심 패턴:**
```typescript
// 1. useRef로 필터/검색 조건 안정화
const filtersRef = useRef(filters);
const searchConditionRef = useRef(searchCondition);
const searchKeywordRef = useRef(searchKeyword);

// 2. fetch 함수는 최소 의존성만
const fetchMembers = useCallback(async () => {
  const params = {
    searchCondition: searchConditionRef.current,  // ref 사용
    searchKeyword: searchKeywordRef.current,
    filterUserId: filtersRef.current.userId || undefined,
    length: pageSize.toString(),
    start: startIndex.toString(),
  };
  // ...
}, [currentPage, pageSize]);  // ⚠️ 페이지 관련만 의존성

// 3. fetchMembers를 위한 ref 생성
const fetchMembersRef = useRef(fetchMembers);
useEffect(() => {
  fetchMembersRef.current = fetchMembers;
}, [fetchMembers]);

// 4. 테이블 필터: Debounce 800ms
useEffect(() => {
  if (isInitialLoad) return;
  
  const timer = setTimeout(() => {
    setCurrentPage(1);
    fetchMembersRef.current();  // ref 사용
  }, 800);
  
  return () => clearTimeout(timer);
}, [filters.userId, filters.userNm, /* ... */, isInitialLoad]);
// ⚠️ fetchMembers NOT in dependencies

// 5. 검색 조건: 명시적 검색 (자동 검색 아님)
const handleSearch = () => {
  setCurrentPage(1);
  fetchMembers();
};
```

#### 검색 조건 vs 테이블 필터

**검색 조건** (검색구분, 검색어):
- ✅ **명시적 검색**: Enter 키 또는 "조회" 버튼 클릭 시에만 API 호출
- ❌ 자동 검색 금지 (입력할 때마다 API 호출 안 됨)

**테이블 필터** (테이블 헤더의 필터 입력):
- ✅ **Debounce 800ms**: 입력 후 800ms 대기 후 API 호출
- ✅ 실시간 필터링 느낌 제공

**예시:**
```typescript
// ✅ CORRECT: 검색 조건 - 명시적 검색
<input
  type="text"
  value={searchKeyword}
  onChange={(e) => setSearchKeyword(e.target.value)}  // 상태만 업데이트
  onKeyPress={(e) => {
    if (e.key === "Enter") {
      handleSearch();  // 명시적 API 호출
    }
  }}
/>
<button onClick={handleSearch}>🔍 조회</button>

// ✅ CORRECT: 테이블 필터 - Debounce
<input
  type="text"
  value={filters.userId}
  onChange={(e) => setFilters({...filters, userId: e.target.value})}
  // Debounce useEffect가 자동으로 처리
/>
```

#### 행 번호 표시 (CRITICAL)

서버 사이드 페이지네이션에서는 **데이터베이스의 `rnum` 필드를 사용**해야 합니다.

```typescript
// ✅ CORRECT: rnum 사용
items.map((item, index) => {
  const rowNumber = item.rnum || String((currentPage - 1) * pageSize + index + 1);
  return (
    <tr key={item.id}>
      <td>{rowNumber}</td>
      {/* ... */}
    </tr>
  );
});

// ❌ WRONG: 프론트엔드 계산
const rowNumber = (currentPage - 1) * pageSize + index + 1;  // ❌
```

#### 백엔드 SQL 파라미터 매핑 (CRITICAL)

백엔드 SQL에서는 `CommonService.setCommon()`이 변환한 파라미터 이름을 사용해야 합니다.

**프론트엔드 → 백엔드 변환:**
- `length` → `lengthPage`
- `start` → `startIndex`

**SQL 예시:**
```xml
<!-- ✅ CORRECT: 변환된 파라미터 이름 사용 -->
<select id="selectList" parameterType="egovMap" resultType="egovMap">
  SELECT * FROM table
  LIMIT #{lengthPage} OFFSET #{startIndex}  <!-- ✅ 변환된 이름 -->
</select>

<!-- ❌ WRONG: 프론트엔드 파라미터 이름 직접 사용 -->
LIMIT #{length} OFFSET #{start}  <!-- ❌ -->
```

### 리스트-상세 상태 유지

#### 상태 유지 패턴

리스트 페이지의 검색 조건, 필터, 페이지 번호를 URL query parameters로 유지합니다.

**리스트 → 상세 이동:**
```typescript
// ✅ CORRECT: Query parameters로 상태 유지
const handleDetailClick = (id: string) => {
  const params = new URLSearchParams({
    esntlId: id,
    searchCondition: searchCondition || "1",
    searchKeyword: searchKeyword || "",
    page: currentPage.toString(),
  });
  router.push(`/adminWeb/member/detail?${params.toString()}`);
};
```

**상세 → 리스트 복귀:**
```typescript
// ✅ CORRECT: Query parameters에서 상태 복원
export const MemberListPageView: React.FC = () => {
  const searchParams = useSearchParams();
  const returnPage = searchParams?.get("page") || "1";
  
  useEffect(() => {
    if (returnPage) {
      setCurrentPage(parseInt(returnPage));
    }
  }, [returnPage]);
  
  // 검색 조건, 필터도 복원
  // ...
};
```

### Excel 다운로드

#### 구현 단계

**1. 라이브러리:** `exceljs`는 저장소에 이미 포함되어 있습니다. SheetJS 계열 npm 패키지는 사용하지 않습니다.

**2. API 엔드포인트 추가:**
```typescript
// src/shared/config/api.ts
export const API_ENDPOINTS = {
  MEMBER: {
    ADMIN_LIST: "/api/admin/member/selectAdminUserMemberList.Ajax",
    ADMIN_EXCEL_LIST: "/api/admin/member/selectAdminUserMemberExcelList.Ajax",  // ✅
  },
};
```

**3. API 서비스 메서드 추가:**
```typescript
// entities/adminWeb/member/api/memberApi.ts
static async getMemberExcel(
  params: Omit<MemberListParams, "length" | "start">  // 페이지네이션 제외
): Promise<MemberListResponse> {
  const response = await apiClient.post<MemberListResponse>(
    API_ENDPOINTS.MEMBER.ADMIN_EXCEL_LIST,
    params
  );
  return response;
}
```

**4. Excel 유틸리티:** 공통 스타일은 `@/shared/lib/exceljsAdminExcel`의 `downloadAdminListExcelFile`로 맞추고, 엔티티에서는 헤더·`dataRows`·`columnWidths`만 정의합니다.

```typescript
// entities/adminWeb/member/lib/excelUtils.ts
import { downloadAdminListExcelFile } from "@/shared/lib/exceljsAdminExcel";

export async function downloadAdminMembersExcel(
  members: AdminMember[],
  fileName: string = "관리자회원",
): Promise<void> {
  const headers = ["번호", "아이디", "이름" /* ... */];
  const dataRows = members.map((m, i) => [i + 1, m.userId ?? "", m.userNm ?? "" /* ... */]);
  await downloadAdminListExcelFile("관리자회원 목록", fileName, {
    title: fileName,
    headers,
    dataRows,
    columnWidths: [8, 15, 12 /* ... */],
  });
}
```

**5. Hook에 다운로드 핸들러 추가:**
```typescript
// features/adminWeb/member/list/model/useMemberList.ts
const handleExcelDownload = async () => {
  try {
    setLoading(true);
    
    // 페이지네이션 제외한 파라미터
    const params = {
      searchCondition: searchCondition,
      searchKeyword: searchKeyword,
      // ... 필터 파라미터
    };
    
    const response = await MemberService.getMemberExcel(params);
    // 응답 파싱
    const itemList = response.data || [];
    
    if (itemList.length === 0) {
      setError("다운로드할 데이터가 없습니다.");
      return;
    }
    
    await downloadAdminMembersExcel(itemList, "관리자회원");
  } catch (err) {
    // 에러 처리
  } finally {
    setLoading(false);
  }
};
```

**6. UI에 버튼 추가:**
```typescript
<button
  className="px-3 py-1 text-[13px] bg-green-600 text-white rounded hover:bg-green-700"
  onClick={handleExcelDownload}
  disabled={loading}
>
  {loading ? "⏳ 다운로드 중..." : "📊 엑셀"}
</button>
```

---

## 👤 사용자 웹 (User Web)

### 스타일링 규칙

#### Tailwind CSS Only (CRITICAL)

User Web 페이지는 **Tailwind CSS만** 사용합니다 (Custom CSS 없음).

```typescript
// ✅ CORRECT: User Web 페이지
"use client";

import React from "react";
// ✅ NO CSS imports - Tailwind only

export const HomePageView: React.FC = () => {
  return (
    <div className="w-full">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900">제목</h1>
      </div>
    </div>
  );
};
```

**MUST NOT:**
- ❌ Custom CSS 파일 import 금지
- ❌ `@/shared/styles/admin/*.css` import 금지
- ❌ Custom CSS 클래스 사용 금지

### 반응형 높이 규칙 (CRITICAL)

**절대 사용 금지:**
- ❌ 고정 픽셀 높이: `h-[880px]`, `min-h-[900px]`
- ❌ 데스크톱 기준 높이 설정

**올바른 사용:**
```typescript
// ✅ CORRECT: Viewport 기반 높이
<div className="max-h-[90vh] overflow-y-auto">
  {/* 콘텐츠가 자연스럽게 높이 결정 */}
</div>

// ✅ CORRECT: 간격 조정으로 시각적 높이 증가
<div className="max-h-[90vh]">
  <div className="mb-8">  {/* 간격 증가 */}
    <h1>제목</h1>
  </div>
</div>
```

---

## 🔄 개발 워크플로우

### 새 기능 개발 시 체크리스트

#### 1. 리스트 페이지 개발 (Admin Web)

**Before 시작:**
- [ ] 기존 리스트 페이지 패턴 확인 (MemberList, ProgramList 등)
- [ ] API 엔드포인트 확인
- [ ] 응답 타입 정의 확인

**구현 단계:**
1. Entity API 서비스 생성 (`entities/adminWeb/{entity}/api/`)
2. Feature hook 생성 (`features/adminWeb/{feature}/list/model/use{Entity}List.ts`)
3. UI 컴포넌트 생성 (`features/adminWeb/{feature}/list/ui/{Entity}ListPageView.tsx`)
4. App 라우팅 페이지 생성 (`app/adminWeb/{path}/list/page.tsx`)

**체크리스트:**
- [ ] Custom CSS import (search-form, mobile-table, table-filter)
- [ ] 서버 사이드 페이지네이션 구현
- [ ] `useRef`로 필터/검색 조건 안정화
- [ ] Debounce 800ms로 테이블 필터 구현
- [ ] 명시적 검색 (Enter 키 또는 버튼 클릭)
- [ ] `rnum` 필드로 행 번호 표시
- [ ] 필터 토글 버튼 구현
- [ ] Suspense fallback 사용
- [ ] 상태 배지 일관성

#### 2. 등록/수정 폼 개발 (Admin Web)

**Before 시작:**
- [ ] 기존 등록 폼 패턴 확인 (MemberRegisterForm, BoardRegisterForm)
- [ ] FormField 컴포넌트 사용 확인
- [ ] 유효성 검사 규칙 확인

**구현 단계:**
1. Feature hook 생성 (`features/adminWeb/{feature}/register/model/use{Entity}Register.ts`)
2. UI 컴포넌트 생성 (`features/adminWeb/{feature}/register/ui/{Entity}RegisterForm.tsx`)
3. App 라우팅 페이지 생성 (`app/adminWeb/{path}/register/page.tsx`)

**체크리스트:**
- [ ] FormField, FormInput, FormSelect 컴포넌트 사용
- [ ] 2-column 레이아웃 사용
- [ ] 유효성 검사 에러 메시지 구조 준수
- [ ] 필수 필드 표시 (`*`) 추가
- [ ] API 에러는 ConfirmDialog로 표시
- [ ] 성공 메시지는 `type="success"` 사용
- [ ] 버튼 순서: 등록 (왼쪽) → 닫기 (오른쪽)
- [ ] 버튼 텍스트: "등록" / "등록 중..." 및 "닫기" (NOT "취소")

#### 3. 상세 페이지 개발 (공통)

**Before 시작:**
- [ ] 기존 상세 페이지 패턴 확인 (MemberDetailPageView)
- [ ] Query parameter 패턴 확인

**구현 단계:**
1. Feature hook 생성 (`features/{feature}/detail/model/use{Entity}Detail.ts`)
2. UI 컴포넌트 생성 (`features/{feature}/detail/ui/{Entity}DetailPageView.tsx`)
3. App 라우팅 페이지 생성 (`app/{path}/detail/page.tsx`)

**체크리스트:**
- [ ] Query parameter로 ID 받기 (`?id=...`)
- [ ] Suspense fallback 사용
- [ ] 리스트로 돌아갈 때 상태 유지

#### 4. User Web 페이지 개발

**Before 시작:**
- [ ] 기존 User Web 페이지 패턴 확인
- [ ] Tailwind CSS만 사용 확인

**구현 단계:**
1. Feature hook 생성 (`features/userWeb/{feature}/model/`)
2. UI 컴포넌트 생성 (`features/userWeb/{feature}/ui/`)
3. App 라우팅 페이지 생성 (`app/userWeb/{path}/page.tsx`)

**체크리스트:**
- [ ] Tailwind CSS만 사용 (Custom CSS 금지)
- [ ] Viewport 기반 높이 (`max-h-[90vh]`)
- [ ] 고정 픽셀 높이 금지 (`h-[880px]` 등)

---

## 🐛 트러블슈팅

### 일반적인 문제

#### 1. "Module not found" 에러

**원인:**
- `model/index.ts` 파일 누락
- 잘못된 import 경로

**해결:**
```typescript
// ✅ model/index.ts 파일 생성
// src/features/{feature}/{action}/model/index.ts
export { use{Entity}List } from "./use{Entity}List";

// ✅ 절대 경로 사용
import { use{Entity}List } from "@/features/{feature}/list/model";
```

#### 2. Tailwind CSS 클래스가 적용되지 않음

**원인:**
- `tailwind.config.js`의 `content` 배열에 경로 누락

**해결:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/entities/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/widgets/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",  // ✅ 필수
  ],
};
```

#### 3. 페이지네이션이 작동하지 않음

**원인:**
- `fetchMembers` 함수가 필터/검색 조건 변경 시 재생성됨
- Debounce useEffect에 `fetchMembers`가 의존성에 포함됨

**해결:**
```typescript
// ✅ useRef 사용
const filtersRef = useRef(filters);
const fetchMembersRef = useRef(fetchMembers);

// ✅ fetchMembers는 최소 의존성만
const fetchMembers = useCallback(async () => {
  const params = {
    filterUserId: filtersRef.current.userId,  // ref 사용
  };
}, [currentPage, pageSize]);  // 페이지 관련만

// ✅ Debounce에서 ref 사용
useEffect(() => {
  const timer = setTimeout(() => {
    fetchMembersRef.current();  // ref 사용
  }, 800);
}, [filters.userId, isInitialLoad]);  // fetchMembers NOT in dependencies
```

#### 4. 검색할 때마다 API 호출됨

**원인:**
- 검색 조건이 `useEffect` 의존성에 포함됨

**해결:**
```typescript
// ❌ WRONG: 자동 검색
useEffect(() => {
  if (!isInitialLoad) {
    fetchData();
  }
}, [searchKeyword]);  // ❌ 자동 호출

// ✅ CORRECT: 명시적 검색
useEffect(() => {
  fetchData();  // 초기 로드만
}, []);

const handleSearch = () => {
  setCurrentPage(1);
  fetchData();  // 명시적 호출
};
```

#### 5. Custom CSS가 적용되지 않음 (Admin Web)

**원인:**
- CSS 파일 import 누락

**해결:**
```typescript
// ✅ Admin Web 페이지에 필수
import "@/shared/styles/admin/search-form.css";
import "@/shared/styles/admin/mobile-table.css";
import "@/shared/styles/admin/table-filter.css";
```

#### 6. "useSearchParams() should be wrapped in a suspense boundary" 에러

**원인:**
- `useSearchParams()` 사용 시 Suspense로 감싸지 않음

**해결:**
```typescript
// ✅ CORRECT
import { Suspense } from "react";
import { LoadingFallback } from "@/shared/ui/adminWeb";

export default function DetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DetailContent />  {/* useSearchParams() 사용 */}
    </Suspense>
  );
}
```

---

## 참고 자료

### 주요 파일 위치

- **메인 규칙**: `.cursor/rules/common/edream-front-rule.mdc`
- **Admin Web 규칙**: `.cursor/rules/admin-web/admin-web-rules.mdc`
- **User Web 규칙**: `.cursor/rules/user-web/user-web-rules.mdc`
- **API 설정**: `src/shared/config/api.ts`
- **API Client**: `src/shared/lib/apiClient.ts`

### 참고 구현 파일

**리스트 페이지:**
- `src/features/adminWeb/member/list/ui/MemberListPageView.tsx`
- `src/features/adminWeb/program/list/ui/ProgramListPageView.tsx`

**등록 폼:**
- `src/features/adminWeb/member/register/ui/MemberRegisterForm.tsx`
- `src/features/adminWeb/board/register/ui/BoardRegisterForm.tsx`

**상세 페이지:**
- `src/features/adminWeb/member/detail/ui/MemberDetailPageView.tsx`

---

## 마무리

이 가이드는 edream_frontend 프로젝트의 핵심 내용을 다룹니다. 개발 시 다음을 기억하세요:

1. **FSD 아키텍처 준수**: 레이어별 의존성 규칙을 지키세요
2. **app 레이어 순수성**: 라우팅만 담당, UI 마크업 금지
3. **서버 사이드 페이지네이션**: 표준 패턴 사용
4. **일관성**: 기존 패턴을 확인하고 동일하게 구현
5. **Cursor Rules 참조**: 각 작업 전 관련 rule 파일 확인

추가 질문이나 도움이 필요하면 각 rule 파일을 참조하거나 기존 구현 파일을 확인하세요.

---

**작성일**: 2025-01-22  
**프로젝트**: edream_frontend  
**버전**: 1.0.0
