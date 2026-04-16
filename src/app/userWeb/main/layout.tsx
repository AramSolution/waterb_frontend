import "@/styles/userWeb/main.css";
import "@/styles/userWeb/main_ac.css";
/** 로그인 모달(Context) 사용 → 라우트 전환 후 재오픈 시 동적 청크 CSS 미적용 방지 */
import "@/styles/userWeb/loginModal.css";

export default function MainPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
