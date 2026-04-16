# edream_frontend

Next.js 14 기반의 관리자 웹 애플리케이션입니다. Feature-Sliced Design (FSD) 아키텍처를 따르며, TypeScript와 Tailwind CSS를 사용합니다.

## 🚀 주요 특징

- **Next.js 14 (App Router)**: 최신 Next.js App Router 사용
- **TypeScript (Strict Mode)**: 엄격한 타입 체크
- **Feature-Sliced Design (FSD)**: 계층별 아키텍처 패턴
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Static Export**: 정적 사이트 생성 (`output: 'export'`)
- **이중 웹 구조**: Admin Web (`/adminWeb/*`)과 User Web (`/userWeb/*`) 분리

## 📦 기술 스택

| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 14.0.4 | React 프레임워크 (App Router) |
| **React** | 18.2.0 | UI 라이브러리 |
| **TypeScript** | 5.5.3 | 타입 안전성 |
| **Tailwind CSS** | 3.4.19 | 유틸리티 퍼스트 CSS |
| **exceljs** | ^4.4 | Excel 생성·파싱 (스타일 지원, 브라우저) |

## 🏗️ 프로젝트 구조

```
src/
├── app/              # Next.js App Router (라우팅 레이어)
│   ├── adminWeb/     # 관리자 웹 페이지
│   └── userWeb/      # 사용자 웹 페이지
├── entities/         # 비즈니스 엔티티 (재사용 가능한 도메인 로직)
│   ├── adminWeb/     # 관리자 웹 엔티티
│   └── auth/         # 인증 엔티티
├── features/         # 기능 단위 (비즈니스 기능)
│   ├── adminWeb/     # 관리자 웹 기능
│   └── userWeb/      # 사용자 웹 기능
├── widgets/          # 복합 UI 컴포넌트
│   ├── adminWeb/     # 관리자 웹 위젯
│   └── userWeb/      # 사용자 웹 위젯
└── shared/           # 공유 리소스
    ├── config/       # 설정
    ├── hooks/        # 커스텀 훅
    ├── lib/          # 유틸리티
    ├── styles/       # 스타일 파일
    └── ui/           # 공통 UI 컴포넌트
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 3. 프로덕션 빌드

```bash
npm run build
```

빌드된 정적 파일은 `out/` 디렉토리에 생성됩니다.

### 4. 프로덕션 서버 실행

```bash
npm start
```

## 📚 주요 기능

### Admin Web (`/adminWeb/*`)

- **회원 관리**: 회원 목록, 등록, 상세, 권한 관리
- **게시판 관리**: 게시판 목록, 등록, 상세
- **게시글 관리**: 게시글 목록, 등록, 상세, 답글
- **프로그램 관리**: 프로그램 목록, 등록, 상세
- **코드 관리**: 코드 목록, 등록, 그룹 관리
- **메뉴 관리**: 메뉴 목록, 등록, 순서 관리, 트리 구조
- **Excel 다운로드**: 리스트 데이터 Excel 파일로 다운로드
- **서버 사이드 페이지네이션**: 대용량 데이터 효율적 처리

### User Web (`/userWeb/*`)

- **사용자 웹 페이지**: Tailwind CSS만 사용한 깔끔한 UI

## 🏛️ 아키텍처: Feature-Sliced Design (FSD)

이 프로젝트는 **Feature-Sliced Design (FSD)** 아키텍처 패턴을 따릅니다.

**레이어 구조:**
```
app → widgets → features → entities → shared
```

**의존성 규칙:**
- ✅ 하위 레이어만 import 가능
- ❌ 상위 레이어 import 금지
- ❌ 순환 의존성 금지

자세한 내용은 [PROJECT_HANDOVER_GUIDE.md](./PROJECT_HANDOVER_GUIDE.md)를 참조하세요.

## 📖 문서

- **[PROJECT_HANDOVER_GUIDE.md](./PROJECT_HANDOVER_GUIDE.md)**: 프로젝트 인수인계 가이드 (상세한 개발 가이드)
- **[BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md)**: 초보자를 위한 가이드
- **[TAILWIND_GUIDE.md](./TAILWIND_GUIDE.md)**: Tailwind CSS 사용 가이드

## 🔧 개발 규칙

프로젝트의 개발 규칙은 `.cursor/rules/` 디렉토리에 있습니다:

- **공통 규칙**: `.cursor/rules/common/edream-front-rule.mdc`
- **Admin Web 규칙**: `.cursor/rules/admin-web/`
- **User Web 규칙**: `.cursor/rules/user-web/`

## 📝 스크립트

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 🔐 인증

- **세션 관리**: `sessionStorage` 사용
- **토큰 관리**: `TokenUtils` 유틸리티 사용
- **중복 로그인 감지**: `DuplicateLoginManager` 사용

## 🌐 API 통신

- **API Client**: `src/shared/lib/apiClient.ts`
- **API 엔드포인트**: `src/shared/config/api.ts`
- **에러 처리**: `ConfirmDialog` 컴포넌트 사용

## 📦 빌드 설정

- **Static Export**: `output: 'export'` 모드
- **이미지 최적화**: 비활성화 (`unoptimized: true`)
- **React Strict Mode**: 활성화

## 📄 라이선스

Private
