import { Suspense } from "react";
import "@/styles/userWeb/default.css";
import "@/styles/userWeb/fonts.css";
/** 포털→메인 클라이언트 이동 시에도 메인 헤더(로고·메뉴 점) 기준 스타일이 항상 로드되도록 */
import "@/styles/userWeb/header.css";
import { UserWebAuthProvider } from "@/features/userWeb/auth/context/UserWebAuthContext";

export default function UserWebLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserWebAuthProvider>
      {/* useSearchParams()를 사용하는 하위 컴포넌트들을 위한 전역 Suspense 경계 */}
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </UserWebAuthProvider>
  );
}
