import "@/styles/userWeb/portalIndex2LoginModal.css";
import "@/styles/userWeb/portalIndex2.css";
import "@/styles/userWeb/portalGunsanMain.css";

export default function UserWebPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * portalGunsanMain.css의 .header·.eduListWrap 등이 메인(/userWeb/main)까지 남아
   * header.css를 덮어쓰지 않도록 전역 셀렉터를 이 래퍼 아래로 한정한다.
   */
  return <div className="portalGunsanShell">{children}</div>;
}

