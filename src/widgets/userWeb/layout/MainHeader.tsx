"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/entities/auth/api";
import { apiClient } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

const IMG = "/images/userWeb";

const GRADE_CODE_ID = "EDR003";

/** 배지 라벨(학생/학부모·일반/기관/학원/멘토) → 회원가입 type 쿼리값. 클릭한 컨텍스트에 맞는 색상 적용용 */
const BADGE_LABEL_TO_JOIN_TYPE: Record<string, string> = {
  학생: "student",
  "학부모/일반": "parent",
  기관: "school",
  학원: "academy",
  멘토: "mentor",
};

/** 배지 라벨 → 헤더 배지 클래스 (data-theme과 함께 색상 적용) */
const BADGE_LABEL_TO_CLASS: Record<string, string> = {
  학생: "badgeStudent",
  "학부모/일반": "badgeParent",
  기관: "badgeSchool",
  학원: "badgeAcademy",
  멘토: "badgeMentor",
};

/** 배지 라벨 → 메인 페이지 쿼리 (로고 클릭 시 type/reqGbPosition 없을 때 사용) */
const BADGE_LABEL_TO_MAIN_QUERY: Record<
  string,
  { type?: string; reqGbPosition?: string }
> = {
  학생: { type: "student" },
  "학부모/일반": { type: "parent", reqGbPosition: "2" },
  기관: { type: "school", reqGbPosition: "5" },
  학원: { reqGbPosition: "3" },
  멘토: { reqGbPosition: "4" },
};

/** EDR003 소분류 코드 1건 (API 응답) */
interface DetailCodeItem {
  codeId?: string;
  code?: string;
  codeNm?: string;
  codeDc?: string;
}

/** 초등 E, 중등 J/M, 고등 H 로 그룹 라벨 매핑 */
const SCHOOL_GROUP_LABEL: Record<string, string> = {
  E: "초등",
  J: "중등",
  M: "중등",
  H: "고등",
};

const SCHOOL_GROUP_ORDER = ["E", "J", "M", "H"];

const STATIC_NAV_ITEMS: { label: string; href: string }[] = [
  { label: "공지사항", href: "/userWeb/notice" },
  { label: "학원조회", href: "/userWeb/academy" },
  { label: "MY PAGE", href: "/userWeb/mypagePr" },
];

/** 학원(ANR) 로그인 후 메인: 학원정보·가맹신청·통계정보만 — 커뮤니티/공지/QnA 등 네비·util 노출 없음 */
const ACADEMY_MAIN_NAV = [
  { label: "학원정보", href: "/userWeb/main?reqGbPosition=3" },
  { label: "가맹신청", href: "#" },
  { label: "통계정보", href: "#" },
];

/** 멘토(MNR) 로그인 후 메인: 멘토신청·멘토업무·통계자료만 — 커뮤니티 관련 네비·util 노출 없음 */
const MENTOR_MAIN_NAV = [
  { label: "멘토신청", href: "/userWeb/main?reqGbPosition=4" },
  { label: "멘토업무", href: "/userWeb/mentorWork?reqGbPosition=4" },
  { label: "통계자료", href: "#" },
];

type NavItem =
  | { label: string; href: string }
  | {
      label: string;
      href: string;
      children: { label: string; href: string; code: string }[];
    };

/** 학교 진입 시 영유아 메인 링크 (grade=Y1; EduListSection proTarget과 동일) */
function buildSchoolYuyouHref(
  typeParam: string | null,
  reqGbPosition: string | null,
): string {
  const q = new URLSearchParams();
  q.set("grade", "Y1");
  if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
  else if (typeParam === "school") q.set("reqGbPosition", "5");
  else q.set("reqGbPosition", "5");
  if (typeParam) q.set("type", typeParam);
  return `/userWeb/main?${q.toString()}`;
}

function buildNavItemsFromCodes(
  details: DetailCodeItem[],
  typeParam: string | null,
  reqGbPosition: string | null,
): NavItem[] {
  const byLabel: Record<string, DetailCodeItem[]> = {};
  for (const d of details) {
    const code = d.code?.trim();
    const codeNm = d.codeNm?.trim();
    if (!code || !codeNm) continue;
    const first = code.charAt(0).toUpperCase();
    const label = SCHOOL_GROUP_LABEL[first];
    if (!label) continue;
    if (!byLabel[label]) byLabel[label] = [];
    byLabel[label].push(d);
  }
  const schoolNav: NavItem[] = [];
  for (const key of SCHOOL_GROUP_ORDER) {
    const label = SCHOOL_GROUP_LABEL[key];
    const items = byLabel[label];
    if (!items?.length) continue;
    byLabel[label] = []; // 이미 추가한 그룹은 제거 (E, J, M 순서로 한 번씩만 푸시)
    const parentQ = new URLSearchParams();
    parentQ.set("schoolGb", key);
    if (typeParam) parentQ.set("type", typeParam);
    if (reqGbPosition) parentQ.set("reqGbPosition", reqGbPosition);
    const parentHref = `/userWeb/main?${parentQ.toString()}`;
    const gradeLinks = items.map((d) => {
      const grade = d.code ?? "";
      const q = new URLSearchParams();
      q.set("grade", grade);
      if (typeParam) q.set("type", typeParam);
      if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
      const href = `/userWeb/main?${q.toString()}`;
      return {
        label: d.codeNm ?? "",
        href,
        code: grade,
      };
    });
    const children = [...gradeLinks];
    schoolNav.push({ label, href: parentHref, children });
  }
  const isSchoolEntryNav =
    typeParam === "school" || reqGbPosition === "5";
  const yuyouPrefix: NavItem[] = isSchoolEntryNav
    ? [
        {
          label: "영유아",
          href: buildSchoolYuyouHref(typeParam, reqGbPosition),
        },
      ]
    : [];

  return isSchoolEntryNav
    ? [...yuyouPrefix, ...schoolNav]
    : [...yuyouPrefix, ...schoolNav, ...STATIC_NAV_ITEMS];
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  {
    label: "초등",
    href: "/userWeb/main?schoolGb=E",
    children: [
      { label: "1학년", href: "/userWeb/main?grade=E1", code: "E1" },
      { label: "2학년", href: "/userWeb/main?grade=E2", code: "E2" },
      { label: "3학년", href: "/userWeb/main?grade=E3", code: "E3" },
      { label: "4학년", href: "/userWeb/main?grade=E4", code: "E4" },
      { label: "5학년", href: "/userWeb/main?grade=E5", code: "E5" },
      { label: "6학년", href: "/userWeb/main?grade=E6", code: "E6" },
    ],
  },
  {
    label: "중등",
    href: "/userWeb/main?schoolGb=J",
    children: [
      { label: "1학년", href: "/userWeb/main?grade=J1", code: "J1" },
      { label: "2학년", href: "/userWeb/main?grade=J2", code: "J2" },
      { label: "3학년", href: "/userWeb/main?grade=J3", code: "J3" },
    ],
  },
  {
    label: "고등",
    href: "/userWeb/main?schoolGb=H",
    children: [
      { label: "1학년", href: "/userWeb/main?grade=H1", code: "H1" },
      { label: "2학년", href: "/userWeb/main?grade=H2", code: "H2" },
      { label: "3학년", href: "/userWeb/main?grade=H3", code: "H3" },
    ],
  },
  ...STATIC_NAV_ITEMS,
];

/**
 * source/gunsan/main.html(학생, reqGbPosition=1) PC 네비
 * - 영유아 / 초등(1~6) / 중등(1~3) / 고등(1~3) / 일반 (커뮤니티는 utilMenu 링크)
 */
const STUDENT_GUNSAN_NAV_ITEMS: NavItem[] = [
  // API proTarget 필터: 영유아=Y1, 일반=O1
  // EduListSection은 URL의 grade 쿼리를 proTarget으로 그대로 내려보냄
  { label: "영유아", href: "/userWeb/main?reqGbPosition=1&grade=Y1" },
  {
    label: "초등",
    href: "/userWeb/main?reqGbPosition=1&schoolGb=E",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=1&grade=E1", code: "E1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=1&grade=E2", code: "E2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=1&grade=E3", code: "E3" },
      { label: "4학년", href: "/userWeb/main?reqGbPosition=1&grade=E4", code: "E4" },
      { label: "5학년", href: "/userWeb/main?reqGbPosition=1&grade=E5", code: "E5" },
      { label: "6학년", href: "/userWeb/main?reqGbPosition=1&grade=E6", code: "E6" },
    ],
  },
  {
    label: "중등",
    href: "/userWeb/main?reqGbPosition=1&schoolGb=J",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=1&grade=J1", code: "J1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=1&grade=J2", code: "J2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=1&grade=J3", code: "J3" },
    ],
  },
  {
    label: "고등",
    href: "/userWeb/main?reqGbPosition=1&schoolGb=H",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=1&grade=H1", code: "H1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=1&grade=H2", code: "H2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=1&grade=H3", code: "H3" },
    ],
  },
  { label: "일반", href: "/userWeb/main?reqGbPosition=1&grade=O1" },
];

/**
 * 학부모 메인: 학생과 동일 PC 네비(영유아~일반), 쿼리만 reqGbPosition=2&type=parent
 */
const PARENT_GUNSAN_NAV_ITEMS: NavItem[] = [
  { label: "영유아", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=Y1" },
  {
    label: "초등",
    href: "/userWeb/main?reqGbPosition=2&type=parent&schoolGb=E",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E1", code: "E1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E2", code: "E2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E3", code: "E3" },
      { label: "4학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E4", code: "E4" },
      { label: "5학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E5", code: "E5" },
      { label: "6학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=E6", code: "E6" },
    ],
  },
  {
    label: "중등",
    href: "/userWeb/main?reqGbPosition=2&type=parent&schoolGb=J",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=J1", code: "J1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=J2", code: "J2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=J3", code: "J3" },
    ],
  },
  {
    label: "고등",
    href: "/userWeb/main?reqGbPosition=2&type=parent&schoolGb=H",
    children: [
      { label: "1학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=H1", code: "H1" },
      { label: "2학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=H2", code: "H2" },
      { label: "3학년", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=H3", code: "H3" },
    ],
  },
  { label: "일반", href: "/userWeb/main?reqGbPosition=2&type=parent&grade=O1" },
];

export type MainHeaderNavVariant = "academy" | "mentor";

interface MainHeaderProps {
  badgeLabel?: string;
  /** 학원/멘토 로그인 후 메인일 때만 사용. 지정 시 해당 네비만 표시(main_ac 등) */
  navVariant?: MainHeaderNavVariant;
  /** 로그인 버튼 클릭 시 호출 (로그인 모달 열기 등) */
  onLoginClick?: () => void;
  /** 로그인 여부 (true면 로그아웃 버튼·회원가입 숨김) */
  isAuthenticated?: boolean;
  /** 로그아웃 후 호출 (상태 갱신용) */
  onLogout?: () => void;
  onMypageClickWhenUnauth?: () => void;
  /** true면 학원/멘토 네비 중 MY PAGE 제외한 항목(학원정보, 가맹신청, 통계정보, 공지사항 등) 클릭 이동 비활성화 */
  navLinksDisabled?: boolean;
}

/** useSearchParams를 사용하는 내부 컴포넌트 - 반드시 Suspense 내에서 렌더링 */
const MainHeaderContent: React.FC<MainHeaderProps> = ({
  badgeLabel = "학생",
  navVariant,
  onLoginClick,
  isAuthenticated = false,
  onLogout,
  onMypageClickWhenUnauth,
  navLinksDisabled = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const reqGbPosition = searchParams.get("reqGbPosition");
  /** 학교 진입(reqGbPosition=5 또는 type=school): 로그인·회원가입 불필요 → 비로그인 시 해당 링크 숨김 */
  const isSchoolEntry =
    typeParam === "school" || reqGbPosition === "5";
  /** 로고 클릭: URL에 type/reqGbPosition 있으면 그대로 /userWeb/main?… 로 이동, 없으면 현재 배지(학생/학부모/학원/멘토)에 맞는 메인 링크로 이동 */
  /** type=school 만 있고 reqGbPosition 이 없으면(공지 등) 목록 API용으로 5 보강 */
  const logoHref = (() => {
    if (typeParam || reqGbPosition) {
      const q = new URLSearchParams();
      if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
      else if (typeParam === "school") q.set("reqGbPosition", "5");
      if (typeParam) q.set("type", typeParam);
      return `/userWeb/main?${q.toString()}`;
    }
    const mainQuery = BADGE_LABEL_TO_MAIN_QUERY[badgeLabel];
    if (mainQuery) {
      const q = new URLSearchParams();
      if (mainQuery.type) q.set("type", mainQuery.type);
      if (mainQuery.reqGbPosition)
        q.set("reqGbPosition", mainQuery.reqGbPosition);
      return `/userWeb/main?${q.toString()}`;
    }
    return "/userWeb";
  })();
  /** 학원조회 링크: 현재 진입 유형(학생/학부모/학원/멘토) 쿼리 유지 (기본 네비일 때만 사용) */
  const academyHref = (() => {
    const q = new URLSearchParams();
    if (typeParam) q.set("type", typeParam);
    if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
    else if (typeParam === "school") q.set("reqGbPosition", "5");
    return q.toString()
      ? `/userWeb/academy?${q.toString()}`
      : "/userWeb/academy";
  })();
  const themeQuery = (() => {
    if (typeParam) {
      const q = new URLSearchParams();
      q.set("type", typeParam);
      if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
      else if (typeParam === "school") q.set("reqGbPosition", "5");
      return q.toString();
    }
    if (reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
    return "";
  })();
  /** 공지사항 링크: 학생/학부모일 때 type 또는 reqGbPosition 쿼리 유지 */
  const noticeHref = themeQuery
    ? `/userWeb/notice?${themeQuery}`
    : "/userWeb/notice";
  const communityHref = themeQuery
    ? `/userWeb/community?${themeQuery}`
    : "/userWeb/community";
  // main.html(학생) 네비는 URL 쿼리(reqGbPosition=1)가 없어도
  // 학생(SNR) 로그인 상태면 유지되어야 한다.
  const useGunsanStudentNav =
    reqGbPosition === "1" ||
    typeParam === "student" ||
    (isAuthenticated && badgeLabel === "학생");

  /** 학부모 메인: main.html 과 동일 네비(영유아~커뮤니티), 포털 비표시 정책
   *  - student는 isAuthenticated+badeLabel로 고정했고, parent도 mypagePr에서 고정되도록 대칭 처리
   */
  const isParentMainNav =
    typeParam === "parent" ||
    reqGbPosition === "2" ||
    (pathname === "/userWeb/main" && badgeLabel === "학부모/일반") ||
    (isAuthenticated && badgeLabel === "학부모/일반");

  /** 학교 진입: 기본 네비에 영유아를 초등 왼쪽에 둠(학생·학부모 메인과 동일 순서) */
  const schoolDefaultNavItems = useMemo((): NavItem[] => {
    const gradeNavItems = DEFAULT_NAV_ITEMS.filter(
      (item) => item.label === "초등" || item.label === "중등" || item.label === "고등",
    );

    const themeQuery = (() => {
      if (typeParam) {
        const q = new URLSearchParams();
        q.set("type", typeParam);
        if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
        else if (typeParam === "school") q.set("reqGbPosition", "5");
        return q.toString();
      }
      if (reqGbPosition) return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
      return "";
    })();

    return [
      {
        label: "영유아",
        href: buildSchoolYuyouHref(typeParam, reqGbPosition),
      },
      ...gradeNavItems,
    ];
  }, [typeParam, reqGbPosition]);

  /** 상단 headerTop: `main.html` 패턴 — 좌측 portalWrap(바로가기); utilMenu 커뮤니티는 학원·멘토(`navVariant`) 제외. */

  const [navItems, setNavItems] = useState<NavItem[]>(
    useGunsanStudentNav
      ? STUDENT_GUNSAN_NAV_ITEMS
      : isParentMainNav
        ? PARENT_GUNSAN_NAV_ITEMS
        : isSchoolEntry
          ? schoolDefaultNavItems
          : DEFAULT_NAV_ITEMS,
  );

  /** 클라이언트 전환 시 학생/학부모/기본 네비 베이스 동기화 → 이후 EDR003 API가 덮어씀(학생·학부모 고정 네비는 제외) */
  useEffect(() => {
    if (navVariant) return;
    if (useGunsanStudentNav) {
      setNavItems(STUDENT_GUNSAN_NAV_ITEMS);
      return;
    }
    if (isParentMainNav) {
      setNavItems(PARENT_GUNSAN_NAV_ITEMS);
    } else if (isSchoolEntry) {
      setNavItems(schoolDefaultNavItems);
    } else {
      setNavItems(DEFAULT_NAV_ITEMS);
    }
  }, [
    navVariant,
    useGunsanStudentNav,
    isParentMainNav,
    isSchoolEntry,
    schoolDefaultNavItems,
  ]);

  /** 학원/멘토 로그인 후 메인: 단순 네비만 표시 */
  const simpleNavItems: NavItem[] =
    navVariant === "academy"
      ? ACADEMY_MAIN_NAV
      : navVariant === "mentor"
        ? MENTOR_MAIN_NAV
        : [];
  const displayNavItems: NavItem[] =
    simpleNavItems.length > 0 ? simpleNavItems : navItems;
  /** 학교 진입: 상단바에서 학원조회·MY PAGE 비표시 */
  const displayNavItemsForRender: NavItem[] = isSchoolEntry
    ? displayNavItems.filter(
        (item) => item.label !== "학원조회" && item.label !== "MY PAGE",
      )
    : displayNavItems;
  /** Hydration 방지: 서버·클라이언트 첫 렌더는 동일한 텍스트(로그인). 마운트 후에만 isAuthenticated 반영 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showAuthState = mounted && isAuthenticated;

  useEffect(() => {
    if (navVariant) return;
    if (useGunsanStudentNav) return; // source/gunsan/main.html 기준으로 고정된 학생 네비 사용
    if (isParentMainNav) return; // 학부모도 학생과 동일 main.html 네비 고정
    const endpoint = `${API_ENDPOINTS.CODE.DETAIL_LIST_BASE}/${GRADE_CODE_ID}/details`;
    apiClient
      .get<DetailCodeItem[]>(endpoint)
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        if (arr.length) {
          setNavItems(buildNavItemsFromCodes(arr, typeParam, reqGbPosition));
        }
      })
      .catch(() => {
        // 실패 시 기본 목록 유지
      });
  }, [navVariant, typeParam, reqGbPosition, isParentMainNav]);

  const handleLoginClick = (e: React.MouseEvent) => {
    if (onLoginClick) {
      e.preventDefault();
      onLoginClick();
    }
  };

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await AuthService.logout();
    onLogout?.();
    router.refresh();
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 모바일 메뉴에서 "초등"이 처음 열려있는 상태처럼 보이게 맞춤(영유아가 있으면 초등은 인덱스 1)
  const [activeNavIndex, setActiveNavIndex] = useState<number | null>(
    useGunsanStudentNav || isParentMainNav || isSchoolEntry ? 1 : 0,
  );

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  const handleMenuOpen = () => {
    setMobileMenuOpen(true);
    setTimeout(() => {
      const closeBtn = document.querySelector(
        ".menuClose",
      ) as HTMLButtonElement;
      closeBtn?.focus();
    }, 100);
  };

  const handleMenuClose = () => {
    setMobileMenuOpen(false);
    const openBtn = document.querySelector(".menuOpen") as HTMLButtonElement;
    openBtn?.focus();
  };

  return (
    <header className="header">
      <div className="headerTop inner">
        <div className="portalWrap">
          <a
            href="/userWeb"
            className="btnPortal"
            onClick={(e) => {
              e.preventDefault();
              router.push("/userWeb");
            }}
          >
            <img
              src={`${IMG}/icon/ico_home.png`}
              alt=""
              aria-hidden="true"
            />
            바로가기
          </a>
        </div>
        <div className="headerLogo">
          <h1>
            <a
              href={logoHref}
              onClick={(e) => {
                e.preventDefault();
                if (navLinksDisabled && onMypageClickWhenUnauth) {
                  onMypageClickWhenUnauth();
                  return;
                }
                window.location.href = logoHref;
              }}
              title="메인으로 이동"
            >
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" />
            </a>
          </h1>
          <span className={BADGE_LABEL_TO_CLASS[badgeLabel] ?? "badgeStudent"}>
            {badgeLabel}
          </span>
        </div>
        <div className="utilMenu">
          <div className="userLinks">
            {showAuthState ? (
              <>
                <a href="#" onClick={handleLogoutClick}>
                  로그아웃
                </a>
                <Link href="/userWeb/mypagePr">MY PAGE</Link>
              </>
            ) : isSchoolEntry ? null : (
              <>
                <a href="#" onClick={handleLoginClick}>
                  로그인
                </a>
                <Link
                  href={`/userWeb/terms?type=${BADGE_LABEL_TO_JOIN_TYPE[badgeLabel] ?? "student"}`}
                >
                  회원가입
                </Link>
              </>
            )}
            {!navVariant ? (
              <Link href={communityHref}>커뮤니티</Link>
            ) : null}
          </div>
          <button
            type="button"
            className="menuOpen"
            aria-label="메뉴 열기"
            onClick={handleMenuOpen}
          >
            <img src={`${IMG}/icon/ico_menu_32.png`} alt="메뉴 열기" />
          </button>
        </div>
      </div>
      <nav className="navPc" aria-label="메인 메뉴">
        <div className="inner">
          <ul className="navList">
            {displayNavItemsForRender.map((item, i) => {
              const isNavItemDisabled = navLinksDisabled && navVariant;
              return (
                <li key={i}>
                  {"children" in item && item.children ? (
                    <>
                      <Link href={item.href} className="mainLink">
                        {item.label}
                      </Link>
                      <div className="subMenu">
                        <div className="inner">
                          <ul className="subList">
                            {item.children.map((sub, j) => (
                              <li key={j}>
                                <Link href={sub.href}>{sub.label}</Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : isNavItemDisabled && onMypageClickWhenUnauth ? (
                    <button
                      type="button"
                      className="mainLink"
                      onClick={() => onMypageClickWhenUnauth()}
                      title="로그인 후 이용 가능합니다"
                    >
                      {item.label}
                    </button>
                  ) : isNavItemDisabled ? (
                    <span
                      className="mainLink navLinkDisabled"
                      aria-disabled="true"
                      title="이용약관·회원가입 완료 후 이용 가능합니다"
                    >
                      {item.label}
                    </span>
                  ) : item.label === "MY PAGE" &&
                    !showAuthState &&
                    onMypageClickWhenUnauth ? (
                    <a
                      href="/userWeb"
                      className="mainLink"
                      onClick={(e) => {
                        e.preventDefault();
                        onMypageClickWhenUnauth();
                      }}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={
                        !navVariant && item.label === "학원조회"
                          ? academyHref
                          : !navVariant && item.label === "공지사항"
                            ? noticeHref
                            : item.href
                      }
                      className="mainLink"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
      <div
        className={`moMenu ${mobileMenuOpen ? "active" : ""}`}
        id="mobileMenu"
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="moMenuBg"
          role="button"
          tabIndex={-1}
          aria-label="메뉴 닫기"
          onClick={handleMenuClose}
          onKeyDown={(e) => e.key === "Enter" && handleMenuClose()}
        />
        <div className="moMenuInner">
          <div className="moMenuHeader">
            <div className="logoArea">
              <img src={`${IMG}/logo.png`} alt="군산시꿈이음센터" height={32} />
              <span
                className={BADGE_LABEL_TO_CLASS[badgeLabel] ?? "badgeStudent"}
              >
                {badgeLabel}
              </span>
            </div>
            <button
              type="button"
              className="menuClose"
              aria-label="메뉴 닫기"
              onClick={handleMenuClose}
            >
              <img src={`${IMG}/icon/ico_close_32.png`} alt="닫기" />
            </button>
          </div>
          <div className="moMenuContent">
            <nav className="moMenuNav">
              <ul className="moNavList">
                {displayNavItemsForRender.map((item, i) => {
                  const isNavItemDisabled = navLinksDisabled && navVariant;
                  return (
                    <li
                      key={i}
                      className={`navItem ${activeNavIndex === i ? "active" : ""}`}
                    >
                      {"children" in item && item.children ? (
                        <>
                          <button
                            type="button"
                            className="moMainLink"
                            onClick={() =>
                              setActiveNavIndex(activeNavIndex === i ? null : i)
                            }
                          >
                            {item.label}
                          </button>
                          <div className="moSubMenuPane">
                            <ul className="moSubList">
                              {item.children.map((sub, j) => (
                                <li key={j}>
                                  <Link href={sub.href}>{sub.label}</Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      ) : isNavItemDisabled && onMypageClickWhenUnauth ? (
                        <button
                          type="button"
                          className="moMainLink"
                          onClick={() => {
                            onMypageClickWhenUnauth();
                            handleMenuClose();
                          }}
                          title="로그인 후 이용 가능합니다"
                        >
                          {item.label}
                        </button>
                      ) : isNavItemDisabled ? (
                        <span
                          className="moMainLink navLinkDisabled"
                          aria-disabled="true"
                          title="이용약관·회원가입 완료 후 이용 가능합니다"
                        >
                          {item.label}
                        </span>
                      ) : item.label === "MY PAGE" &&
                        !showAuthState &&
                        onMypageClickWhenUnauth ? (
                        <a
                          href="/userWeb"
                          className="moMainLink"
                          onClick={(e) => {
                            e.preventDefault();
                            onMypageClickWhenUnauth();
                            handleMenuClose();
                          }}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={
                            !navVariant && item.label === "학원조회"
                              ? academyHref
                              : !navVariant && item.label === "공지사항"
                                ? noticeHref
                                : item.href
                          }
                          className="moMainLink"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="moMenuFooter">
                {showAuthState ? (
                  <a href="#" className="btn-login" onClick={handleLogoutClick}>
                    로그아웃
                  </a>
                ) : isSchoolEntry ? null : (
                  <a href="#" className="btn-login" onClick={handleLoginClick}>
                    로그인
                  </a>
                )}
                <a
                  href="/userWeb"
                  className="btn-portal"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push("/userWeb");
                    handleMenuClose();
                  }}
                >
                  <img
                    src={`${IMG}/icon/ico_home.png`}
                    alt=""
                    aria-hidden="true"
                  />{" "}
                  바로가기
                </a>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

/** useSearchParams 사용으로 인해 Suspense 경계가 필요한 MainHeader를 래핑 */
const MainHeader: React.FC<MainHeaderProps> = (props) => (
  <Suspense fallback={<header className="header" />}>
    <MainHeaderContent {...props} />
  </Suspense>
);

export default MainHeader;
