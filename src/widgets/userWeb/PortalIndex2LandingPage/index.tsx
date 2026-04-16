"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Swiper as SwiperType } from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";

import { LayoutWrapper } from "@/widgets/userWeb/layout";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { useUserWebLogin } from "@/features/userWeb/auth/login/model";
import type { LoginRequest } from "@/entities/auth/api";
import { AuthService } from "@/entities/auth/api";
import { getArchiveArticleList } from "@/entities/userWeb/article/api";
import { apiClient, decodeDisplayText, readRememberLoginId } from "@/shared/lib";
import {
  API_CONFIG,
  API_ENDPOINTS,
  USER_ARCHIVE_BBS_ID,
  USER_BOARD_BBS_IDS,
} from "@/shared/config/apiUser";
import { AlertModal, type AlertModalType } from "@/shared/ui/userWeb";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export type LoginModalType = "student" | "parent" | "academy" | "mentor";

const USER_SE_BY_TYPE: Record<LoginModalType, string> = {
  student: "SNR",
  parent: "PNR",
  academy: "ANR",
  mentor: "MNR",
};

const LOGIN_MODAL_BADGE: Record<
  LoginModalType,
  { className: string; label: string }
> = {
  student: { className: "badgeStudent", label: "학생" },
  parent: { className: "badgeParent", label: "학부모/일반" },
  academy: { className: "badgeAcademy", label: "학원" },
  mentor: { className: "badgeMentor", label: "멘토" },
};

const PORTAL_PROMO_VIDEO_SRC =
  "/images/userWeb/" +
  encodeURIComponent("군산 교육발전특구 시범사업 홍보 영상.mp4");

function keepSlidesInTabOrder(container: HTMLElement | null) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.querySelectorAll(".swiper-slide").forEach((slide) => {
      slide.removeAttribute("aria-hidden");
    });
    container.querySelectorAll(".linkItem").forEach((link) => {
      link.removeAttribute("tabindex");
    });
  });
}

function attachSlideFocusHandler(
  container: HTMLElement | null,
  onSlideFocus: (index: number) => void,
) {
  if (!container) return;
  const handler = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target?.matches(".linkItem")) return;
    const slideIndex = target
      .closest(".visualItem")
      ?.getAttribute("data-slide-index");
    if (slideIndex == null) return;
    const index = parseInt(slideIndex, 10);
    if (!Number.isNaN(index)) onSlideFocus(index);
  };

  container.removeEventListener("focusin", handler as EventListener);
  container.addEventListener("focusin", handler as EventListener);
}

type BadgeType =
  | "elementary"
  | "middle"
  | "high"
  | "university"
  | "other"
  | "kids"
  | "usual";

interface MainCardApiItem {
  proId?: string;
  proGb?: string;
  proTarget?: string;
  proType1?: string;
  proType2?: string;
  proType3?: string;
  proType4?: string;
  proType5?: string;
  proType6?: string;
  proType7?: string;
  proType?: string;
  proNm?: string;
  recFromDd?: string;
  recToDd?: string;
  proTargetNm?: string;
  etcNm?: string;
  proSum?: string;
  etc_nm?: string;
  pro_sum?: string;
  runSta?: string;
  runStaNm?: string;
  [key: string]: unknown;
}

interface UserBannerItem {
  banrCd?: string;
  title?: string;
  linkUrl?: string;
  imgUrl?: string;
  fileCd?: string;
  seq?: string | number;
}

interface UserBannerListResponse {
  result?: string;
  data?: UserBannerItem[];
}

function buildBannerImageUrl(item: UserBannerItem): string | null {
  const fileId = String(item.fileCd ?? "").trim();
  if (!fileId) return null;
  const seqRaw = item.seq;
  const seq =
    seqRaw == null || String(seqRaw).trim() === ""
      ? "1"
      : String(seqRaw).trim();
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
  if (!base) return null;
  return `${base}/api/v1/files/view?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(seq)}`;
}

function formatYyyyMmDd(yyyymmdd: string | undefined): string {
  if (!yyyymmdd || yyyymmdd.length < 8) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}.${m}.${d}`;
}

function stateClassFromRunSta(
  runSta: string | undefined,
): "plan" | "ing" | "end" | "" {
  if (!runSta) return "";
  switch (String(runSta).trim()) {
    case "01":
      return "plan";
    case "02":
      return "ing";
    case "04":
      return "end";
    default:
      return "";
  }
}

/** EduListSection `mapApiItemToCard`: PRO_TYPE 03·「홍보」는 제목 앞에 진행상태 대신 「홍보」 */
function cardStateLabelAndClass(item: MainCardApiItem): {
  stateLabel: string;
  stateClass: "plan" | "ing" | "end" | "promo" | "";
} {
  const proType = String(item.proType ?? "").trim();
  const isPromo = proType === "03" || proType === "홍보";
  if (isPromo) {
    return { stateLabel: "홍보", stateClass: "promo" };
  }
  const stateLabel = String(item.runStaNm ?? "").trim();
  const stateClass = stateClassFromRunSta(String(item.runSta ?? "").trim());
  return { stateLabel, stateClass };
}

function badgeLabelShort(badge: BadgeType): string {
  const short: Record<BadgeType, string> = {
    elementary: "초",
    middle: "중",
    high: "고",
    university: "대",
    other: "기",
    kids: "영",
    usual: "일",
  };
  return short[badge];
}

function hasAnyTargetFlag(
  item: MainCardApiItem,
  ...keys: Array<keyof MainCardApiItem>
): boolean {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim() !== "") return true;
  }
  return false;
}

function buildBadges(item: MainCardApiItem): BadgeType[] {
  const badges: BadgeType[] = [];
  if (hasAnyTargetFlag(item, "proType6")) badges.push("kids");
  if (hasAnyTargetFlag(item, "proType1")) badges.push("elementary");
  if (hasAnyTargetFlag(item, "proType2")) badges.push("middle");
  if (hasAnyTargetFlag(item, "proType3")) badges.push("high");
  if (hasAnyTargetFlag(item, "proType4")) badges.push("university");
  if (hasAnyTargetFlag(item, "proType7")) badges.push("usual");
  return badges;
}

/** 백엔드 OAuth 콜백 후 /userWeb?oauth_error=…&state=… */
const OAUTH_STATE_ROLE_LABEL: Record<string, string> = {
  student: "학생",
  parent: "학부모/일반",
  academy: "학원",
  mentor: "멘토",
};

function messageForPortalOAuthError(
  oauthError: string,
  state: string,
): { message: string; type: AlertModalType } {
  const trying = OAUTH_STATE_ROLE_LABEL[state] ?? "선택하신 회원 유형";
  switch (oauthError) {
    case "email_used_other_member_type":
      return {
        message: `이 이메일(아이디)은 다른 회원 유형으로 가입되어 있습니다.\n동일한 SNS 계정으로는 ${trying} 유형의 계정을 만들 수 없습니다.\n${trying} 가입은 다른 계정으로 시도해 주세요.`,
        type: "danger",
      };
    case "signup_failed":
      return {
        message:
          "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.",
        type: "danger",
      };
    case "no_email":
      return {
        message:
          "SNS에서 이메일 정보를 받지 못했습니다. SNS 계정 설정에서 이메일 제공에 동의했는지 확인해 주세요.",
        type: "danger",
      };
    case "login_failed":
      return {
        message: "로그인에 실패했습니다. 다시 시도해 주세요.",
        type: "danger",
      };
    case "cancelled":
      return {
        message: "SNS 로그인을 취소했습니다.",
        type: "danger",
      };
    case "no_code":
      return {
        message: "SNS 인증 코드를 받지 못했습니다. 다시 시도해 주세요.",
        type: "danger",
      };
    case "invalid_service":
      return {
        message: "지원하지 않는 SNS 서비스입니다.",
        type: "danger",
      };
    case "server":
      return {
        message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        type: "danger",
      };
    default:
      return {
        message: "로그인 처리 중 문제가 발생했습니다. 다시 시도해 주세요.",
        type: "danger",
      };
  }
}

export default function PortalIndex2LandingPage() {
  const router = useRouter();
  const auth = useUserWebAuthOptional();

  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const FILTERS = useMemo(
    () => ["전체", "영유아", "초등", "중등", "고등", "일반"] as const,
    [],
  );
  type FilterKey = (typeof FILTERS)[number];

  // index2.html JS: 전체는 단독 선택/해제 로직이 조금 특별합니다.
  const [pressedFilters, setPressedFilters] = useState<Set<FilterKey>>(
    () => new Set<FilterKey>(["전체"]),
  );
  const toggleFilter = useCallback(
    (key: FilterKey) => {
      setPressedFilters((prev) => {
        const next = new Set(prev);
        if (key === "전체") return new Set<FilterKey>(["전체"]);

        if (next.has(key)) next.delete(key);
        else next.add(key);

        // 전체 버튼은 다른 필터가 선택되는 동안 비활성화
        next.delete("전체");

        // 켤만 나머지가 하나도 없으면 전체를 다시 켬
        const others = Array.from(next).filter((k) => k !== "전체");
        if (others.length === 0) next.add("전체");
        return next;
      });
    },
    [setPressedFilters],
  );

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalType, setLoginModalType] = useState<LoginModalType | null>(
    null,
  );

  const [formData, setFormData] = useState({
    id: "",
    password: "",
    remember: false,
  });

  const handleCloseModal = useCallback(() => {
    setIsLoginModalOpen(false);
    setLoginModalType(null);
    setFormData({ id: "", password: "", remember: false });
  }, []);

  const { loading, performLogin, setError } = useUserWebLogin({
    onSuccess: handleCloseModal,
  });

  const [oauthLoading, setOauthLoading] = useState<"naver" | "kakao" | null>(
    null,
  );

  const [oauthAlertOpen, setOauthAlertOpen] = useState(false);
  const [oauthAlertMessage, setOauthAlertMessage] = useState("");
  const [oauthAlertType, setOauthAlertType] =
    useState<AlertModalType>("danger");

  const [mainCards, setMainCards] = useState<MainCardApiItem[]>([]);
  const [mainCardsError, setMainCardsError] = useState<string | null>(null);
  const [userBannerItems, setUserBannerItems] = useState<UserBannerItem[]>([]);

  const fetchMainCards = useCallback(async () => {
    try {
      setMainCardsError(null);
      const url = API_ENDPOINTS.USER_ARTPROM.MAIN_CARDS(true);
      const response = await apiClient.get<MainCardApiItem[] | null>(url);
      const list = Array.isArray(response) ? response : [];
      setMainCards(list);
    } catch (e) {
      console.error("포털 메인 카드 목록 조회 실패:", e);
      setMainCards([]);
      setMainCardsError("목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    fetchMainCards();
  }, [fetchMainCards]);

  const fetchUserBanners = useCallback(async () => {
    try {
      const response = await apiClient.post<UserBannerListResponse>(
        API_ENDPOINTS.USER_BANNER.LIST,
        {
          startIndex: 0,
          lengthPage: 10,
          userGbn: "Y",
          banrGb: "P",
        },
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      setUserBannerItems(list);
    } catch (e) {
      console.error("포털 메인 배너 목록 조회 실패:", e);
      setUserBannerItems([]);
    }
  }, []);

  useEffect(() => {
    fetchUserBanners();
  }, [fetchUserBanners]);

  const filteredCards = useMemo(() => {
    const active = Array.from(pressedFilters);
    if (active.includes("전체")) return mainCards;
    return mainCards.filter((item) => {
      const badges = buildBadges(item);
      return active.some((k) => {
        if (k === "영유아") return badges.includes("kids");
        if (k === "초등") return badges.includes("elementary");
        if (k === "중등") return badges.includes("middle");
        if (k === "고등") return badges.includes("high");
        if (k === "일반") return badges.includes("usual");
        return true;
      });
    });
  }, [mainCards, pressedFilters]);

  const slidesForCarousel = useMemo(() => {
    const minSlides = 4;
    const list = filteredCards;
    if (list.length > 0) {
      if (list.length >= minSlides) return list;
      return [
        ...list,
        ...Array.from(
          { length: minSlides - list.length },
          () => ({}) as MainCardApiItem,
        ),
      ];
    }
    // 데이터가 0건이면 /userWeb/main의 빈 카드 패턴(로고 카드)로 채움
    return Array.from({ length: minSlides }, () => ({}) as MainCardApiItem);
  }, [filteredCards]);

  const openLoginModal = useCallback(
    (type: LoginModalType) => {
      setError("");
      setLoginModalType(type);
      setIsLoginModalOpen(true);
      const userSe = USER_SE_BY_TYPE[type];
      const savedId = readRememberLoginId(userSe);
      setFormData({
        id: savedId ?? "",
        password: "",
        remember: Boolean(savedId),
      });
    },
    [setError],
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoginModalOpen) handleCloseModal();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleCloseModal, isLoginModalOpen]);

  /** OAuth 콜백 실패 시 쿼리 제거 후 안내 (백엔드가 /userWeb?oauth_error=… 로 복귀) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("oauth_error");
    if (!err) return;
    const state = params.get("state") ?? "";
    const { message, type } = messageForPortalOAuthError(err, state);
    setOauthAlertMessage(message);
    setOauthAlertType(type);
    setOauthAlertOpen(true);
    const path = window.location.pathname;
    params.delete("oauth_error");
    params.delete("state");
    const q = params.toString();
    window.history.replaceState(null, "", q ? `${path}?${q}` : path);
  }, []);

  const handleOAuthClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    service: "naver" | "kakao",
  ) => {
    e.preventDefault();
    if (oauthLoading) return;
    setError("");
    setOauthLoading(service);
    try {
      const url = await AuthService.getOAuthUrl(service, loginModalType);
      if (url) window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "OAuth 로그인 URL을 불러오지 못했습니다.",
      );
      setOauthLoading(null);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginModalType) return;
    if (!formData.id || !formData.password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    const credentials: LoginRequest = {
      id: formData.id,
      password: formData.password,
      remember: formData.remember,
      userSe: USER_SE_BY_TYPE[loginModalType],
    };
    await performLogin(credentials);
  };

  // index2.html user type click:
  // - 학생/학부모/학교: main으로 이동
  // - 학원/멘토: 로그인 모달 오픈
  const handleUserTypeClick = (
    e: React.MouseEvent,
    type: "student" | "parent" | "school" | "academy" | "mentor",
  ) => {
    e.preventDefault();

    const REQ_GB_POSITION_BY_TYPE: Record<typeof type, number> = {
      student: 1,
      parent: 2,
      school: 5,
      academy: 3,
      mentor: 4,
    };

    const buildMainHref = (
      t: "student" | "parent" | "school" | "academy" | "mentor",
    ) => {
      const reqGbPosition = REQ_GB_POSITION_BY_TYPE[t];
      const typeQuery =
        t === "parent" ? "&type=parent" : t === "school" ? "&type=school" : "";
      return `/userWeb/main?reqGbPosition=${reqGbPosition}${typeQuery}`;
    };

    const prefetchMain = (
      t: "student" | "parent" | "school" | "academy" | "mentor",
    ) => {
      try {
        router.prefetch(buildMainHref(t));
      } catch {
        // prefetch 실패는 UX에 치명적이지 않으므로 무시
      }
    };

    if (type === "student" || type === "parent" || type === "school") {
      prefetchMain(type);
      router.push(buildMainHref(type));
      return;
    }

    if (type === "academy" || type === "mentor") {
      const themeType = type;
      if (auth?.isAuthenticated && auth?.themeType === themeType) {
        const reqGb = type === "academy" ? 3 : 4;
        prefetchMain(type);
        router.push(`/userWeb/main?reqGbPosition=${reqGb}`);
        return;
      }
      openLoginModal(type);
    }
  };

  type TopBoardArticleItem = {
    nttId: number | null;
    bbsId: string | null;
    nttSj: string | null;
    ntcrDt: string | null;
  };

  type TopBoardArticleListResponse = {
    data: TopBoardArticleItem[];
    recordsTotal: number;
    recordsFiltered: number;
  };

  const [topNoticeItems, setTopNoticeItems] = useState<TopBoardArticleItem[]>(
    [],
  );
  const [topEumArchiveItems, setTopEumArchiveItems] = useState<
    TopBoardArticleItem[]
  >([]);

  const padToFive = (items: TopBoardArticleItem[]) => {
    const list = [...items];
    while (list.length < 5) {
      list.push({ nttId: null, bbsId: null, nttSj: "", ntcrDt: "" });
    }
    return list.slice(0, 5);
  };

  /** 빈 문자열이면 라인박스 높이 유지(§2.2 user-web-rules) */
  const previewCellText = (v: string | null | undefined) => {
    const t = (v ?? "").trim();
    return t === "" ? "\u00A0" : t;
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTopBoards() {
      try {
        const NOTICE_BBS_ID = USER_BOARD_BBS_IDS.NOTICE;

        const noticeUrl = `${API_ENDPOINTS.USER_ARTICLES}?bbsId=${encodeURIComponent(
          NOTICE_BBS_ID,
        )}&limit=5&offset=0`;
        const [noticeRes, eumArchiveRes] = await Promise.all([
          apiClient.get<TopBoardArticleListResponse>(noticeUrl),
          getArchiveArticleList({
            bbsId: USER_ARCHIVE_BBS_ID,
            limit: 5,
            offset: 0,
          }),
        ]);

        if (cancelled) return;

        setTopNoticeItems(Array.isArray(noticeRes?.data) ? noticeRes.data : []);
        setTopEumArchiveItems(
          Array.isArray(eumArchiveRes?.data)
            ? eumArchiveRes.data.map((row) => ({
                nttId: row.nttId ?? null,
                bbsId: row.bbsId ?? null,
                nttSj: row.nttSj ?? null,
                ntcrDt: null,
              }))
            : [],
        );
      } catch {
        if (cancelled) return;
        setTopNoticeItems([]);
        setTopEumArchiveItems([]);
      }
    }

    fetchTopBoards();
    return () => {
      cancelled = true;
    };
  }, []);

  const [isMainAutoplayPaused, setIsMainAutoplayPaused] = useState(false);
  const mainSwiperRef = useRef<SwiperType | null>(null);
  const mainSwiperContainerRef = useRef<HTMLDivElement | null>(null);
  const mainSlides = useMemo(
    () =>
      userBannerItems.length > 0
        ? userBannerItems
        : [
            { title: "배너 1", linkUrl: "#", imgUrl: "/images/img_noImg.png" },
            { title: "배너 2", linkUrl: "#", imgUrl: "/images/img_noImg.png" },
          ],
    [userBannerItems],
  );

  const toggleMainAutoplay = () => {
    if (!mainSwiperRef.current) return;
    if (isMainAutoplayPaused) {
      mainSwiperRef.current.autoplay?.start();
      setIsMainAutoplayPaused(false);
    } else {
      mainSwiperRef.current.autoplay?.stop();
      setIsMainAutoplayPaused(true);
    }
  };

  const [isCardAutoplayPaused, setIsCardAutoplayPaused] = useState(false);
  const cardSwiperRef = useRef<SwiperType | null>(null);

  const toggleCardAutoplay = () => {
    if (!cardSwiperRef.current) return;
    if (isCardAutoplayPaused) {
      cardSwiperRef.current.autoplay?.start();
      setIsCardAutoplayPaused(false);
    } else {
      cardSwiperRef.current.autoplay?.stop();
      setIsCardAutoplayPaused(true);
    }
  };

  const toggleQuickMenu = useCallback(() => {
    setIsQuickMenuOpen((v) => !v);
  }, []);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-gov.min.css"
        />
        <link
          rel="stylesheet"
          href="https://hangeul.pstatic.net/hangeul_static/css/nanum-square-round.css"
        />
      </Head>
      <LayoutWrapper headerType="portal">
        <section className="mainView">
          <div className="inner">
            <div className="content">
              <div className="textWrap">
                <span className="txtSub">
                  Designing the Future of Learning Together
                </span>
                <p className="txtPoint">
                  함께 만들어가는 <strong>열린 교육의 장</strong>
                </p>
                <p className="txtDesc">누구나 배우고 성장하는</p>
                <h2 className="mainTitle">홈페이지</h2>
              </div>
              <div
                className="visImg"
                role="img"
                aria-label="홈페이지 교육 캐릭터 이미지"
              />
            </div>

            <div className="userTypeContainer">
              <ul className="userTypeList">
                <li className="userTypeItem">
                  <a
                    href="#"
                    className="typeLink"
                    onClick={(e) => handleUserTypeClick(e, "student")}
                    onMouseEnter={() => {
                      try {
                        router.prefetch("/userWeb/main?reqGbPosition=1");
                      } catch {}
                    }}
                  >
                    <div className="profileImg">
                      <img src="/images/img_student2.png" alt="학생 캐릭터" />
                    </div>
                    <div className="typeInfo">
                      <span className="badge">학생</span>
                      {/* <p className="desc">
                        스스로 배움을 제안하는
                        <br />
                        미래의 주인공
                      </p> */}
                    </div>
                  </a>
                </li>

                <li className="userTypeItem">
                  <a
                    href="#"
                    className="typeLink"
                    onClick={(e) => handleUserTypeClick(e, "parent")}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(
                          "/userWeb/main?reqGbPosition=2&type=parent",
                        );
                      } catch {}
                    }}
                  >
                    <div className="profileImg">
                      <img src="/images/img_parent2.png" alt="학부모/일반 캐릭터" />
                    </div>
                    <div className="typeInfo">
                      <span className="badge">학부모/일반</span>
                      {/* <p className="desc">
                        아이의 성장을
                        <br />
                        함께 꿈꾸는 동반자
                      </p> */}
                    </div>
                  </a>
                </li>

                <li className="userTypeItem">
                  <a
                    href="#"
                    className="typeLink"
                    onClick={(e) => handleUserTypeClick(e, "school")}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(
                          "/userWeb/main?reqGbPosition=5&type=school",
                        );
                      } catch {}
                    }}
                  >
                    <div className="profileImg">
                      <img src="/images/img_school.png" alt="기관 캐릭터" />
                    </div>
                    <div className="typeInfo">
                      <span className="badge">기관</span>
                      {/* <p className="desc">
                        배움과 성장을 이끄는
                        <br />
                        교육의 중심
                      </p> */}
                    </div>
                  </a>
                </li>

                <li className="userTypeItem">
                  <a
                    href="#"
                    className="typeLink"
                    onClick={(e) => handleUserTypeClick(e, "academy")}
                    onMouseEnter={() => {
                      try {
                        router.prefetch("/userWeb/main?reqGbPosition=3");
                      } catch {}
                    }}
                  >
                    <div className="profileImg">
                      <img src="/images/img_academy2.png" alt="학원 캐릭터" />
                    </div>
                    <div className="typeInfo">
                      <span className="badge">학원</span>
                      {/* <p className="desc">
                        배움을 실현하는
                        <br />
                        전문 교육 파트너
                      </p> */}
                    </div>
                  </a>
                </li>

                <li className="userTypeItem">
                  <a
                    href="#"
                    className="typeLink"
                    onClick={(e) => handleUserTypeClick(e, "mentor")}
                    onMouseEnter={() => {
                      try {
                        router.prefetch("/userWeb/main?reqGbPosition=4");
                      } catch {}
                    }}
                  >
                    <div className="profileImg">
                      <img src="/images/img_mentor2.png" alt="멘토 캐릭터" />
                    </div>
                    <div className="typeInfo">
                      <span className="badge">멘토</span>
                      {/* <p className="desc">
                        배움의 길을 함께
                        <br />
                        설계하는 든든한 안내자
                      </p> */}
                    </div>
                  </a>
                </li>
              </ul>
            </div>

            <div className="flex-sb mediaWrap">
              <div
                ref={mainSwiperContainerRef}
                className="mainSwiper swiper"
                aria-roledescription="carousel"
                aria-label="주요 소식 슬라이드"
              >
                <Swiper
                  onSwiper={(swiper) => {
                    mainSwiperRef.current = swiper;
                    keepSlidesInTabOrder(mainSwiperContainerRef.current);
                    attachSlideFocusHandler(
                      mainSwiperContainerRef.current,
                      (index) => {
                        mainSwiperRef.current?.slideToLoop(index, 600);
                      },
                    );
                  }}
                  onSlideChangeTransitionEnd={() => {
                    keepSlidesInTabOrder(mainSwiperContainerRef.current);
                  }}
                  modules={[Autoplay, Navigation, Pagination]}
                  watchOverflow={false}
                  loop
                  speed={600}
                  autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                  }}
                  pagination={{
                    el: ".mainSwiper .swiperPagination",
                    type: "fraction",
                    renderFraction: function (currentClass, totalClass) {
                      return (
                        '<span class="' +
                        currentClass +
                        '"></span>' +
                        " / " +
                        '<span class="' +
                        totalClass +
                        '"></span>'
                      );
                    },
                  }}
                  navigation={{
                    nextEl: ".mainSwiper .btnNext",
                    prevEl: ".mainSwiper .btnPrev",
                  }}
                  a11y={{
                    prevSlideMessage: "이전 슬라이드",
                    nextSlideMessage: "다음 슬라이드",
                    firstSlideMessage: "첫 번째 슬라이드입니다",
                    lastSlideMessage: "마지막 슬라이드입니다",
                  }}
                >
                  {mainSlides.map((item, index) => {
                    const href =
                      item.linkUrl && item.linkUrl.trim() !== ""
                        ? item.linkUrl
                        : "#";
                    const bannerViewUrl = buildBannerImageUrl(item);
                    const imageSrc =
                      bannerViewUrl ||
                      (item.imgUrl && item.imgUrl.trim() !== ""
                        ? item.imgUrl
                        : "/images/img_noImg.png");
                    const title =
                      item.title && item.title.trim() !== ""
                        ? item.title
                        : `메인 배너 ${index + 1}`;

                    return (
                      <SwiperSlide
                        key={`main-banner-${item.banrCd ?? index}`}
                        className="visualItem"
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${index + 1}/${mainSlides.length}`}
                        data-slide-index={String(index)}
                      >
                        <a href={href} className="linkItem">
                          <img src={imageSrc} alt={title} />
                        </a>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>

                <div className="swiperControlWrap">
                  <div className="swiperPagination" aria-live="polite" />
                  <div className="swiperButtons">
                    <button
                      type="button"
                      className="btnPrev"
                      title="이전 슬라이드"
                    >
                      <img src="/images/icon/ico_swiper_prev.png" alt="이전" />
                    </button>
                    <button
                      type="button"
                      className={`btnAutoPlay ${
                        isMainAutoplayPaused ? "play" : "pause"
                      }`}
                      title={
                        isMainAutoplayPaused ? "자동재생 시작" : "자동재생 정지"
                      }
                      aria-label={
                        isMainAutoplayPaused ? "자동재생 시작" : "자동재생 정지"
                      }
                      onClick={toggleMainAutoplay}
                    >
                      <img
                        src={
                          isMainAutoplayPaused
                            ? "/images/icon/ico_play.png"
                            : "/images/icon/ico_pause.png"
                        }
                        alt=""
                        className="icoState"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className="btnNext"
                      title="다음 슬라이드"
                    >
                      <img src="/images/icon/ico_swiper_next.png" alt="다음" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="videoWrap">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  width={600}
                  height={450}
                  aria-label="군산 교육발전특구 시범사업 홍보 영상"
                  src={PORTAL_PROMO_VIDEO_SRC}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mainEduWrap">
          <div className="eduWrapTxt">
            <div className="txt1">지금 필요한 지원사업과 교육을 만나보세요</div>
            <div className="txt2">
              놓치기 쉬운 정보까지 한눈에 확인할 수 있어요
            </div>
          </div>

          <div className="optionWrap">
            <div className="tit">나에게 맞는 프로그램을 찾아보세요</div>
            <div
              role="group"
              aria-labelledby="filter-title"
              className="optBtnWrap"
            >
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={pressedFilters.has(f) ? "true" : "false"}
                  onClick={() => toggleFilter(f)}
                >
                  #{f}
                </button>
              ))}
            </div>
          </div>

          <div className="eduListWrap">
            <div
              className="cardSwiper swiper"
              aria-roledescription="carousel"
              aria-label="교육 목록 슬라이드"
            >
              <Swiper
                onSwiper={(swiper) => {
                  cardSwiperRef.current = swiper;
                }}
                onSlideChangeTransitionEnd={() => {
                  // 카드 슬라이드도 탭 순서에서 사라지지 않게 처리
                  const root = document.querySelector(
                    ".cardSwiper",
                  ) as HTMLElement | null;
                  keepSlidesInTabOrder(root);
                }}
                modules={[Autoplay, Navigation, Pagination]}
                loop
                speed={600}
                autoplay={{
                  delay: 5000,
                  disableOnInteraction: false,
                }}
                slidesPerView={1}
                spaceBetween={16}
                breakpoints={{
                  768: { slidesPerView: 2, spaceBetween: 20 },
                  1200: { slidesPerView: 3, spaceBetween: 24 },
                }}
                pagination={{
                  el: ".cardSwiper .swiperPagination",
                  type: "fraction",
                  renderFraction: function (currentClass, totalClass) {
                    return (
                      '<span class="' +
                      currentClass +
                      '"></span>' +
                      " / " +
                      '<span class="' +
                      totalClass +
                      '"></span>'
                    );
                  },
                }}
                navigation={{
                  nextEl: ".cardSwiper .btnNext",
                  prevEl: ".cardSwiper .btnPrev",
                }}
                a11y={{
                  prevSlideMessage: "이전 슬라이드",
                  nextSlideMessage: "다음 슬라이드",
                  firstSlideMessage: "첫 번째 슬라이드입니다",
                  lastSlideMessage: "마지막 슬라이드입니다",
                }}
              >
                {slidesForCarousel.map((item, idx) => {
                  const proId = String(item.proId ?? "").trim();
                  const isEmpty = !proId;
                  const badges = buildBadges(item);
                  const title = String(item.proNm ?? "").trim();
                  const from = formatYyyyMmDd(
                    String(item.recFromDd ?? "").trim(),
                  );
                  const to = formatYyyyMmDd(String(item.recToDd ?? "").trim());
                  const date =
                    from && to ? `${from} ~ ${to}` : from || to || "";
                  /** EduListSection `mapApiItemToCard`와 동일: 사업대상; 카드 본문은 홍보는 PRO_SUM 우선 */
                  const loc =
                    decodeDisplayText(String(item.proTargetNm ?? "").trim()) ||
                    "";
                  const proTypeSlide = String(item.proType ?? "").trim();
                  const isPromoSlide =
                    proTypeSlide === "03" || proTypeSlide === "홍보";
                  const proSumRaw = String(
                    item.proSum ?? item.pro_sum ?? "",
                  ).trim();
                  const etcNmRaw = String(
                    item.etcNm ?? item.etc_nm ?? "",
                  ).trim();
                  const desc =
                    decodeDisplayText(
                      isPromoSlide ? proSumRaw || etcNmRaw : etcNmRaw,
                    ) || "";
                  const { stateLabel, stateClass } =
                    cardStateLabelAndClass(item);

                  return (
                    <SwiperSlide
                      key={
                        proId ? `main-card-${proId}` : `main-card-empty-${idx}`
                      }
                      tag="article"
                      className={`cardItem${isEmpty ? " empty" : ""}`}
                    >
                      {isEmpty ? (
                        <div>
                          <img src="/images/userWeb/logo_g.png" alt="" />
                        </div>
                      ) : (
                        <>
                          <div className="cardHeader">
                            <div className="badgeArea">
                              {badges.length > 0
                                ? badges.map((b) => (
                                    <span
                                      key={`${b}-${idx}`}
                                      className={`badge ${b}`}
                                    >
                                      {badgeLabelShort(b)}
                                    </span>
                                  ))
                                : null}
                            </div>
                            <div className="cardTitle">
                              <span className="cardTitleText">
                                {stateLabel && stateClass ? (
                                  <span className={`state ${stateClass}`}>
                                    {stateLabel}
                                  </span>
                                ) : null}
                                {title}
                              </span>
                            </div>
                          </div>
                          <div className="cardBody">
                            <ul className="infoList">
                              <li className="infoDate">
                                <span className="blind">기간:</span> {date}
                              </li>
                              <li className="infoLoc">
                                <span className="blind">사업대상:</span> {loc}
                              </li>
                            </ul>
                            <p className="cardDesc">{desc}</p>
                          </div>
                        </>
                      )}
                    </SwiperSlide>
                  );
                })}
              </Swiper>

              <div className="swiperControlWrap">
                <div className="swiperPagination" aria-live="polite" />
                <div className="swiperButtons">
                  <button
                    type="button"
                    className="btnPrev"
                    title="이전 슬라이드"
                  >
                    <img src="/images/icon/ico_swiper_prev.png" alt="이전" />
                  </button>
                  <button
                    type="button"
                    className={`btnAutoPlay ${
                      isCardAutoplayPaused ? "play" : "pause"
                    }`}
                    title={
                      isCardAutoplayPaused ? "자동재생 시작" : "자동재생 정지"
                    }
                    aria-label={
                      isCardAutoplayPaused ? "자동재생 시작" : "자동재생 정지"
                    }
                    onClick={toggleCardAutoplay}
                  >
                    <img
                      src={
                        isCardAutoplayPaused
                          ? "/images/icon/ico_play.png"
                          : "/images/icon/ico_pause.png"
                      }
                      alt="정지"
                      className="icoState"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    type="button"
                    className="btnNext"
                    title="다음 슬라이드"
                  >
                    <img src="/images/icon/ico_swiper_next.png" alt="다음" />
                  </button>
                </div>
              </div>
            </div>
            {mainCardsError ? (
              <p
                className="error"
                style={{ textAlign: "center", marginTop: 12 }}
              >
                {mainCardsError}
              </p>
            ) : null}
          </div>

          <div className="curveDivider" aria-hidden="true">
            <svg
              viewBox="0 0 1440 100"
              preserveAspectRatio="none"
              focusable="false"
              aria-hidden="true"
              style={{ display: "block", width: "100%", height: "100px" }}
            >
              <path
                d="M0,120 Q0,0 120,0 L1320,0 Q1440,0 1440,120 Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        </section>

        <section className="btmInfoWrap">
          <div className="inner">
            <div className="infoWrapTxt">
              <div className="txt1">
                함께해서 더 행복한<b>홈페이지</b>
              </div>
              <div className="txt2">
                유익한 학습 자료와 다양한 소식을 전해드립니다
              </div>
            </div>

            <div className="boardWrap">
              <div className="innerContainer inner">
                <article className="boardBox notice">
                  <div className="boardHeader">
                    <div className="boardTitle">공지사항</div>
                    <a
                      href="/userWeb/community?tab=notice"
                      className="btnMore"
                      title="공지사항 더보기"
                    >
                      MORE <span className="plus">+</span>
                    </a>
                  </div>
                  <ul className="boardList">
                    {padToFive(topNoticeItems).map((item, index) => {
                      const subject = previewCellText(item.nttSj);
                      const date = previewCellText(item.ntcrDt);
                      const hasLink =
                        item.nttId != null &&
                        item.bbsId != null &&
                        item.bbsId !== "";
                      const href = hasLink
                        ? `/userWeb/community/${item.nttId ?? ""}?bbsId=${encodeURIComponent(
                            item.bbsId ?? "",
                          )}`
                        : "#";

                      return (
                        <li key={`notice-${item.nttId ?? index}`}>
                          <a
                            href={href}
                            className="boardItem"
                            style={{
                              pointerEvents: hasLink ? undefined : "none",
                              cursor: hasLink ? undefined : "default",
                            }}
                            onClick={(e) => {
                              if (!hasLink) e.preventDefault();
                            }}
                          >
                            <span className="subject">{subject}</span>
                            <span className="date">{date}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </article>

                <article className="boardBox archive">
                  <div className="boardHeader">
                    <div className="boardTitle">자료실</div>
                    <a
                      href="/userWeb/community?tab=eumArchive"
                      className="btnMore"
                      title="자료실 더보기"
                    >
                      MORE <span className="plus">+</span>
                    </a>
                  </div>
                  <ul className="boardList">
                    {padToFive(topEumArchiveItems).map((item, index) => {
                      const subject = previewCellText(item.nttSj);
                      const date = previewCellText(item.ntcrDt);
                      const hasLink =
                        item.nttId != null &&
                        item.bbsId != null &&
                        item.bbsId !== "";
                      const href = hasLink
                        ? `/userWeb/community/${item.nttId ?? ""}?bbsId=${encodeURIComponent(
                            item.bbsId ?? "",
                          )}`
                        : "#";

                      return (
                        <li key={`project-${item.nttId ?? index}`}>
                          <a
                            href={href}
                            className="boardItem"
                            style={{
                              pointerEvents: hasLink ? undefined : "none",
                              cursor: hasLink ? undefined : "default",
                            }}
                            onClick={(e) => {
                              if (!hasLink) e.preventDefault();
                            }}
                          >
                            <span className="subject">{subject}</span>
                            <span className="date">{date}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        <aside className="fixedSideMenu">
          <div
            className={`quickMenuContainer ${isQuickMenuOpen ? "active" : ""}`}
            onMouseEnter={toggleQuickMenu}
            onMouseLeave={toggleQuickMenu}
          >
            <ul
              className="quickMenuList"
              id="quickMenuList"
              aria-hidden={isQuickMenuOpen ? "false" : "true"}
            >
              <li>
                <Link href="/userWeb/schedule">
                  <img src="/images/icon/ico_schedule.png" alt="한눈에일정표" />
                  <span>한눈에 일정표</span>
                </Link>
              </li>
              <li>
                <a
                  href="https://www.edugunsan.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/images/icon/ico_jaedan.png" alt="군산시교육발전진흥재단" />
                  <span>군산시교육발전<br/>진흥재단</span>
                </a>
              </li>
              <li>
                <a
                  href="https://study.gunsan.go.kr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/images/icon/ico_study.png" alt="공부의명수" />
                  <span>공부의명수</span>
                </a>
              </li>
              <li>
                <a
                  href="https://freebus.gunsan.go.kr/userMain.do"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="/images/icon/ico_bus.png" alt="군산무상교통" />
                  <span>군산무상교통</span>
                </a>
              </li>
              <li>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <img src="/images/icon/ico_chatbot.png" alt="AI챗봇상담" />
                  <span>AI챗봇상담</span>
                </a>
              </li>
            </ul>

            <button
              type="button"
              className="btnQuickToggle"
              aria-expanded={isQuickMenuOpen ? "true" : "false"}
              aria-controls="quickMenuList"
              aria-label="퀵메뉴 열기"
              onClick={toggleQuickMenu}
            >
              <img src="/images/icon/ico_quick.png" alt="퀵메뉴" />
              <span className="btnTxt">퀵메뉴</span>
            </button>
          </div>

          <button
            type="button"
            className="btnTop"
            aria-label="페이지 맨 위로 이동"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img src="/images/icon/ico_top.png" alt="맨위로이동" />
            <span>TOP</span>
          </button>
        </aside>

        {isLoginModalOpen && loginModalType && (
          <div
            id="loginModal"
            className="modalOverlay loginModal active"
            role="dialog"
            aria-labelledby="modalTitle"
            aria-modal="true"
          >
            <div className="modalContent">
              <button
                type="button"
                className="btnClose"
                id="closeModal"
                aria-label="로그인 창 닫기"
                onClick={handleCloseModal}
              >
                <img src="/images/icon/ico_close_32.png" alt="" />
              </button>

              <div className="modalHeader">
                <div className="logo">
                  <img src="/images/logo.png" alt="군산시 꿈이음센터" />
                  <span className={LOGIN_MODAL_BADGE[loginModalType].className}>
                    {LOGIN_MODAL_BADGE[loginModalType].label}
                  </span>
                </div>
                <h1 id="modalTitle" className="modalTitle">
                  로그인
                </h1>
              </div>

              <form className="loginForm" onSubmit={handleSubmit}>
                <div className="inputGroup">
                  <label htmlFor="userId">아이디</label>
                  <input
                    type="text"
                    className="input"
                    id="userId"
                    name="id"
                    placeholder="아이디를 입력해주세요."
                    value={formData.id}
                    onChange={handleFormChange}
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>

                <div className="inputGroup">
                  <label htmlFor="userPw">비밀번호</label>
                  <input
                    type="password"
                    className="input"
                    id="userPw"
                    name="password"
                    placeholder="비밀번호를 입력해주세요."
                    value={formData.password}
                    onChange={handleFormChange}
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btnLogin mb-40"
                  disabled={loading}
                >
                  {loading ? "로그인 중..." : "로그인"}
                </button>

                <div className="formOptions">
                  <label className="checkContainer">
                    <input
                      type="checkbox"
                      id="saveId"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleFormChange}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    아이디 저장
                  </label>
                </div>

                <div className="formFooter">
                  <a href="#">아이디 찾기</a>
                  <span className="divider" aria-hidden="true">
                    |
                  </span>
                  <a href="#">비밀번호 찾기</a>
                  <span className="divider" aria-hidden="true">
                    |
                  </span>
                  <a href={`/userWeb/terms?type=${loginModalType}`}>회원가입</a>
                </div>

                <div className="snsLoginArea">
                  <div className="snsDivider">
                    <span>SNS 계정으로 로그인</span>
                  </div>
                  <div className="snsButtons">
                    <a
                      href="#"
                      className="btnSns btnNaver"
                      role="button"
                      onClick={(e) => handleOAuthClick(e, "naver")}
                      aria-disabled={!!oauthLoading}
                    >
                      <img src="/images/icon/ico_sns_naver.png" alt="네이버" />{" "}
                      네이버 로그인
                    </a>
                    <a
                      href="#"
                      className="btnSns btnKakao"
                      role="button"
                      onClick={(e) => handleOAuthClick(e, "kakao")}
                      aria-disabled={!!oauthLoading}
                    >
                      <img src="/images/icon/ico_sns_kakao.png" alt="카카오" />{" "}
                      카카오톡 로그인
                    </a>
                    {loginModalType !== "academy" &&
                    loginModalType !== "mentor" ? (
                      <a
                        href="#"
                        className="btnSns btnGoogle"
                        role="button"
                        onClick={(e) => e.preventDefault()}
                      >
                        <img
                          src="/images/icon/ico_sns_google.png"
                          alt="구글"
                        />{" "}
                        Google 로그인
                      </a>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </LayoutWrapper>
      <AlertModal
        isOpen={oauthAlertOpen}
        title="알림"
        message={oauthAlertMessage}
        type={oauthAlertType}
        onConfirm={() => setOauthAlertOpen(false)}
      />
    </>
  );
}
