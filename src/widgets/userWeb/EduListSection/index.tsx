"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/entities/auth/api";
import {
  apiClient,
  ApiError,
  decodeDisplayText,
  userWebBadgeLabelFromUrl,
  userWebNormalizeMainQueryConflict,
} from "@/shared/lib";
import { AlertModal, type AlertModalType } from "@/shared/ui/userWeb";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import {
  artpromBadgeLabel,
  artpromCardDesc,
  artpromCategoryMeta,
  artpromDateRange,
  artpromDepartment,
  artpromLocation,
  artpromNatureLabel,
  artpromTargetBadges,
  getStrArtprom,
  mainHtmlRecruitLabel,
  mainHtmlStatusPillClass,
  stateClassFromRunStaForMainHtml,
  type BadgeType,
} from "@/widgets/userWeb/eduListCard/artpromShared";

export type { BadgeType };

const BIZINFO_PATH = "/userWeb/bizInfo";
const BIZINFO_PR_PATH = "/userWeb/bizInfoPr";
/** 03 공공형 진로진학 컨설팅 전용 (지원사업과 분리) */
const BIZINFO_CT_PATH = "/userWeb/bizInfoCt";
/** 04 1:1 원어민 화상영어 전용 (Vd = Video) */
const BIZINFO_VD_PATH = "/userWeb/bizInfoVd";
/** 06 꿈틀꿈틀 우리아이 꿈탐험 전용 (Dm = Dream) */
const BIZINFO_DM_PATH = "/userWeb/bizInfoDm";
/** 05 지역연계 진로체험 활동 전용 (Rc = Regional Career) */
const BIZINFO_RC_PATH = "/userWeb/bizInfoRc";
/** 07 글로벌 문화탐방 전용 (Gc = Global Culture tour) */
const BIZINFO_GC_PATH = "/userWeb/bizInfoGc";

/** ARTPROM PRO_TYPE1~7 → 카드 배지 (gunsan main.html: 초·중·고·영·일 + 대학·기타) */
export interface EduCardItem {
  /** 복수 가능: proType1~3 초·중·고, proType4 대학, proType5 기타, proType6 영유아, proType7 일반 */
  badges: BadgeType[];
  title: string;
  href: string;
  date: string;
  location: string;
  /** 부서: 목록 API `proDepaNm`(EDR007 코드명) 우선, 없으면 `proDepa` */
  department?: string;
  desc: string;
  dateLabel?: string;
  locationLabel?: string;
  /** API proId (목록 key 및 상세 링크용) */
  proId?: string;
  /** proGb: 01=청소년(bizInfo), 02=스터디(bizInfoPr), 03=공공형 진로진학(bizInfoCt), 04=1:1 원어민(bizInfoVd), 05=지역연계 진로체험(bizInfoRc), 06=꿈틀꿈틀(bizInfoDm), 07=글로벌 문화탐방(bizInfoGc) */
  proGb?: string;
  /** 메인 HTML 카드 .bizType: proPartNm → proPart(Y|N) 파싱 → 단일 사이드바 필터 라벨 */
  natureLabel?: string;
  /** 카드 카테고리 라벨: 교육 | 지원사업 | 홍보 (일반 레이아웃 배지 옆) */
  categoryLabel?: string;
  /** 카테고리 스타일 클래스: education | biz | promo */
  categoryClass?: string;
  /** 진행상태 라벨: 공고 | 접수중 | 검토중 | 진행 | 완료 | 취소 (지원사업명 앞 표시) */
  stateLabel?: string;
  /** 진행상태 스타일 클래스: announce | accepting | review | progress | complete | cancel */
  stateClass?: string;
  /** 로그인 사용자 기준 즐겨찾기(ARTMARK), 목록 API `favoriteYn` */
  favorite?: boolean;
}

/** 교육목록 초기·추가 로드 단위 (모든 layoutMainHtml 케이스 공통) */
const PAGE_SIZE = 6;

/** API 응답 1건 (백엔드 ArtpromUserListDTO). snake_case 등 다른 키명 대비 */
interface ArtpromUserListItem {
  proId?: string;
  proGb?: string;
  proType1?: string;
  proType2?: string;
  proType3?: string;
  proType4?: string;
  proType5?: string;
  proType6?: string;
  proType7?: string;
  pro_type_4?: string;
  pro_type_5?: string;
  pro_type_6?: string;
  pro_type_7?: string;
  proType?: string;
  proNm?: string;
  proTargetNm?: string;
  etcNm?: string;
  /** 홍보(PRO_TYPE 03) 카드 요약: 관리자 「홍보문구」(PRO_SUM) */
  proSum?: string;
  recFromDd?: string;
  recToDd?: string;
  runSta?: string;
  runStaNm?: string;
  proPartNm?: string;
  /** 사업분야 파이프 (예: Y|N|N|N|N) — 목록 DTO PRO_PART */
  proPart?: string;
  /** 주관부서 코드명 (목록 DTO PRO_DEPA_NM) */
  proDepaNm?: string;
  proDepa?: string;
  /** API가 snake_case로 내려줄 때 */
  pro_id?: string;
  pro_gb?: string;
  pro_target_nm?: string;
  etc_nm?: string;
  pro_sum?: string;
  rec_from_dd?: string;
  rec_to_dd?: string;
  run_sta?: string;
  run_sta_nm?: string;
  pro_part_nm?: string;
  pro_part?: string;
  pro_depa_nm?: string;
  pro_depa?: string;
  favoriteYn?: string;
  favorite_yn?: string;
  [key: string]: unknown;
}

function getStr(item: ArtpromUserListItem, ...keys: string[]): string {
  return getStrArtprom(item as Record<string, unknown>, ...keys);
}

/** API 목록 요청 (백엔드 ArtpromUserListRequest) */
interface ArtpromUserListRequest {
  start?: number;
  length?: number;
  /** 사업대상 코드 (예: E1=초등1학년) - 헤더 학년 메뉴에서 선택 시 */
  proTarget?: string;
  /** 학교급 필터: E=초등전학년, J=중등전학년, H=고등전학년. 헤더 초/중/고 탭 클릭 시 */
  schoolGb?: string;
  /** REQ_GB 필터 위치 (1=학생, 2=학부모, 3=학원, 4=멘토, 5=학교). URL 또는 로그인 userSe로 설정 */
  reqGbPosition?: number;
  /** 포털 메인 유형 필터 — 교육사업 01, 교육 외 사업 03만. 없으면 전체 */
  listProTypes?: string[];
  /** PRO_PART 단일 위치 (1~5), 백엔드 기존 필드 */
  proPartPosition?: string;
  listRunStas?: string[];
  searchWord?: string;
}

/** API 목록 응답 (백엔드 ArtpromUserListResponse) */
interface ArtpromUserListResponse {
  data?: ArtpromUserListItem[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

function mapApiItemToCard(
  item: ArtpromUserListItem,
  typeParam: string | null,
  reqGbPosition: number | undefined,
  userSe: string | null,
  /** layoutMainHtml + 사이드바에서 사업분야 1개만 선택 시(목록 API에 성격 필드 없을 때 보조) */
  mainHtmlSingleProPartKey?: string,
): EduCardItem {
  const badges = artpromTargetBadges(item as Record<string, unknown>);
  const date = artpromDateRange(item as Record<string, unknown>);
  const proId = getStr(item, "proId", "pro_id") || "";
  const proGb = getStr(item, "proGb", "pro_gb") || "01";
  const basePath =
    proGb === "03"
      ? BIZINFO_CT_PATH
      : proGb === "04"
        ? BIZINFO_VD_PATH
        : proGb === "05"
          ? BIZINFO_RC_PATH
          : proGb === "07"
            ? BIZINFO_GC_PATH
            : proGb === "06"
              ? BIZINFO_DM_PATH
              : proGb === "02"
                ? BIZINFO_PR_PATH
                : BIZINFO_PATH;
  const params = new URLSearchParams({ proId });
  // 로그인 상태가 있으면 로그인 사용자 타입 우선, 없으면 URL 파라미터로 결정
  // userSe=SNR이면 type=student, userSe=PNR이면 type=parent
  const determinedType =
    userSe === "SNR"
      ? "student"
      : userSe === "PNR"
        ? "parent"
        : userSe === "MNR"
          ? "mentor"
          : typeParam ||
            (reqGbPosition === 2
              ? "parent"
              : reqGbPosition === 5
                ? "school"
                : reqGbPosition === 4
                  ? "mentor"
                  : reqGbPosition === 1
                    ? "student"
                    : "student");
  params.set("type", determinedType);
  // reqGbPosition이 있으면 URL에 포함 (학생/학부모 페이지에서 온 경우 배지 유지)
  if (reqGbPosition != null) {
    params.set("reqGbPosition", String(reqGbPosition));
  }
  const href = proId ? `${basePath}?${params.toString()}` : "#";
  const { categoryLabel, categoryClass } = artpromCategoryMeta(
    item as Record<string, unknown>,
  );
  const runSta = getStr(item, "runSta", "run_sta");
  const runStaNm = getStr(item, "runStaNm", "run_sta_nm");
  const natureLabel = artpromNatureLabel(
    item as Record<string, unknown>,
    mainHtmlSingleProPartKey,
  );
  /** 진행상태만 (RUN_STA_NM). 홍보도 동일 필드 사용 */
  const stateLabel = runStaNm || undefined;
  const stateClass =
    stateClassFromRunStaForMainHtml(runSta || undefined) || undefined;
  const favRaw = getStr(item, "favoriteYn", "favorite_yn").toUpperCase();
  const favorite = favRaw === "Y";
  return {
    badges,
    title: decodeDisplayText(getStr(item, "proNm", "pro_nm")),
    href,
    date,
    location: artpromLocation(item as Record<string, unknown>),
    department: artpromDepartment(item as Record<string, unknown>),
    desc: artpromCardDesc(item as Record<string, unknown>),
    proId: proId || undefined,
    proGb: proGb || undefined,
    natureLabel,
    categoryLabel,
    categoryClass,
    stateLabel: stateLabel || undefined,
    stateClass: stateClass || undefined,
    favorite,
  };
}

export interface EduListSectionProps {
  /** 비로그인 시 카드 클릭 시 호출 (로그인 모달 열기 등). 인자로 전달 시 로그인 성공 후 해당 경로로 이동 */
  onRequireLogin?: (redirectPath?: string) => void;
  /** true: source/gunsan main.html 레이아웃(교육 목록 + 하단 visual, 배지 초/중/고 등) */
  layoutMainHtml?: boolean;
}

/** URL reqGbPosition 파라미터 파싱 (1~5만 유효) */
function parseReqGbPosition(value: string | null): number | undefined {
  if (value == null) return undefined;
  const n = parseInt(value, 10);
  return n >= 1 && n <= 5 ? n : undefined;
}

const EduListSection: React.FC<EduListSectionProps> = ({
  onRequireLogin,
  layoutMainHtml = false,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grade = searchParams.get("grade") ?? undefined;
  const schoolGb = searchParams.get("schoolGb") ?? undefined;
  const typeParam = searchParams.get("type");
  const reqGbFromUrl = parseReqGbPosition(searchParams.get("reqGbPosition"));
  /** type=school 만 오는 경우(로고 등) 목록·상세 링크에 REQ_GB 5 적용 */
  const reqGbPosition =
    reqGbFromUrl ?? (typeParam === "school" ? 5 : undefined);
  const userSe = AuthService.getUserSe();

  /** source/gunsan/main.html 사이드바 PRO_PART 1~5 */
  const [sidebarPart, setSidebarPart] = useState<Record<string, boolean>>({
    "1": false,
    "2": false,
    "3": false,
    "4": false,
    "5": false,
  });
  const [bizEdu, setBizEdu] = useState(false);
  const [bizEtc, setBizEtc] = useState(false);
  const [stReady, setStReady] = useState(false);
  const [stIng, setStIng] = useState(false);
  const [stEnd, setStEnd] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchWord, setSearchWord] = useState("");

  const resetMainHtmlFilters = useCallback(() => {
    setSidebarPart({
      "1": false,
      "2": false,
      "3": false,
      "4": false,
      "5": false,
    });
    setBizEdu(false);
    setBizEtc(false);
    setStReady(false);
    setStIng(false);
    setStEnd(false);
    setSearchDraft("");
    setSearchWord("");
  }, []);

  const listProTypesForApi = useMemo((): string[] | undefined => {
    if (!layoutMainHtml) return undefined;
    const neither = !bizEdu && !bizEtc;
    if (neither || (bizEdu && bizEtc)) return undefined;
    if (bizEdu && !bizEtc) return ["01"];
    /* 교육 외 사업: PRO_TYPE 03(홍보)만 — 02(지원사업) 제외 */
    return ["03"];
  }, [layoutMainHtml, bizEdu, bizEtc]);

  const proPartPositionForApi = useMemo((): string | undefined => {
    if (!layoutMainHtml) return undefined;
    const keys = ["1", "2", "3", "4", "5"].filter((k) => sidebarPart[k]);
    return keys.length === 1 ? keys[0] : undefined;
  }, [layoutMainHtml, sidebarPart]);

  const listRunStasForApi = useMemo((): string[] | undefined => {
    if (!layoutMainHtml) return undefined;
    const r: string[] = [];
    if (stReady) r.push("01");
    if (stIng) r.push("02");
    if (stEnd) r.push("04");
    return r.length > 0 ? r : undefined;
  }, [layoutMainHtml, stReady, stIng, stEnd]);

  const searchWordForApi =
    layoutMainHtml && searchWord.trim() ? searchWord.trim() : undefined;

  const normalizedMainQuery = useMemo(
    () => userWebNormalizeMainQueryConflict(reqGbPosition, typeParam),
    [reqGbPosition, typeParam],
  );

  const preserveMainQuery = useMemo(() => {
    const q = new URLSearchParams();
    const nr = normalizedMainQuery.reqGbPosition;
    const nt = normalizedMainQuery.typeParam;
    if (nr != null) q.set("reqGbPosition", String(nr));
    if (nt) q.set("type", nt);
    if (grade) q.set("grade", grade);
    if (schoolGb) q.set("schoolGb", schoolGb);
    return q.toString();
  }, [normalizedMainQuery, grade, schoolGb]);

  const mainPathWithQuery = preserveMainQuery
    ? `/userWeb/main?${preserveMainQuery}`
    : "/userWeb/main";

  const breadcrumbRoleLabel = useMemo(
    () =>
      userWebBadgeLabelFromUrl(
        reqGbPosition !== undefined ? reqGbPosition : null,
        typeParam,
      ),
    [reqGbPosition, typeParam],
  );

  const profileImgSrc =
    breadcrumbRoleLabel === "학부모/일반"
      ? "/images/userWeb/img_profile_parent_96.png"
      : breadcrumbRoleLabel === "기관"
        ? "/images/userWeb/img_profile_school_96.png"
        : breadcrumbRoleLabel === "학원"
          ? "/images/userWeb/img_profile_academy_96.png"
          : breadcrumbRoleLabel === "멘토"
            ? "/images/userWeb/img_profile_mentor_96.png"
            : "/images/userWeb/img_profile_student_96.png";

  const toggleSidebarPart = useCallback((key: string) => {
    setSidebarPart((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const buildDetailPath = (item: EduCardItem) => {
    if (!item.proId) return undefined;
    const base =
      item.proGb === "03"
        ? BIZINFO_CT_PATH
        : item.proGb === "04"
          ? BIZINFO_VD_PATH
          : item.proGb === "05"
            ? BIZINFO_RC_PATH
            : item.proGb === "07"
              ? BIZINFO_GC_PATH
              : item.proGb === "06"
                ? BIZINFO_DM_PATH
                : item.proGb === "02"
                  ? BIZINFO_PR_PATH
                  : BIZINFO_PATH;
    const params = new URLSearchParams({ proId: item.proId });
    // 로그인 상태가 있으면 로그인 사용자 타입 우선, 없으면 URL 파라미터로 결정
    // userSe=SNR이면 type=student, userSe=PNR이면 type=parent
    const determinedType =
      userSe === "SNR"
        ? "student"
        : userSe === "PNR"
          ? "parent"
          : userSe === "MNR"
            ? "mentor"
            : typeParam ||
              (reqGbPosition === 2
                ? "parent"
                : reqGbPosition === 5
                  ? "school"
                  : reqGbPosition === 4
                    ? "mentor"
                    : reqGbPosition === 1
                      ? "student"
                      : "student");
    params.set("type", determinedType);
    // reqGbPosition이 있으면 URL에 포함 (학생/학부모 페이지에서 온 경우 배지 유지)
    if (reqGbPosition != null) {
      params.set("reqGbPosition", String(reqGbPosition));
    }
    if (grade) params.set("grade", grade);
    if (schoolGb) params.set("schoolGb", schoolGb);
    return `${base}?${params.toString()}`;
  };
  const [items, setItems] = useState<EduCardItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wishLoadingProId, setWishLoadingProId] = useState<string | null>(null);
  const [wishAlertOpen, setWishAlertOpen] = useState(false);
  const [wishAlertMessage, setWishAlertMessage] = useState("");
  const [wishAlertType, setWishAlertType] =
    useState<AlertModalType>("danger");

  const fetchPage = useCallback(
    async (start: number, append: boolean) => {
      const request: ArtpromUserListRequest = {
        start,
        length: PAGE_SIZE,
        ...(schoolGb && { schoolGb }),
        ...(grade && !schoolGb && { proTarget: grade }),
        ...(reqGbPosition != null && { reqGbPosition }),
        ...(listProTypesForApi != null &&
          listProTypesForApi.length > 0 && {
            listProTypes: listProTypesForApi,
          }),
        ...(layoutMainHtml &&
          proPartPositionForApi && {
            proPartPosition: proPartPositionForApi,
          }),
        ...(layoutMainHtml &&
          listRunStasForApi != null &&
          listRunStasForApi.length > 0 && {
            listRunStas: listRunStasForApi,
          }),
        ...(layoutMainHtml &&
          searchWordForApi && { searchWord: searchWordForApi }),
      };
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        setError(null);
        const response = await apiClient.post<ArtpromUserListResponse>(
          API_ENDPOINTS.USER_ARTPROM.LIST,
          request,
        );
        const list = Array.isArray(response?.data) ? response.data : [];
        const total =
          typeof response?.recordsTotal === "number"
            ? response.recordsTotal
            : Number(response?.recordsTotal) || 0;
        setTotalCount(total);
        const currentUserSe = AuthService.getUserSe();
        const newCards = list.map((i) =>
          mapApiItemToCard(
            i,
            typeParam,
            reqGbPosition,
            currentUserSe,
            layoutMainHtml ? proPartPositionForApi : undefined,
          ),
        );
        if (append) {
          setItems((prev) => [...prev, ...newCards]);
        } else {
          setItems(newCards);
        }
      } catch (e) {
        console.error("지원사업 목록 조회 실패:", e);
        setError("목록을 불러오지 못했습니다.");
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      grade,
      schoolGb,
      typeParam,
      reqGbPosition,
      layoutMainHtml,
      listProTypesForApi,
      proPartPositionForApi,
      listRunStasForApi,
      searchWordForApi,
    ],
  );

  useEffect(() => {
    fetchPage(0, false);
  }, [fetchPage]);

  const hasMore = items.length < totalCount;
  const currentPage = Math.ceil(items.length / PAGE_SIZE);
  const totalPages = Math.ceil(Math.max(totalCount, 1) / PAGE_SIZE);

  const handleMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextStart = items.length;
    fetchPage(nextStart, true);
  }, [hasMore, loadingMore, items.length, fetchPage]);

  const handleCardClick = (item: EduCardItem) => (e: React.MouseEvent) => {
    e.preventDefault();
    const path = buildDetailPath(item);
    if (!path) return;

    // 보기(상세 진입)는 비로그인도 허용.
    // 로그인은 각 상세 페이지의 "신청하기" 버튼에서만 요구한다.
    router.push(path);
  };

  const handleCardTitleClick =
    (item: EduCardItem) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const path = buildDetailPath(item);
      if (!path) return;

      // 보기(상세 진입)는 비로그인도 허용.
      router.push(path);
    };

  const handleWishClick =
    (item: EduCardItem) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!layoutMainHtml) return;
      const proId = item.proId;
      if (!proId || wishLoadingProId) return;
      if (!AuthService.isAuthenticated()) {
        setWishAlertMessage("로그인 후 이용해주세요.");
        setWishAlertType("success");
        setWishAlertOpen(true);
        return;
      }
      const wasFavorite = Boolean(item.favorite);
      setWishLoadingProId(proId);
      try {
        if (wasFavorite) {
          await apiClient.delete(
            API_ENDPOINTS.USER_ARTPROM.FAVORITE_BY_PRO_ID(proId),
          );
        } else {
          await apiClient.post(API_ENDPOINTS.USER_ARTPROM.FAVORITE, {
            proId,
          });
        }
        setItems((prev) =>
          prev.map((it) =>
            it.proId === proId ? { ...it, favorite: !wasFavorite } : it,
          ),
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setWishAlertMessage("로그인 후 이용해주세요.");
          setWishAlertType("success");
          setWishAlertOpen(true);
        } else {
          setWishAlertMessage(
            err instanceof ApiError
              ? err.message
              : "즐겨찾기 처리 중 오류가 발생했습니다.",
          );
          setWishAlertType("danger");
          setWishAlertOpen(true);
        }
      } finally {
        setWishLoadingProId(null);
      }
    };

  const sectionClass = "eduListWrap";
  const sectionTitleText = "지금 신청가능한 교육 목록";
  const cardsPerRow = layoutMainHtml ? 3 : 4;

  const titleBlock = (
    <div className="tit" id="sectionTitle">
      {sectionTitleText}
    </div>
  );

  const mainHtmlAside = layoutMainHtml ? (
    <aside className="stickySidebar" aria-labelledby="sidebarTitle">
      <div className="userProfile">
        <div className="profileImg">
          <img src={profileImgSrc} alt="" />
        </div>
        <span className="badgeName">{breadcrumbRoleLabel}</span>
      </div>
      <div id="sidebarTitle" className="categoryTitle">
        분야별 선택
      </div>
      <ul className="filterList">
        {[
          { id: "eduFilter", key: "1", label: "교육 / 학습" },
          { id: "careerFilter", key: "2", label: "진로 / 진학" },
          { id: "cultureFilter", key: "3", label: "문화 / 예술 / 체험" },
          { id: "welfareFilter", key: "4", label: "복지 / 장학" },
          { id: "etcFilter", key: "5", label: "기타" },
        ].map(({ id, key, label }) => (
          <li key={key} className="filterItem">
            <input
              type="checkbox"
              id={id}
              className="chkInput"
              checked={!!sidebarPart[key]}
              onChange={() => toggleSidebarPart(key)}
            />
            <label htmlFor={id} className="chkLabel">
              {label}
            </label>
          </li>
        ))}
      </ul>
    </aside>
  ) : null;

  const mainHtmlTitleRow = layoutMainHtml ? (
    <div className="flex-sb">
      <div className="tit" id="sectionTitle">
        프로그램 목록
      </div>
      <nav className="breadcrumb" aria-label="브레드크럼">
        <ol className="breadcrumbList">
          <li className="breadcrumbItem">
            <Link href={mainPathWithQuery} className="homeLink">
              <img
                src="/images/userWeb/icon/ico_home_gr.png"
                alt="홈"
                className="icoHome"
              />
              <span>홈</span>
            </Link>
          </li>
          <li className="breadcrumbItem">
            <Link href={mainPathWithQuery}>{breadcrumbRoleLabel}</Link>
          </li>
          <li className="breadcrumbItem">
            <span aria-current="page">프로그램 목록</span>
          </li>
        </ol>
      </nav>
    </div>
  ) : null;

  const mainHtmlFilterBlock = layoutMainHtml ? (
    <div className="filterSearchContainer" aria-label="프로그램 검색 및 필터">
      <div className="filterBar">
        <div className="filterGroupWrap">
          <fieldset className="filterGroup" aria-labelledby="filterBizTitle">
            <div id="filterBizTitle" className="filterTitle">
              사업종류
            </div>
            <div className="chkList">
              <div className="chkItem">
                <input
                  type="checkbox"
                  id="bizEdu"
                  className="chkInput"
                  checked={bizEdu}
                  onChange={() => setBizEdu((v) => !v)}
                />
                <label htmlFor="bizEdu" className="chkLabel">
                  교육사업
                </label>
              </div>
              <div className="chkItem">
                <input
                  type="checkbox"
                  id="bizEtc"
                  className="chkInput"
                  checked={bizEtc}
                  onChange={() => setBizEtc((v) => !v)}
                />
                <label htmlFor="bizEtc" className="chkLabel">
                  교육 외 사업
                </label>
              </div>
            </div>
          </fieldset>
          <fieldset className="filterGroup" aria-labelledby="filterStaTitle">
            <div id="filterStaTitle" className="filterTitle">
              진행상태
            </div>
            <div className="chkList">
              <div className="chkItem">
                <input
                  type="checkbox"
                  id="statusReady"
                  className="chkInput"
                  checked={stReady}
                  onChange={() => setStReady((v) => !v)}
                />
                <label htmlFor="statusReady" className="chkLabel">
                  모집예정
                </label>
              </div>
              <div className="chkItem">
                <input
                  type="checkbox"
                  id="statusIng"
                  className="chkInput"
                  checked={stIng}
                  onChange={() => setStIng((v) => !v)}
                />
                <label htmlFor="statusIng" className="chkLabel">
                  모집중
                </label>
              </div>
              <div className="chkItem">
                <input
                  type="checkbox"
                  id="statusEnd"
                  className="chkInput"
                  checked={stEnd}
                  onChange={() => setStEnd((v) => !v)}
                />
                <label htmlFor="statusEnd" className="chkLabel">
                  모집마감
                </label>
              </div>
            </div>
          </fieldset>
        </div>
        <button
          type="button"
          className="btnReset"
          aria-label="필터 초기화"
          onClick={resetMainHtmlFilters}
        />
      </div>
      <form
        className="searchBar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearchWord(searchDraft.trim());
        }}
      >
        <div className="inputWrap">
          <input
            type="search"
            placeholder="검색어를 입력해 주세요"
            title="검색어 입력"
            className="searchInput"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
          <button type="submit" className="btnSearch">
            검색
          </button>
        </div>
      </form>
    </div>
  ) : null;

  const programListContent = (
    <>
      {loading && items.length === 0 ? (
        <p className="loading">목록을 불러오는 중입니다.</p>
      ) : error && items.length === 0 ? (
        <p className="error">{error}</p>
      ) : layoutMainHtml && !loading && !loadingMore && !error && items.length === 0 ? (
        <p className="eduListFilterEmpty" role="status">
          조건에 맞는 프로그램이 없습니다.
        </p>
      ) : (
        <div className="cardGrid">
            {items.map((item, index) => (
              <article
                key={item.proId ?? `item-${index}`}
                className="cardItem is-clickable"
                onClick={handleCardClick(item)}
              >
                {layoutMainHtml ? (
                  <>
                    <div className="cardHeader">
                      <div className="headLeft">
                        <div className="bizType">
                          {item.natureLabel?.trim()
                            ? item.natureLabel
                            : "-"}
                        </div>
                        {mainHtmlRecruitLabel(item.stateLabel) ? (
                          <div
                            className={`status ${mainHtmlStatusPillClass(item.stateClass)}`}
                          >
                            {mainHtmlRecruitLabel(item.stateLabel)}
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={`btnWish${item.favorite ? " isFavorite" : ""}`}
                        aria-label={
                          item.favorite
                            ? "즐겨찾기 해제"
                            : "즐겨찾기 추가"
                        }
                        aria-pressed={item.favorite}
                        disabled={wishLoadingProId === item.proId}
                        onClick={handleWishClick(item)}
                      >
                        <span className="icoStar" />
                      </button>
                    </div>
                    <div className="cardBody">
                      <div className="cardTitle">
                        <a href={item.href} onClick={handleCardTitleClick(item)}>
                          {item.title}
                        </a>
                      </div>
                      <ul className="infoList">
                        <li className="infoDate">
                          <span>기간</span> {item.date}
                        </li>
                        <li className="infoPeople">
                          <span>대상</span>
                          <div className="badgeArea age">
                            {item.badges.length > 0
                              ? item.badges.map((badge, bi) => (
                                  <span key={`${badge}-${bi}`} className={`badge ${badge}`}>
                                    {artpromBadgeLabel(badge, true)}
                                  </span>
                                ))
                              : null}
                          </div>
                          {item.location ? <div className="moreInfo">{item.location}</div> : null}
                        </li>
                        <li className="infoCompany">
                          <span>부서</span>
                          {item.department || "-"}
                        </li>
                      </ul>
                      <p className="cardDesc">{item.desc}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="cardHeader">
                      <div className="badgeArea">
                        {item.badges.length > 0 ? (
                          item.badges.map((badge, bi) => (
                            <span
                              key={`${badge}-${bi}`}
                              className={`badge ${badge}`}
                            >
                              {artpromBadgeLabel(badge, layoutMainHtml)}
                            </span>
                          ))
                        ) : null}
                        {!layoutMainHtml && item.categoryLabel && (
                          <span
                            className={`cardCategory ${item.categoryClass ?? "biz"}`}
                            aria-hidden
                          >
                            {item.categoryLabel}
                          </span>
                        )}
                      </div>
                      <div className="cardTitle">
                        <a
                          href={item.href}
                          onClick={handleCardTitleClick(item)}
                        >
                          {item.stateLabel && item.stateClass && (
                            <span
                              className={`state ${item.stateClass}`}
                              aria-hidden
                            >
                              {item.stateLabel}
                            </span>
                          )}
                          {item.title}
                        </a>
                      </div>
                    </div>
                    <div className="cardBody">
                      <ul className="infoList">
                        <li className="infoDate">
                          {item.dateLabel != null ? (
                            <>
                              <span className="blind">{item.dateLabel}</span>{" "}
                              {item.date}
                            </>
                          ) : layoutMainHtml ? (
                            <>
                              <span className="blind">기간:</span> {item.date}
                            </>
                          ) : (
                            item.date
                          )}
                        </li>
                        <li className="infoLoc">
                          {item.locationLabel != null ? (
                            <>
                              <span className="blind">{item.locationLabel}</span>{" "}
                              {item.location}
                            </>
                          ) : layoutMainHtml ? (
                            <>
                              <span className="blind">장소:</span> {item.location}
                            </>
                          ) : (
                            item.location
                          )}
                        </li>
                      </ul>
                      <p className="cardDesc">{item.desc}</p>
                    </div>
                  </>
                )}
              </article>
            ))}
            {(() => {
              const totalSlots =
                items.length === 0
                  ? cardsPerRow
                  : Math.ceil(items.length / cardsPerRow) * cardsPerRow;
              const emptyCount = totalSlots - items.length;
              return Array.from({ length: emptyCount }, (_, i) => (
                <article
                  key={`empty-${i}`}
                  className="cardItem empty"
                  aria-hidden="true"
                >
                  <div>
                    <img src="/images/userWeb/logo_g.png" alt="" />
                  </div>
                </article>
              ));
            })()}
        </div>
      )}
      <div className="moreArea">
        {hasMore && (
          <button
            type="button"
            className="btnMore"
            onClick={handleMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              "불러오는 중..."
            ) : (
              <>
                <span className="current">{currentPage}</span>/
                <span className="total">{totalPages}</span> 더보기
              </>
            )}
          </button>
        )}
      </div>
    </>
  );

  if (layoutMainHtml) {
    return (
      <>
        <section className="flex-content">
          {mainHtmlAside}
          <section className="eduListWrap eduListWrap--mainHtml">
            {mainHtmlTitleRow}
            {mainHtmlFilterBlock}
            <div className="cardSection" aria-labelledby="sectionTitle">
              {programListContent}
            </div>
          </section>
        </section>
        <div className="visual" aria-hidden="true" />
        <AlertModal
          isOpen={wishAlertOpen}
          title="안내"
          message={wishAlertMessage}
          type={wishAlertType}
          confirmText="확인"
          onConfirm={() => setWishAlertOpen(false)}
        />
      </>
    );
  }

  if (loading && items.length === 0) {
    return (
      <section className={sectionClass}>
        <div className="inner">
          {titleBlock}
          <div className="cardSection" aria-labelledby="sectionTitle">
            <p className="loading">목록을 불러오는 중입니다.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error && items.length === 0) {
    return (
      <section className={sectionClass}>
        <div className="inner">
          {titleBlock}
          <div className="cardSection" aria-labelledby="sectionTitle">
            <p className="error">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      <div className="inner">
        {titleBlock}
        <div className="cardSection" aria-labelledby="sectionTitle">
          {programListContent}
        </div>
      </div>
    </section>
  );
};

export default EduListSection;
