import "@/styles/userWeb/header.css";
import "@/styles/userWeb/main.css";
import "@/styles/userWeb/biz_pr.css";
import "@/styles/userWeb/mypage_pr.css";
import "@/styles/userWeb/work_mt.css";

/**
 * 멘토업무 (work_mt.html) 전용 레이아웃
 * 원본 HTML: default, biz_pr, mypage_pr, work_mt.css 로드
 */
export default function MentorWorkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
