"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

function withThemeQuery(
  path: string,
  themeQuery: string,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams(
    themeQuery && themeQuery.length > 0 ? themeQuery : undefined,
  );
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      params.set(k, v);
    }
  }
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

export type CommunityChromeShell = "notice" | "community";

/** shell=&quot;community&quot;일 때 사이드 활성 항목 */
export type CommunityChromeActiveNav =
  | "notice"
  | "guide"
  | "eumArchive"
  | "project"
  | "inquiry"
  | "academy"
  /** `/userWeb/qna` 전용 — 사이드바「1:1 문의」가 커뮤니티 탭이 아닌 QnA 라우트로 링크 */
  | "qna";

export type CommunityBreadcrumbMode =
  | "default"
  | "generalArchive"
  | "eumArchive";

export interface NoticeCommunityChromeProps {
  /** `type=` 또는 `reqGbPosition=` (물음표 없음) */
  themeQuery: string;
  /** 공지 전용 라우트(`/userWeb/notice`) vs 커뮤니티 탭(`/userWeb/community?tab=`) */
  shell?: CommunityChromeShell;
  /** 우측 큰 제목·브레드크럼 현재 항목 */
  headTit?: string;
  breadcrumbCurrent?: string;
  /**
   * `generalArchive` | `eumArchive`: `archive2`·`eumArchive2` 등 — 홈 → 커뮤니티 → 자료실 → 현재
   */
  breadcrumbMode?: CommunityBreadcrumbMode;
  /** shell=community 전용 */
  activeNav?: CommunityChromeActiveNav;
  children: React.ReactNode;
}

/**
 * notice2 / noticeView2 공통 껍데기 — 비주얼 + 사이드바 + 브레드크럼까지.
 * 헤더는 페이지에서 LayoutWrapper headerType=&quot;portal&quot; 유지.
 */
export function NoticeCommunityChrome({
  themeQuery,
  shell = "notice",
  headTit = "공지사항",
  breadcrumbCurrent,
  breadcrumbMode = "default",
  activeNav = "notice",
  children,
}: NoticeCommunityChromeProps) {
  const currentCrumb = breadcrumbCurrent ?? headTit;
  const isCommunity = shell === "community";
  const archiveBreadcrumb =
    isCommunity &&
    (breadcrumbMode === "generalArchive" || breadcrumbMode === "eumArchive");

  const [archiveOpen, setArchiveOpen] = useState(
    () =>
      activeNav === "guide" ||
      activeNav === "eumArchive" ||
      activeNav === "project",
  );
  useEffect(() => {
    setArchiveOpen(
      activeNav === "guide" ||
        activeNav === "eumArchive" ||
        activeNav === "project",
    );
  }, [activeNav]);

  const noticeListHref = useMemo(
    () =>
      isCommunity
        ? withThemeQuery("/userWeb/community", themeQuery, { tab: "notice" })
        : withThemeQuery("/userWeb/notice", themeQuery),
    [isCommunity, themeQuery],
  );
  const communityIndexHref = useMemo(
    () => withThemeQuery("/userWeb/community", themeQuery, { tab: "notice" }),
    [themeQuery],
  );
  const guideHref = useMemo(
    () => withThemeQuery("/userWeb/community", themeQuery, { tab: "guide" }),
    [themeQuery],
  );
  const eumArchiveHref = useMemo(
    () =>
      withThemeQuery("/userWeb/community", themeQuery, { tab: "eumArchive" }),
    [themeQuery],
  );
  const inquiryHref = useMemo(
    () => withThemeQuery("/userWeb/community", themeQuery, { tab: "inquiry" }),
    [themeQuery],
  );
  const academyHref = useMemo(
    () => withThemeQuery("/userWeb/academy", themeQuery),
    [themeQuery],
  );
  const qnaHref = useMemo(
    () => withThemeQuery("/userWeb/qna", themeQuery),
    [themeQuery],
  );
  const oneOnOneHref =
    isCommunity && activeNav === "qna" ? qnaHref : isCommunity ? inquiryHref : qnaHref;

  const noticeItemActive = isCommunity ? activeNav === "notice" : true;
  const academyItemActive = isCommunity && activeNav === "academy";
  const inquiryItemActive =
    isCommunity && (activeNav === "inquiry" || activeNav === "qna");

  return (
    <>
      <section className="mainViewVisual" aria-labelledby="visualTitle">
        <div className="mainViewVisualInner">
          <div id="visualTitle" className="mainViewVisualEng">
            COMMUNITY
          </div>
          <p className="mainViewVisualKor">꿈이음센터의 소식을 확인하세요</p>
        </div>
      </section>
      <section className="flex-content communityContainer">
        <aside className="communitySidebar" aria-label="커뮤니티 메뉴">
          <div className="sidebarHeader">
            <div className="sidebarTitle">커뮤니티</div>
          </div>
          <nav className="sidebarNav" aria-label="커뮤니티 하위 메뉴">
            <ul className="menuList">
              <li className={`menuItem${noticeItemActive ? " active" : ""}`}>
                <Link href={noticeListHref} className="menuLink">
                  <span>공지사항</span>
                  <div className="icon">
                    <i className="icoArrow" aria-hidden />
                  </div>
                </Link>
              </li>
              <li className={`menuItem${archiveOpen ? " subOpen" : ""}`}>
                <button
                  type="button"
                  className="menuButton"
                  aria-expanded={archiveOpen}
                  onClick={() => setArchiveOpen((v) => !v)}
                >
                  <span>자료실</span>
                  <div className="icon">
                    <i className="icoArrow" aria-hidden />
                  </div>
                </button>
                <ul className="subMenu">
                  <li>
                    <Link
                      href={guideHref}
                      className={activeNav === "guide" ? "active" : undefined}
                    >
                      일반 자료실
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={eumArchiveHref}
                      className={
                        activeNav === "eumArchive" ? "active" : undefined
                      }
                    >
                      이음 아카이브
                    </Link>
                  </li>
                </ul>
              </li>
              <li className={`menuItem${academyItemActive ? " active" : ""}`}>
                <Link href={academyHref} className="menuLink">
                  <span>학원조회</span>
                  <div className="icon">
                    <i className="icoArrow" aria-hidden />
                  </div>
                </Link>
              </li>
              <li className={`menuItem${inquiryItemActive ? " active" : ""}`}>
                <Link href={oneOnOneHref} className="menuLink">
                  <span>1:1 문의</span>
                  <div className="icon">
                    <i className="icoArrow" aria-hidden />
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        <div className="rightContent">
          <div className="flex-sb">
            <div className="headTit">{headTit}</div>
            <nav className="breadcrumb" aria-label="브레드크럼">
              <ol className="breadcrumbList">
                <li className="breadcrumbItem">
                  <Link href="/userWeb" className="homeLink">
                    <img
                      src="/images/userWeb/icon/ico_home_gr.png"
                      alt=""
                      className="icoHome"
                      width={24}
                      height={24}
                    />
                    <span>홈</span>
                  </Link>
                </li>
                <li className="breadcrumbItem">
                  <Link href={communityIndexHref}>커뮤니티</Link>
                </li>
                {archiveBreadcrumb ? (
                  <li className="breadcrumbItem">
                    <span className="breadcrumbStatic">자료실</span>
                  </li>
                ) : null}
                <li className="breadcrumbItem">
                  <span aria-current="page">{currentCrumb}</span>
                </li>
              </ol>
            </nav>
          </div>
          {children}
        </div>
      </section>
    </>
  );
}
