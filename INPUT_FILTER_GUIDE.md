# 입력 필터링 가이드

입력 필드에서 특정 문자를 제한하는 방법을 제공합니다.

## 방법 1: CSS 클래스 + useNoKorean 훅 사용 (가장 권장)

가장 효과적인 방법으로 CSS 클래스와 React 훅을 함께 사용합니다.

### Import

```tsx
import { useNoKorean } from '@/hooks/useNoKorean';
import { removeKorean } from '@/utils/inputValidation';
```

### 예시 (로그인 페이지)

```tsx
export default function LoginPage() {
  const [formData, setFormData] = useState({ id: '', password: '' });

  // no-korean 클래스를 가진 모든 input에 한글 입력 방지 자동 적용
  useNoKorean();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // 추가 필터링 (이중 보안)
    if (name === 'id') {
      const filteredValue = removeKorean(value);
      setFormData(prev => ({ ...prev, [name]: filteredValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <input
      type="text"
      name="id"
      className="no-korean w-full px-4 py-3 border"
      value={formData.id}
      onChange={handleChange}
      placeholder="아이디를 입력하세요"
    />
  );
}
```

### 동작 방식

1. **CSS `ime-mode`**: IME(한글 입력기) 비활성화 시도
2. **JavaScript Composition Events**: 한글 입력 감지 시 즉시 포커스 해제 후 재설정하여 영문으로 전환
3. **Input Event**: 입력된 한글을 실시간으로 제거
4. **removeKorean()**: React 상태에서도 한글 필터링 (이중 보안)

**장점:**
- 한글 입력 시도 시 자동으로 영문 자판으로 전환됨
- 모든 브라우저에서 동작 (Chrome, Firefox, Safari, Edge)
- 한글이 입력되어도 즉시 제거됨

---

## 방법 2: 특정 input에만 적용 (useNoKorean with ref)

특정 input 요소에만 한글 입력 방지를 적용하고 싶을 때 사용합니다.

### 예시

```tsx
import { useRef } from 'react';
import { useNoKorean } from '@/hooks/useNoKorean';

export default function MyComponent() {
  const idInputRef = useRef<HTMLInputElement>(null);

  // 특정 input에만 적용
  useNoKorean(idInputRef);

  return (
    <input
      ref={idInputRef}
      type="text"
      name="id"
      placeholder="아이디를 입력하세요"
    />
  );
}
```

---

## 방법 3: 유틸리티 함수만 사용

단순히 입력값만 필터링하고 싶을 때 사용합니다 (자판 전환 없음).

### Import

```tsx
import { removeKorean, alphanumericOnly, numericOnly, alphabetOnly } from '@/utils/inputValidation';
```

### 사용 가능한 함수

- `removeKorean(value)` - 한글 제거 (영문, 숫자, 특수문자만 허용)
- `alphanumericOnly(value)` - 영문과 숫자만 허용
- `numericOnly(value)` - 숫자만 허용
- `alphabetOnly(value)` - 영문만 허용

### 예시

```tsx
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  if (name === 'id') {
    const filteredValue = removeKorean(value);
    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }));
  } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }
};
```

---

## 방법 4: useInputFilter 훅 사용

여러 타입의 필터를 동적으로 적용할 때 사용합니다.

### Import

```tsx
import { useInputFilter } from '@/hooks/useInputFilter';
```

### 사용 가능한 필터 타입

- `'no-korean'` - 한글 제거
- `'alphanumeric'` - 영문과 숫자만
- `'numeric'` - 숫자만
- `'alphabet'` - 영문만
- `'none'` - 필터링 없음 (기본값)

### 예시

```tsx
const { filterValue } = useInputFilter('no-korean');

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;

  setFormData(prev => ({
    ...prev,
    [name]: filterValue(value)
  }));
};
```

**주의:** 이 방법은 입력값만 필터링하며, 자판을 영문으로 전환하지는 않습니다.

---

## 추가 검증 함수

`@/utils/inputValidation`에는 다음 검증 함수도 포함되어 있습니다:

### 이메일 검증

```tsx
import { isValidEmail } from '@/utils/inputValidation';

if (!isValidEmail(email)) {
  setError('올바른 이메일 형식이 아닙니다.');
}
```

### 전화번호 검증 (한국)

```tsx
import { isValidPhone } from '@/utils/inputValidation';

if (!isValidPhone(phone)) {
  setError('올바른 전화번호 형식이 아닙니다.');
}
```

### 비밀번호 강도 검증

```tsx
import { isStrongPassword } from '@/utils/inputValidation';

if (!isStrongPassword(password)) {
  setError('비밀번호는 최소 8자, 영문, 숫자, 특수문자를 포함해야 합니다.');
}
```

---

---

## 비교표

| 방법 | 자판 전환 | 한글 제거 | 브라우저 호환성 | 사용 난이도 |
|------|----------|----------|---------------|-----------|
| 방법 1 (useNoKorean + CSS) | ✅ | ✅ | ⭐⭐⭐⭐⭐ | 쉬움 |
| 방법 2 (ref 사용) | ✅ | ✅ | ⭐⭐⭐⭐⭐ | 보통 |
| 방법 3 (유틸리티 함수) | ❌ | ✅ | ⭐⭐⭐⭐⭐ | 쉬움 |
| 방법 4 (useInputFilter) | ❌ | ✅ | ⭐⭐⭐⭐⭐ | 쉬움 |

**권장:** 방법 1 (useNoKorean 훅 + no-korean 클래스 + removeKorean 함수)

---

## 파일 위치

- **CSS 클래스:** `src/styles/admin/globals.css`
- **한글 입력 방지 훅:** `src/hooks/useNoKorean.ts`
- **유틸리티 함수:** `src/utils/inputValidation.ts`
- **입력 필터 훅:** `src/hooks/useInputFilter.ts`
- **입력 헬퍼:** `src/utils/inputHelper.ts`
- **사용 예시:** `src/app/admin/login/page.tsx`
