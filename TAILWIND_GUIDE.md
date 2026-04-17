# Tailwind CSS 가이드 (CSS 비교)

이 문서는 CSS와 Tailwind CSS를 비교하여 쉽게 이해할 수 있도록 정리한 가이드입니다.

## 📚 목차

1. [텍스트 크기](#1-텍스트-크기-font-size)
2. [폰트 굵기](#2-폰트-굵기-font-weight)
3. [색상](#3-색상-color)
4. [여백](#4-여백-margin--padding)
5. [너비 & 높이](#5-너비--높이-width--height)
6. [위치 & 정렬](#6-위치--정렬-position--alignment)
7. [테두리](#7-테두리-border)
8. [그림자](#8-그림자-shadow)
9. [반응형](#9-반응형-responsive)
10. [자주 사용하는 조합](#10-자주-사용하는-조합-예시)

---

## 1. 텍스트 크기 (Font Size)

### CSS
```css
font-size: 12px;  /* 작은 텍스트 */
font-size: 14px;  /* 기본 텍스트 */
font-size: 16px;  /* 중간 텍스트 */
font-size: 20px;  /* 큰 텍스트 */
font-size: 24px;  /* 매우 큰 텍스트 */
```

### Tailwind
```tsx
className="text-xs"    // 12px
className="text-sm"    // 14px
className="text-base"  // 16px (기본값)
className="text-lg"    // 18px
className="text-xl"    // 20px
className="text-2xl"   // 24px
className="text-3xl"   // 30px
className="text-4xl"   // 36px
```

### 임의 값 사용
```tsx
className="text-[15px]"    // 정확히 15px
className="text-[18px]"    // 정확히 18px
```

**크기 비교표:**
| Tailwind | 크기 | 용도 |
|----------|------|------|
| `text-xs` | 12px | 작은 설명 텍스트 |
| `text-sm` | 14px | 보조 텍스트 |
| `text-base` | 16px | 기본 본문 텍스트 |
| `text-lg` | 18px | 부제목 |
| `text-xl` | 20px | 중간 제목 |
| `text-2xl` | 24px | 큰 제목 |
| `text-3xl` | 30px | 섹션 제목 |
| `text-4xl` | 36px | 메인 제목 |

---

## 2. 폰트 굵기 (Font Weight)

### CSS
```css
font-weight: 300;  /* 얇음 */
font-weight: 400;  /* 보통 (기본) */
font-weight: 500;  /* 중간 */
font-weight: 600;  /* 세미볼드 */
font-weight: 700;  /* 볼드 */
font-weight: 800;  /* 엑스트라볼드 */
font-weight: 900;  /* 블랙 */
```

### Tailwind
```tsx
className="font-thin"     // 100
className="font-light"    // 300
className="font-normal"   // 400 (기본)
className="font-medium"   // 500
className="font-semibold" // 600
className="font-bold"     // 700
className="font-extrabold"// 800
className="font-black"    // 900
```

**용도:**
- `font-normal`: 기본 본문 텍스트
- `font-medium`: 강조할 텍스트
- `font-semibold`: 제목
- `font-bold`: 중요한 제목
- `font-extrabold`: 메인 제목

---

## 3. 색상 (Color)

### CSS
```css
color: #333333;
color: #ff0000;
color: rgb(59, 130, 246);
background-color: #ffffff;
border-color: #cccccc;
```

### Tailwind

#### 텍스트 색상
```tsx
className="text-gray-900"    // #111827 (거의 검정)
className="text-gray-700"    // #374151 (짙은 회색)
className="text-gray-500"    // #6b7280 (중간 회색)
className="text-gray-300"    // #d1d5db (연한 회색)
className="text-red-600"     // #dc2626 (빨강)
className="text-blue-600"    // #2563eb (파랑)
className="text-green-600"   // #16a34a (초록)
className="text-white"       // 흰색
className="text-black"       // 검정
```

#### 배경 색상
```tsx
className="bg-white"         // 배경: 흰색
className="bg-gray-100"      // 배경: 연한 회색
className="bg-blue-600"      // 배경: 파랑
className="bg-[#D63A3A]"     // 배경: 임의 색상
```

#### 테두리 색상
```tsx
className="border-gray-300"  // 테두리: 회색
className="border-red-500"   // 테두리: 빨강
```

**색상 숫자 규칙:**
- `100-900`: 숫자가 클수록 더 진한 색
- `50`: 가장 연한 색
- `900`: 가장 진한 색
- 예: `gray-100` < `gray-500` < `gray-900`

**임의 값 사용:**
```tsx
className="text-[#333333]"    // 정확한 색상 지정
className="bg-[rgb(59,130,246)]" // RGB 값
```

---

## 4. 여백 (Margin & Padding)

### CSS
```css
margin: 10px;
margin-top: 20px;
margin-bottom: 30px;
padding: 15px;
padding-left: 20px;
padding-right: 25px;
```

### Tailwind

#### Margin (외부 여백)
```tsx
className="m-4"        // margin: 16px (모든 방향)
className="mx-4"       // margin-left: 16px, margin-right: 16px
className="my-4"       // margin-top: 16px, margin-bottom: 16px
className="mt-4"       // margin-top: 16px
className="mb-4"       // margin-bottom: 16px
className="ml-4"       // margin-left: 16px
className="mr-4"       // margin-right: 16px
```

#### Padding (내부 여백)
```tsx
className="p-4"        // padding: 16px (모든 방향)
className="px-4"       // padding-left: 16px, padding-right: 16px
className="py-4"       // padding-top: 16px, padding-bottom: 16px
className="pt-4"       // padding-top: 16px
className="pb-4"       // padding-bottom: 16px
className="pl-4"       // padding-left: 16px
className="pr-4"       // padding-right: 16px
```

**크기 단위 (4px 단위):**
| Tailwind | 크기 | Tailwind | 크기 |
|----------|------|----------|------|
| `m-1` | 4px | `m-10` | 40px |
| `m-2` | 8px | `m-12` | 48px |
| `m-3` | 12px | `m-16` | 64px |
| `m-4` | 16px | `m-20` | 80px |
| `m-6` | 24px | `m-24` | 96px |
| `m-8` | 32px | `m-32` | 128px |

**임의 값:**
```tsx
className="p-[60px]"           // padding: 60px
className="p-[45px_20px_35px]" // padding: 45px 20px 35px (상 좌우 하)
className="mt-[30px]"          // margin-top: 30px
```

**방향 약어:**
- `t` = top (위)
- `b` = bottom (아래)
- `l` = left (왼쪽)
- `r` = right (오른쪽)
- `x` = left + right (좌우)
- `y` = top + bottom (상하)

---

## 5. 너비 & 높이 (Width & Height)

### CSS
```css
width: 100%;
width: 50%;
width: 200px;
height: 100px;
max-width: 480px;
min-height: 200px;
```

### Tailwind

#### 너비
```tsx
className="w-full"        // width: 100%
className="w-1/2"         // width: 50%
className="w-1/3"         // width: 33.333%
className="w-1/4"         // width: 25%
className="w-[200px]"     // width: 200px (임의 값)
className="max-w-[480px]" // max-width: 480px
className="min-w-[300px]" // min-width: 300px
```

#### 높이
```tsx
className="h-full"        // height: 100%
className="h-screen"      // height: 100vh (뷰포트 높이)
className="h-[100px]"     // height: 100px
className="min-h-[200px]" // min-height: 200px
className="max-h-[90vh]"  // max-height: 90vh
```

**비율 사용:**
```tsx
className="w-1/2"   // 50%
className="w-1/3"   // 33.333%
className="w-2/3"   // 66.666%
className="w-1/4"   // 25%
className="w-3/4"   // 75%
className="w-full"  // 100%
```

---

## 6. 위치 & 정렬 (Position & Alignment)

### CSS
```css
position: relative;
position: absolute;
position: fixed;
top: 0;
right: 0;
left: 50%;
text-align: center;
display: flex;
align-items: center;
justify-content: center;
```

### Tailwind

#### Position
```tsx
className="relative"  // position: relative
className="absolute"  // position: absolute
className="fixed"     // position: fixed
className="sticky"    // position: sticky
className="top-0"     // top: 0
className="right-0"   // right: 0
className="left-1/2"  // left: 50%
className="inset-0"   // top: 0, right: 0, bottom: 0, left: 0
```

#### Text Align
```tsx
className="text-left"   // text-align: left
className="text-center" // text-align: center
className="text-right"  // text-align: right
className="text-justify"// text-align: justify
```

#### Flex
```tsx
className="flex"                    // display: flex
className="flex-col"                // flex-direction: column
className="flex-row"                // flex-direction: row
className="items-center"            // align-items: center
className="items-start"             // align-items: flex-start
className="items-end"               // align-items: flex-end
className="justify-center"          // justify-content: center
className="justify-between"         // justify-content: space-between
className="justify-around"          // justify-content: space-around
className="justify-start"           // justify-content: flex-start
className="justify-end"             // justify-content: flex-end
className="gap-4"                   // gap: 16px
```

#### Grid
```tsx
className="grid"                    // display: grid
className="grid-cols-2"             // grid-template-columns: repeat(2, minmax(0, 1fr))
className="grid-cols-3"             // 3열 그리드
className="grid-cols-4"             // 4열 그리드
className="gap-4"                   // gap: 16px
```

---

## 7. 테두리 (Border)

### CSS
```css
border: 1px solid #ccc;
border-radius: 8px;
border-top: 2px solid #000;
```

### Tailwind
```tsx
className="border"              // border: 1px solid
className="border-2"            // border: 2px solid
className="border-4"            // border: 4px solid
className="border-gray-300"     // border-color: #d1d5db
className="border-t"            // border-top: 1px solid
className="border-b"            // border-bottom: 1px solid
className="border-l"            // border-left: 1px solid
className="border-r"            // border-right: 1px solid
className="rounded"             // border-radius: 4px
className="rounded-sm"          // border-radius: 2px
className="rounded-md"          // border-radius: 6px
className="rounded-lg"          // border-radius: 8px
className="rounded-xl"          // border-radius: 12px
className="rounded-2xl"         // border-radius: 16px
className="rounded-full"        // border-radius: 9999px (원)
className="rounded-[16px]"      // border-radius: 16px (임의 값)
className="rounded-none"        // border-radius: 0
```

**둥글기 크기:**
| Tailwind | 크기 | 용도 |
|----------|------|------|
| `rounded-sm` | 2px | 작은 둥글기 |
| `rounded` | 4px | 기본 둥글기 |
| `rounded-md` | 6px | 중간 둥글기 |
| `rounded-lg` | 8px | 큰 둥글기 |
| `rounded-xl` | 12px | 매우 큰 둥글기 |
| `rounded-full` | 완전히 둥글게 | 원형 버튼 |

---

## 8. 그림자 (Shadow)

### CSS
```css
box-shadow: 0 1px 3px rgba(0,0,0,0.1);
box-shadow: 0 15px 40px rgba(0,0,0,0.2);
```

### Tailwind
```tsx
className="shadow-sm"   // 작은 그림자
className="shadow"      // 기본 그림자
className="shadow-md"   // 중간 그림자
className="shadow-lg"   // 큰 그림자
className="shadow-xl"   // 매우 큰 그림자
className="shadow-2xl"  // 엄청 큰 그림자
className="shadow-none" // 그림자 없음
className="shadow-[0_15px_40px_rgba(0,0,0,0.2)]"  // 임의 값
```

---

## 9. 반응형 (Responsive)

### CSS
```css
@media (min-width: 768px) {
  font-size: 20px;
}
```

### Tailwind

#### 기본 문법
```tsx
// 모바일 기본, 데스크톱에서 변경
className="text-base md:text-lg"     // 모바일: 16px, 768px 이상: 18px
className="text-sm md:text-base"     // 모바일: 14px, 768px 이상: 16px
className="p-4 md:p-8"               // 모바일: padding 16px, 데스크톱: 32px
className="hidden md:block"          // 모바일: 숨김, 데스크톱: 표시
className="block md:hidden"          // 모바일: 표시, 데스크톱: 숨김
```

#### 브레이크포인트
| 접두사 | 크기 | 설명 |
|--------|------|------|
| (기본) | 모바일 | 모든 화면 크기 |
| `sm:` | 640px 이상 | 작은 태블릿 |
| `md:` | 768px 이상 | 태블릿 |
| `lg:` | 1024px 이상 | 데스크톱 |
| `xl:` | 1280px 이상 | 큰 데스크톱 |
| `2xl:` | 1536px 이상 | 매우 큰 데스크톱 |

#### 반응형 예시
```tsx
// 텍스트 크기
className="text-sm md:text-base lg:text-lg"

// 여백
className="p-4 md:p-6 lg:p-8"

// 그리드
className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"

// 표시/숨김
className="hidden md:block"  // 모바일: 숨김, 태블릿 이상: 표시
className="block md:hidden"  // 모바일: 표시, 태블릿 이상: 숨김
```

**중요:** 클래스 순서는 중요하지 않지만, 가독성을 위해 작은 화면 → 큰 화면 순서로 작성하는 것을 권장합니다.

**주의:** `md:`는 Markdown 파일(.md)과는 전혀 다른 개념입니다. Tailwind CSS의 반응형 브레이크포인트입니다!

---

## 10. 자주 사용하는 조합 예시

### 버튼
```tsx
// 기본 버튼
className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"

// 보조 버튼
className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
```

### 카드
```tsx
className="bg-white rounded-[20px] p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow"
```

### 제목
```tsx
// 큰 제목
className="text-2xl font-bold text-gray-900 mb-4"

// 작은 제목
className="text-lg font-semibold text-gray-700 mb-2"
```

### 입력 필드
```tsx
className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
```

### 컨테이너
```tsx
className="max-w-[1400px] mx-auto px-4"
```

### Flex 레이아웃
```tsx
className="flex items-center justify-between gap-4"
```

### Grid 레이아웃
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
```

---

## 💡 유용한 팁

### 1. 여러 클래스 결합
```tsx
className="text-lg font-bold text-gray-900 mb-4 px-6 py-3 bg-blue-600 rounded-lg"
// 띄어쓰기로 여러 클래스 연결 가능
```

### 2. 임의 값 사용
```tsx
className="text-[15px]"      // 정확한 크기
className="w-[200px]"        // 정확한 너비
className="bg-[#D63A3A]"     // 정확한 색상
className="p-[45px_20px_35px]" // 여러 값 지정
```

### 3. 상태 클래스
```tsx
className="hover:bg-blue-700"      // 마우스 호버 시
className="focus:border-blue-500"  // 포커스 시
className="active:scale-95"        // 클릭 시
className="disabled:opacity-50"    // 비활성화 시
```

### 4. 조건부 클래스 (주의!)
```tsx
// ❌ 작동 안 함 (동적으로 생성되는 클래스는 Tailwind가 인식 못함)
className={`bg-${isActive ? 'blue' : 'gray'}-600`}

// ✅ 올바른 방법
className={isActive ? 'bg-blue-600' : 'bg-gray-600'}

// ✅ 또는 전체 클래스를 조건부로
className={`px-4 py-2 ${isActive ? 'bg-blue-600' : 'bg-gray-600'}`}
```

### 5. 클래스 그룹화 (가독성)
```tsx
// 읽기 어려움
className="text-lg font-bold text-gray-900 mb-4 px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700"

// 읽기 쉬움 (의미별로 그룹화)
className={`
  text-lg font-bold text-gray-900 mb-4
  px-6 py-3 bg-blue-600 rounded-lg
  hover:bg-blue-700
`}
```

### 6. !important 사용
```tsx
className="!text-2xl"    // text-size: 24px !important
className="!bg-red-600"  // background-color: #dc2626 !important
// 다른 CSS를 오버라이드할 때 사용
```

---

## 🎯 빠른 참조표

### 가장 자주 사용하는 클래스

| CSS | Tailwind |
|-----|----------|
| `font-size: 16px` | `text-base` |
| `font-weight: 700` | `font-bold` |
| `color: #333` | `text-gray-700` |
| `background: #fff` | `bg-white` |
| `padding: 16px` | `p-4` |
| `margin: 16px` | `m-4` |
| `width: 100%` | `w-full` |
| `border-radius: 8px` | `rounded-lg` |
| `display: flex` | `flex` |
| `text-align: center` | `text-center` |
| `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` | `shadow-md` |
| `position: absolute` | `absolute` |
| `z-index: 10` | `z-10` |

---

## 🔍 디버깅 팁

### Tailwind 클래스가 적용되지 않을 때

1. **클래스가 실제로 사용되고 있는지 확인**
   - Tailwind는 사용되지 않는 클래스를 제거합니다 (purge)
   - `tailwind.config.js`의 `content` 배열에 해당 파일 경로가 포함되어 있는지 확인

2. **임의 값 문법 확인**
   - `className="text-[15px]"` ✅
   - `className="text-15px"` ❌ (작동 안 함)

3. **반응형 클래스 순서**
   - 순서는 중요하지 않지만, 작은 화면 → 큰 화면 순서 권장

4. **다른 CSS와 충돌**
   - `!important` 사용: `className="!text-2xl"`

5. **개발 서버 재시작**
   - `tailwind.config.js` 수정 후에는 재시작 필요

---

## 📚 추가 학습 자료

- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [Tailwind CSS Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet)
- [Tailwind Playground](https://play.tailwindcss.com/) (온라인 에디터)

---

**작성일:** 2025-01-19  
**버전:** 1.0  
**프로젝트:** waterb_frontend
