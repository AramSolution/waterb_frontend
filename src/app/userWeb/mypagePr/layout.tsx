import "@/styles/userWeb/header.css";
import "@/styles/userWeb/main.css";
import "@/styles/userWeb/biz_pr.css";
import "@/styles/userWeb/mypage_pr.css";
import "@/styles/userWeb/join_ac.css";

export default function MypagePrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mypagePrWrap">{children}</div>;
}
