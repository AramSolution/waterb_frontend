# 📚 초보자를 위한 React + Next.js + FSD 개발 가이드

## 목차

1. [기본 개념 이해](#1-기본-개념-이해)
2. [개발 순서 (관리자회원 예시)](#2-개발-순서-관리자회원-예시)
3. [개발 체크리스트](#3-개발-체크리스트)
4. [자주 사용하는 패턴](#4-자주-사용하는-패턴)
5. [개발 순서 요약](#5-개발-순서-요약)
6. [실전 예시: 회원 상세 화면 만들기](#6-실전-예시-회원-상세-화면-만들기)
7. [주의사항](#7-주의사항)
8. [FAQ](#8-faq)

---

## 1️⃣ 기본 개념 이해

### React란?

- **컴포넌트 기반 UI 라이브러리**
- 화면의 일부를 재사용 가능한 컴포넌트로 구성
- 예: 버튼, 입력창, 카드 등을 각각 컴포넌트로 만들어서 조합

### Next.js란?

- **React 기반 프레임워크**
- 페이지 라우팅, 서버 사이드 렌더링 등을 자동으로 처리
- `app` 폴더 구조를 사용해서 페이지를 구성

### FSD (Feature-Sliced Design)란?

- **폴더 구조 설계 방법론**
- 계층별로 역할을 명확히 분리
- 코드를 체계적으로 관리

```
src/
├── app/          # 라우팅만 (URL과 페이지 연결)
├── widgets/      # 복합 컴포넌트 (레이아웃 등)
├── features/     # 기능 단위 (회원 목록, 회원 등록 등)
├── entities/     # 비즈니스 엔티티 (회원, 게시판 등)
└── shared/       # 공통 자원 (버튼, API 클라이언트 등)
```

**각 폴더의 역할:**

- `app/`: URL 경로와 페이지를 연결 (라우팅만)
- `widgets/`: 여러 컴포넌트를 조합한 큰 단위 (예: AdminLayout)
- `features/`: 실제 기능 단위 (예: 회원 목록 조회, 회원 등록)
- `entities/`: 비즈니스 데이터와 API (예: 회원 데이터, 회원 API)
- `shared/`: 모든 곳에서 사용하는 공통 코드

---

## 2️⃣ 개발 순서 (관리자회원 예시)

### 📍 단계 1: API 정의 (entities)

먼저 백엔드 API 구조를 정의합니다.

**위치**: `src/entities/admin/member/api/memberApi.ts`

```typescript
// 1. 타입 정의 (데이터 구조)
export interface AdminMember {
  esntlId: string; // 관리자 코드
  userId: string; // 아이디
  userNm: string; // 관리자명
  emailAdres: string; // 이메일
  // ... 기타 필드
}

// 2. API 요청 파라미터 타입
export interface AdminMemberListParams {
  searchCondition: string;
  searchKeyword: string;
  page: number;
  // ...
}

// 3. API 응답 타입
export interface AdminMemberListResponse {
  content: AdminMember[];
  totalElements: number;
  totalPages: number;
  // ...
}

// 4. API 서비스 클래스
export class MemberService {
  // 목록 조회
  static async getAdminMembers(
    params: AdminMemberListParams
  ): Promise<AdminMemberListResponse> {
    const response = await apiClient.post<AdminMemberListResponse>(
      API_ENDPOINTS.MEMBER.LIST,
      params
    );
    return response;
  }

  // 등록
  static async registerAdminMember(
    params: AdminMemberRegisterParams
  ): Promise<AdminMemberRegisterResponse> {
    const response = await apiClient.post<AdminMemberRegisterResponse>(
      API_ENDPOINTS.MEMBER.REGISTER,
      params
    );
    return response;
  }
}
```

**왜 여기서?**

- 여러 곳에서 사용할 데이터 구조와 API를 먼저 정의
- 타입 안정성을 확보
- API 스펙을 한 곳에서 관리

---

### 📍 단계 2: API 엔드포인트 추가

**위치**: `src/shared/config/api.ts`

```typescript
export const API_ENDPOINTS = {
  MEMBER: {
    LIST: "/api/admin/member/list.Ajax",
    REGISTER: "/api/admin/member/register.Ajax",
    DETAIL: "/api/admin/member/detail.Ajax",
    UPDATE: "/api/admin/member/update.Ajax",
    DELETE: "/api/admin/member/delete.Ajax",
  },
};
```

---

### 📍 단계 3: 커스텀 Hook 작성 (features/model)

상태 관리와 비즈니스 로직을 담당하는 Hook을 만듭니다.

**위치**: `src/features/adminWeb/member/list/model/useMemberList.ts`

```typescript
export function useMemberList() {
  // 1. 상태 정의 (화면에 필요한 데이터)
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // 2. 데이터 조회 함수
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await MemberService.getAdminMemberList({
        searchCondition: "1",
        searchKeyword: "",
        page: currentPage,
      });

      setMembers(response.content);
    } catch (err) {
      setError("목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 3. 초기 로드 (화면이 열릴 때)
  useEffect(() => {
    fetchMembers();
  }, [currentPage]);

  // 4. 삭제 함수
  const handleDelete = async (esntlId: string) => {
    try {
      await MemberService.deleteAdminMember({ esntlId });
      fetchMembers(); // 삭제 후 목록 다시 조회
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    }
  };

  // 5. 반환 (UI에서 사용할 것들)
  return {
    members,
    loading,
    error,
    currentPage,
    setCurrentPage,
    handleDelete,
  };
}
```

**왜 이렇게?**

- UI와 로직을 분리
- 다른 화면에서도 재사용 가능
- 테스트하기 쉬움

**핵심 개념:**

- `useState`: 상태를 저장 (데이터, 로딩 상태 등)
- `useEffect`: 특정 시점에 실행 (화면 열릴 때, 값 변경될 때)
- `async/await`: 비동기 작업 처리 (API 호출)

---

### 📍 단계 4: UI 컴포넌트 작성 (features/ui)

화면을 표시하는 컴포넌트를 만듭니다.

**위치**: `src/features/adminWeb/member/list/ui/MemberListPageView.tsx`

```typescript
export const MemberListPageView: React.FC = () => {
  // 커스텀 Hook 사용
  const { members, loading, error, currentPage, setCurrentPage, handleDelete } =
    useMemberList();

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="page-header">
        <h1>관리자회원목록</h1>
      </div>

      {/* 에러 메시지 */}
      {error && <div className="text-red-600">{error}</div>}

      {/* 로딩 상태 */}
      {loading ? (
        <div>로딩 중...</div>
      ) : (
        /* 목록 테이블 */
        <table>
          <thead>
            <tr>
              <th>아이디</th>
              <th>관리자명</th>
              <th>이메일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.esntlId}>
                <td>{member.userId}</td>
                <td>{member.userNm}</td>
                <td>{member.emailAdres}</td>
                <td>
                  <button onClick={() => handleDelete(member.esntlId)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 페이징 */}
      <div>
        <button onClick={() => setCurrentPage(currentPage - 1)}>이전</button>
        <span>{currentPage}</span>
        <button onClick={() => setCurrentPage(currentPage + 1)}>다음</button>
      </div>
    </div>
  );
};
```

**핵심 개념:**

- `members.map()`: 배열을 순회하면서 각 항목을 화면에 표시
- `{loading ? A : B}`: 조건부 렌더링 (로딩 중이면 A, 아니면 B)
- `onClick`: 버튼 클릭 이벤트 처리

---

### 📍 단계 5: 페이지 라우팅 (app)

URL과 컴포넌트를 연결합니다.

**위치**: `src/app/adminWeb/member/list/page.tsx`

```typescript
"use client"; // 클라이언트 컴포넌트 (필요한 경우)

import { AdminLayout } from "@/widgets/admin/layout";
import { MemberListPageView } from "@/features/adminWeb/member/list/ui";

export default function MemberListPage() {
  return (
    <AdminLayout>
      <MemberListPageView />
    </AdminLayout>
  );
}
```

**왜 이렇게 간단?**

- `app` 폴더는 라우팅만 담당
- UI는 `features`로 분리
- `/adminWeb/member/list` 경로가 이 페이지로 자동 연결됨

---

### 📍 단계 6: 등록 화면 예시

#### 1. Hook 작성 (`features/register/model/useMemberRegister.ts`)

```typescript
export function useMemberRegister() {
  const [formData, setFormData] = useState({
    userId: "",
    userNm: "",
    emailAdres: "",
    // ... 기타 필드
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // 입력값 변경
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 에러 초기화
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // 유효성 검사
  const validateForm = (): boolean => {
    const newErrors = {};
    let isValid = true;

    if (!formData.userId.trim()) {
      newErrors.userId = "아이디를 입력해주세요.";
      isValid = false;
    }

    if (!formData.userNm.trim()) {
      newErrors.userNm = "회원명을 입력해주세요.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // 등록
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await MemberService.registerAdminMember(formData);
      // 성공 처리
    } catch (err) {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    errors,
    loading,
    handleInputChange,
    handleSubmit,
  };
}
```

#### 2. UI 컴포넌트 (`features/register/ui/MemberRegisterForm.tsx`)

```typescript
export const MemberRegisterForm: React.FC = () => {
  const { formData, errors, loading, handleInputChange, handleSubmit } =
    useMemberRegister();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {/* 아이디 입력 */}
      <div>
        <label>아이디 *</label>
        <input
          type="text"
          name="userId"
          value={formData.userId}
          onChange={handleInputChange}
          className={errors.userId ? "border-red-500" : ""}
        />
        {errors.userId && <div className="text-red-600">{errors.userId}</div>}
      </div>

      {/* 회원명 입력 */}
      <div>
        <label>회원명 *</label>
        <input
          type="text"
          name="userNm"
          value={formData.userNm}
          onChange={handleInputChange}
          className={errors.userNm ? "border-red-500" : ""}
        />
        {errors.userNm && <div className="text-red-600">{errors.userNm}</div>}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "등록 중..." : "등록"}
      </button>
    </form>
  );
};
```

#### 3. 페이지 (`app/adminWeb/member/register/page.tsx`)

```typescript
import { AdminLayout } from "@/widgets/admin/layout";
import { MemberRegisterForm } from "@/features/adminWeb/member/register/ui";

export default function MemberRegisterPage() {
  return (
    <AdminLayout>
      <MemberRegisterForm />
    </AdminLayout>
  );
}
```

---

## 3️⃣ 개발 체크리스트

새로운 기능을 만들 때 다음 순서로 체크하세요:

### 1. API 정의 (entities)

- [ ] 타입 정의 (인터페이스)
- [ ] API 서비스 메서드 작성
- [ ] API 엔드포인트 추가

### 2. Hook 작성 (features/model)

- [ ] 상태 정의 (`useState`)
- [ ] 데이터 조회 함수
- [ ] 초기 로드 (`useEffect`)
- [ ] 이벤트 핸들러 함수
- [ ] 반환값 정의

### 3. UI 컴포넌트 (features/ui)

- [ ] Hook 사용
- [ ] 화면 레이아웃 작성
- [ ] 폼 입력 처리
- [ ] 에러/로딩 상태 표시

### 4. 페이지 라우팅 (app)

- [ ] 페이지 컴포넌트 작성
- [ ] Layout 적용
- [ ] Feature 컴포넌트 연결

### 5. 네비게이션

- [ ] 목록 → 등록 이동
- [ ] 목록 → 상세 이동
- [ ] 등록 → 목록 이동

---

## 4️⃣ 자주 사용하는 패턴

### 패턴 1: 목록 조회

```typescript
// Hook
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetch = async () => {
    setLoading(true);
    const response = await Service.getList();
    setItems(response.content);
    setLoading(false);
  };
  fetch();
}, []);

// UI
{
  loading ? <div>로딩...</div> : items.map((item) => <Item key={item.id} />);
}
```

### 패턴 2: 폼 처리

```typescript
// Hook
const [formData, setFormData] = useState({ name: "" });
const handleChange = (e) => {
  setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
};

// UI
<input name="name" value={formData.name} onChange={handleChange} />;
```

### 패턴 3: 유효성 검사

```typescript
const validate = () => {
  const errors = {};
  if (!formData.name) errors.name = "이름을 입력하세요";
  setErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### 패턴 4: 페이지 이동

```typescript
import { useRouter } from "next/navigation";

const router = useRouter();
router.push("/adminWeb/member/list"); // 이동
```

### 패턴 5: 쿼리 파라미터 읽기

```typescript
import { useSearchParams } from "next/navigation";

const searchParams = useSearchParams();
const id = searchParams.get("id"); // ?id=123에서 id 값 가져오기
```

---

## 5️⃣ 개발 순서 요약

```
1. API 정의 (entities)
   ↓
2. Hook 작성 (features/model) - 로직
   ↓
3. UI 작성 (features/ui) - 화면
   ↓
4. 페이지 연결 (app) - 라우팅
   ↓
5. 테스트 및 수정
```

**각 단계를 순서대로 진행하면 체계적으로 개발할 수 있습니다!**

---

## 6️⃣ 실전 예시: 회원 상세 화면 만들기

### Step 1: API 추가 (이미 정의되어 있다면 생략)

```typescript
// entities/admin/member/api/memberApi.ts
static async getAdminMemberDetail(esntlId: string) {
  return await apiClient.post(API_ENDPOINTS.MEMBER.DETAIL, { esntlId });
}
```

### Step 2: Hook 작성

```typescript
// features/member/detail/model/useMemberDetail.ts
export function useMemberDetail(esntlId: string) {
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const data = await MemberService.getAdminMemberDetail(esntlId);
      setMember(data);
      setLoading(false);
    };
    fetch();
  }, [esntlId]);

  return { member, loading };
}
```

### Step 3: UI 작성

```typescript
// features/member/detail/ui/MemberDetailView.tsx
export const MemberDetailView = ({ esntlId }) => {
  const { member, loading } = useMemberDetail(esntlId);

  if (loading) return <div>로딩 중...</div>;
  if (!member) return <div>데이터 없음</div>;

  return (
    <div>
      <h1>회원 상세</h1>
      <p>아이디: {member.userId}</p>
      <p>이름: {member.userNm}</p>
    </div>
  );
};
```

### Step 4: 페이지 연결

```typescript
// app/adminWeb/member/detail/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/widgets/admin/layout";
import { MemberDetailView } from "@/features/adminWeb/member/detail/ui";

function MemberDetailContent() {
  const searchParams = useSearchParams();
  const esntlId = searchParams.get("esntlId");

  return (
    <AdminLayout>
      <MemberDetailView esntlId={esntlId} />
    </AdminLayout>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <MemberDetailContent />
    </Suspense>
  );
}
```

---

## 7️⃣ 주의사항

### 1. FSD 계층 규칙

**절대 위반하지 마세요!**

- `app` → `features`, `widgets`만 import
- `features` → `entities`, `shared`만 import
- `entities` → `shared`만 import
- `shared` → 외부 라이브러리만 import

**올바른 예:**

```typescript
// app에서
import { MemberListPageView } from "@/features/adminWeb/member/list/ui"; ✅

// features에서
import { MemberService } from "@/entities/admin/member/api"; ✅
```

**잘못된 예:**

```typescript
// features에서 app을 import (절대 안됨!)
import { MemberListPage } from "@/app/adminWeb/member/list/page"; ❌

// entities에서 features를 import (절대 안됨!)
import { useMemberList } from "@/features/adminWeb/member/list/model"; ❌
```

### 2. app 폴더는 라우팅만

- UI 코드는 절대 작성하지 않음
- 레이아웃과 컴포넌트 연결만 담당
- 예외: Suspense 래핑 등 Next.js 필수 기능만

**올바른 예:**

```typescript
// app/adminWeb/member/list/page.tsx
export default function MemberListPage() {
  return (
    <AdminLayout>
      <MemberListPageView />
    </AdminLayout>
  );
}
```

**잘못된 예:**

```typescript
// app 폴더에 UI 코드 작성 (절대 안됨!)
export default function MemberListPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        {" "}
        {/* ❌ UI 코드 */}
        <h1>관리자회원목록</h1>
      </div>
      <table>
        {" "}
        {/* ❌ UI 코드 */}
        {/* ... */}
      </table>
    </AdminLayout>
  );
}
```

### 3. 재사용 가능한 것은 shared로

- 버튼, 다이얼로그 등 UI 컴포넌트
- API 클라이언트, 유틸리티 함수

### 4. 컴포넌트 이름 규칙

- 파일명: **PascalCase** (예: `MemberListPageView.tsx`)
- 함수명: **PascalCase** (예: `export const MemberListPageView`)
- 변수명: **camelCase** (예: `const memberList`)
- Hook명: **camelCase** + `use` 접두사 (예: `useMemberList`)

### 5. import 경로 규칙

- 항상 `@/` 절대 경로 사용
- 상대 경로(`../../`) 사용 금지

**올바른 예:**

```typescript
import { MemberService } from "@/entities/admin/member/api"; ✅
```

**잘못된 예:**

```typescript
import { MemberService } from "../../entities/admin/member/api"; ❌
```

### 6. TypeScript 타입 사용

- `any` 타입 사용 금지
- 모든 props, state에 타입 정의
- 인터페이스나 타입으로 명시적으로 정의

---

## 8️⃣ FAQ

### Q: Hook과 컴포넌트의 차이는?

**A:**

- **Hook** (`useXXX`): 로직과 상태 관리 (데이터 처리)
- **컴포넌트**: 화면 표시 (UI 렌더링)

### Q: 왜 Hook과 컴포넌트를 분리하나요?

**A:**

- 재사용성: 같은 로직을 다른 UI에서 사용 가능
- 테스트: 로직과 UI를 따로 테스트 가능
- 유지보수: 코드가 깔끔하고 이해하기 쉬움

### Q: useState와 useEffect는 언제 사용하나요?

**A:**

- `useState`: 값을 저장하고 변경할 때 (예: 폼 데이터, 로딩 상태)
- `useEffect`: 특정 시점에 작업을 수행할 때 (예: 화면 열릴 때 데이터 조회)

**useState 예시:**

```typescript
const [count, setCount] = useState(0); // 숫자 저장
const [name, setName] = useState(""); // 문자열 저장
const [loading, setLoading] = useState(false); // 불리언 저장
```

**useEffect 예시:**

```typescript
// 화면이 열릴 때 한 번만 실행
useEffect(() => {
  fetchData();
}, []);

// 특정 값이 변경될 때마다 실행
useEffect(() => {
  fetchData();
}, [currentPage]); // currentPage가 변경될 때마다 실행
```

### Q: async/await는 왜 사용하나요?

**A:** API 호출 같은 비동기 작업을 순차적으로 처리하기 위해 사용합니다.

**예시:**

```typescript
// async/await 사용 (권장)
const fetchData = async () => {
  try {
    const response = await MemberService.getList();
    setMembers(response.content);
  } catch (err) {
    console.error(err);
  }
};

// Promise.then 사용 (비권장)
const fetchData = () => {
  MemberService.getList()
    .then((response) => {
      setMembers(response.content);
    })
    .catch((err) => {
      console.error(err);
    });
};
```

### Q: 왜 "use client"를 사용하나요?

**A:** Next.js 13+ App Router에서는 기본적으로 서버 컴포넌트입니다. `useState`, `useEffect` 같은 클라이언트 기능을 사용하려면 `"use client"`를 맨 위에 선언해야 합니다.

### Q: 에러 처리는 어떻게 하나요?

**A:** try-catch 블록을 사용합니다.

```typescript
try {
  const response = await MemberService.getList();
  setMembers(response.content);
} catch (err) {
  if (err instanceof ApiError) {
    setError(err.message);
  } else {
    setError("알 수 없는 오류가 발생했습니다.");
  }
}
```

### Q: 로딩 상태는 왜 필요한가요?

**A:** 사용자에게 데이터를 불러오는 중임을 알려주고, 중복 요청을 방지합니다.

```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (loading) return; // 이미 처리 중이면 무시

  setLoading(true);
  try {
    await MemberService.register(formData);
  } finally {
    setLoading(false);
  }
};
```

---

## 9️⃣ 실전 팁

### 팁 1: 디버깅

```typescript
// console.log로 상태 확인
console.log("현재 상태:", formData);

// React DevTools 사용 (브라우저 확장 프로그램)
```

### 팁 2: 에러 방지

```typescript
// 옵셔널 체이닝 사용
const name = member?.userNm || "이름 없음";

// null 체크
if (!member) {
  return <div>데이터 없음</div>;
}
```

### 팁 3: 성능 최적화

```typescript
// 불필요한 리렌더링 방지
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);
```

### 팁 4: 코드 정리

- 하나의 파일에는 하나의 컴포넌트만
- 함수는 하나의 역할만 하도록
- 복잡한 로직은 별도 함수로 분리

---

## 🔟 참고 자료

- [React 공식 문서](https://react.dev/)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Feature-Sliced Design 가이드](https://feature-sliced.design/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)

---

**이 가이드를 따라하면 React, Next.js, FSD 구조로 체계적으로 개발할 수 있습니다!** 🚀

질문이 있으면 언제든지 물어보세요!
