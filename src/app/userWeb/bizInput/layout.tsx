import "@/styles/userWeb/header.css";
import "@/styles/userWeb/main.css";
import "@/styles/userWeb/biz.css";
/** 학부모(PNR) 로그인 시 data-theme="parent" → 라디오/체크 아이콘 보라색 */
import "@/styles/userWeb/biz_input_theme_pr.css";

export default function BizInputLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
