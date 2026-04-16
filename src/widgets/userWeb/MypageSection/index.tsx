"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, ApiError, decodeDisplayText } from "@/shared/lib";
import { API_ENDPOINTS, API_CONFIG } from "@/shared/config/apiUser";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AuthService } from "@/entities/auth/api";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import type { ArmuserDetailResponse } from "@/entities/adminWeb/armuser/api";
import {
  UserArmchilService,
  type ArmchilChildDTO,
} from "@/entities/userWeb/armchil/api";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import { AlertModal, ConfirmModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import JoinStudentSection from "@/widgets/userWeb/JoinStudentSection";
import JoinParentSection from "@/widgets/userWeb/JoinParentSection";
import JoinAcSection from "@/widgets/userWeb/JoinAcSection";
import JoinMentorSection from "@/widgets/userWeb/JoinMentorSection";
import {
  artpromBadgeLabel,
  artpromCardDesc,
  artpromDateRange,
  artpromDepartment,
  artpromLocation,
  artpromNatureLabel,
  artpromTargetBadges,
  buildArtpromBrowseDetailHref,
  getStrArtprom,
  mainHtmlRecruitLabel,
  mainHtmlStatusPillClass,
  stateClassFromRunStaForMainHtml,
} from "@/widgets/userWeb/eduListCard/artpromShared";

/** 일반 지원사업 신청/수정 페이지 (MY PAGE 신청현황에서 해당 신청 건으로 바로 이동) */
const BIZINPUT_PATH = "/userWeb/bizInput";
/** 공부의 명수(proGb 08·09) — MY PAGE에서는 신청 내역 조회·임시저장(01) 수정용 bizInputGstudy */
const BIZINPUT_GSTUDY_PATH = "/userWeb/bizInputGstudy";
/** 멘토 + 공부의 명수 온라인 튜터링(08) — MY PAGE 멘토 신청(ARTAPMM) 카드 링크 */
const BIZINPUT_GSTUDY_MENTOR_PATH = "/userWeb/bizInputGstudyMentor";
/** 멘토 + 공부의 명수 인생등대(09) */
const BIZINPUT_GSTUDY_MENTOR_LIGHTHOUSE_PATH =
  "/userWeb/bizInputGstudyMentorLighthouse";
/** 스터디 사업 신청/수정 페이지 (MY PAGE 신청현황에서 해당 신청 건으로 바로 이동) */
const BIZINPUT_PR_PATH = "/userWeb/bizInputPr";
/** 지역연계 진로체험 활동(05) 신청/수정 페이지 */
const BIZINPUT_RC_PATH = "/userWeb/bizInputRc";
/** 글로벌 문화탐방(07) 신청/수정 페이지 */
const BIZINPUT_GC_PATH = "/userWeb/bizInputGc";
/** 공공형 진로진학 컨설팅(03) 신청/수정 페이지 */
const BIZINPUT_CT_PATH = "/userWeb/bizInputCt";
/** 1:1 원어민 화상영어(04) 신청/수정 페이지 (Vd = Video) */
const BIZINPUT_VD_PATH = "/userWeb/bizInputVd";
/** 꿈틀꿈틀 우리아이 꿈탐험(06) 신청/수정 페이지 (Dm = Dream) */
const BIZINPUT_DM_PATH = "/userWeb/bizInputDm";

/** API 내 신청 목록 1건 (ArtpromUserListDTO, 신청 1건당 1행) */
interface MyAppliedItem {
  proId?: string;
  proGb?: string;
  reqId?: string;
  proSeq?: string;
  reqEsntlId?: string;
  proType1?: string;
  proType2?: string;
  proType3?: string;
  proType4?: string;
  proType5?: string;
  proType6?: string;
  proType7?: string;
  proType?: string;
  proNm?: string;
  proTargetNm?: string;
  etcNm?: string;
  recFromDd?: string;
  recToDd?: string;
  proSum?: string;
  /** 메인 목록과 동일: EDR007 코드명 우선 */
  proDepaNm?: string;
  proDepa?: string;
  proPart?: string;
  proPartNm?: string;
  appSttusCode?: string;
  appSttusCodeNm?: string;
  /** 신청자(학생)명 */
  reqUserNm?: string;
  /** 선정여부 N=미선정, Y=선정, R=예비 */
  resultGb?: string;
  [key: string]: unknown;
}

/** ARTAPPM(학생·학부모 등) 신청 상태 필터 */
const STTUS_CODE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "01", label: "임시저장" },
  { value: "02", label: "신청" },
  { value: "03", label: "승인" },
  { value: "04", label: "반려" },
  { value: "05", label: "중단" },
  { value: "99", label: "취소" },
];

/** ARTAPMM(멘토 신청) 상태 필터 — 백엔드 `selectMyAppliedArtpromListMentor`와 동일 코드 */
const STTUS_CODE_OPTIONS_MENTOR: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "01", label: "임시저장" },
  { value: "02", label: "신청" },
  { value: "03", label: "승인" },
  { value: "04", label: "완료" },
  { value: "11", label: "반려" },
  { value: "12", label: "중단" },
  { value: "99", label: "취소" },
];

/** appSttusCode → 카드 state 클래스 (ing/active/temp/approve/reject/stop/cancel) — ARTAPPM */
function stateClassFromSttus(code: string | undefined): string {
  if (!code) return "";
  switch (code) {
    case "01":
      return "temp";
    case "02":
      return "active";
    case "03":
      return "approve";
    case "04":
      return "reject";
    case "05":
      return "stop";
    case "99":
      return "cancel";
    default:
      return "";
  }
}

/** ARTAPMM(멘토) 신청 상태 → 카드 pill용 클래스 (04=완료, 11=반려, 12=중단) */
function stateClassFromSttusMentor(code: string | undefined): string {
  if (!code) return "";
  switch (code) {
    case "01":
      return "temp";
    case "02":
      return "active";
    case "03":
      return "approve";
    case "04":
      return "approve";
    case "11":
      return "reject";
    case "12":
      return "stop";
    case "99":
      return "cancel";
    default:
      return "";
  }
}

/**
 * 메인 `layoutMainHtml` 카드 상단 `.status`(모집 pill) 마크업과 동일 클래스.
 * MY PAGE는 공고 RUN_STA 대신 **신청 상태**(appSttusCodeNm)만 표시.
 */
function mypageAppStatusHeaderPillClass(stateCls: string): string {
  if (stateCls === "active") return "statusIng";
  if (stateCls === "approve" || stateCls === "temp") return "statusReady";
  return "statusEnd";
}

/** resultGb → 선정/미선정/예비 표시 클래스 및 라벨 */
function resultDisplayFromGb(gb: string | undefined): {
  cls: string;
  label: string;
} {
  if (gb === "Y") return { cls: "select", label: "[선정]" };
  if (gb === "R") return { cls: "wait", label: "[예비]" };
  return { cls: "unselect", label: "[미선정]" };
}

/** MY PAGE 신청 카드 — 선정/미선정/예비 배지는 이 proGb만 사용 (청소년 자기계발 연수·1:1 원어민 화상영어) */
const PRO_GB_SHOW_RESULT_SELECTION = new Set(["01", "04"]);

function shouldShowResultSelectionBadge(proGb: string): boolean {
  return PRO_GB_SHOW_RESULT_SELECTION.has(proGb.trim());
}

interface MyAppliedListResponse {
  data?: MyAppliedItem[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

/** MY PAGE 즐겨찾기 — `ArtpromUserListDTO` 행 (메인 목록과 동형) */
interface MyFavoriteListResponse {
  data?: Record<string, unknown>[];
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

function getStr(item: MyAppliedItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v != null && typeof v === "string") return v.trim();
    if (v != null && typeof v === "number") return String(v);
  }
  return "";
}

/** 신청현황 카드 링크: proGb 08·09=bizInputGstudy(공부의 명수 신청내역), 02=bizInputPr, 05=bizInputRc, 07=bizInputGc, 03=bizInputCt, 04=bizInputVd, 06=bizInputDm, 그 외=bizInput. reqEsntlId 있으면 전달해 해당 자녀 신청 폼 로드 */
function getDetailHref(
  item: MyAppliedItem,
  themeType?: string | null,
): string {
  const proId = getStr(item, "proId");
  if (!proId) return "#";
  let proGb = getStr(item, "proGb");
  const proNm = getStr(item, "proNm");
  /** proGb 누락/오류 시 proNm으로 글로벌 문화탐방(07) 보정 — 마이페이지 상세가 올바른 폼으로 표시되도록 */
  if (
    (proGb !== "07" && proGb !== "7") &&
    (proNm.includes("글로벌") || proNm.includes("문화탐방"))
  ) {
    proGb = "07";
  }
  const base =
    proGb === "03"
      ? BIZINPUT_CT_PATH
      : proGb === "04"
        ? BIZINPUT_VD_PATH
        : proGb === "06"
          ? BIZINPUT_DM_PATH
          : proGb === "05"
            ? BIZINPUT_RC_PATH
            : proGb === "07" || proGb === "7"
              ? BIZINPUT_GC_PATH
              : proGb === "02"
                ? BIZINPUT_PR_PATH
                : proGb === "08" || proGb === "09"
                  ? themeType === "mentor"
                    ? proGb === "09"
                      ? BIZINPUT_GSTUDY_MENTOR_LIGHTHOUSE_PATH
                      : BIZINPUT_GSTUDY_MENTOR_PATH
                    : BIZINPUT_GSTUDY_PATH
                  : BIZINPUT_PATH;
  const params = new URLSearchParams({ proId });
  if (proGb) params.set("proGb", proGb === "7" ? "07" : proGb);
  params.set("from", "mypage");
  /** 로그인 사용자 유형에 맞게 학생/학부모·멘토 양식 링크 — 학생 마이페이지에서 학부모 폼이 뜨는 문제 방지 */
  if (themeType === "student") {
    params.set("reqGbPosition", "1");
  } else if (themeType === "parent") {
    params.set("type", "parent");
  } else if (themeType === "mentor") {
    params.set("reqGbPosition", "4");
    params.set("type", "mentor");
  }
  const reqId = getStr(item, "reqId");
  if (reqId) params.set("reqId", reqId);
  const reqEsntlId = getStr(item, "reqEsntlId");
  if (reqEsntlId) params.set("reqEsntlId", reqEsntlId);
  return `${base}?${params.toString()}`;
}

const IMG = "/images/userWeb";

/** 주민번호 표시용: 숫자만 13자리, 7번째 자리 앞에 하이픈 (admin 학생등록과 동일) */
function formatResidentIdForDisplay(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}
/** 주민번호 마스킹: 앞 7자리만 노출, 뒤 6자리 * (admin 학생등록과 동일) */
function formatResidentIdMasked(value: string): string {
  const digits = (value || "").replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 6) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits[6]}******`;
}

/** userPicFiles[0]으로 프로필 이미지 URL 생성 (fileId는 string 유지 - user-web 규칙) */
function getChildProfileImageUrl(child: ArmchilChildDTO): string | null {
  const pic = child.userPicFiles?.[0];
  if (!pic || pic.fileId == null || pic.seq == null) return null;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
  const path = API_ENDPOINTS.FILES.VIEW;
  const url = base ? `${base}${path}` : path;
  return `${url}?fileId=${encodeURIComponent(String(pic.fileId))}&seq=${encodeURIComponent(String(pic.seq))}`;
}

/**
 * mypage_pr.html → React 변환
 * 원본: source/gunsan/mypage_pr.html
 * 클래스명·id·접근성(.blind, aria 등) 원본 유지
 * 신청현황 탭: 내 신청 목록 API — 멘토는 `my-applied/mentor/list`(ARTAPMM), 그 외는 `my-applied/list`(ARTAPPM). 카드 UI(한 줄 3개) 유지
 * 즐겨찾기 탭: `POST /api/user/artprom/my-favorite/list` + 메인 `layoutMainHtml` 카드와 동일 마크업, 별 클릭 시 DELETE 후 목록에서 제거
 * 자녀연동 탭: 학부모 로그인 시에만 표시 (source mypage_pr.html content_kids + regCertModal)
 */
export default function MypageSection() {
  const router = useRouter();
  const auth = useUserWebAuthOptional();
  const isParent = Boolean(
    auth?.isAuthenticated && auth?.themeType === "parent",
  );

  const [activeTab, setActiveTab] = useState<
    "info" | "status" | "favorites" | "kids"
  >("info");
  const [appliedList, setAppliedList] = useState<MyAppliedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /**
   * 신청현황 상태 필터
   * - 학생·학부모 등: ARTAPPM — 04=반려, 05=중단
   * - 멘토: ARTAPMM — 04=완료, 11=반려, 12=중단
   */
  const [statusFilter, setStatusFilter] = useState<string>("");

  /** 나의정보: 로그인 사용자 상세 조회 */
  const [detailResponse, setDetailResponse] =
    useState<ArmuserDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  /** 나의정보 갱신 트리거 (사진 삭제 등 후 상세 재조회) */
  const [detailVersion, setDetailVersion] = useState(0);

  /** 자녀연동: API로 조회한 자녀 목록 */
  const [kidsList, setKidsList] = useState<ArmchilChildDTO[]>([]);
  const [kidsLoading, setKidsLoading] = useState(false);
  const [kidsError, setKidsError] = useState<string | null>(null);
  const [kidsDeleteLoading, setKidsDeleteLoading] = useState(false);
  const [showRegCertModal, setShowRegCertModal] = useState(false);
  const [certName, setCertName] = useState("");
  const [certNum, setCertNum] = useState("");
  const [certSex, setCertSex] = useState<"M" | "F">("M");
  const [certId, setCertId] = useState("");
  const [certIdFocused, setCertIdFocused] = useState(false);
  const [regCertSubmitLoading, setRegCertSubmitLoading] = useState(false);
  const [regCertError, setRegCertError] = useState<string | null>(null);
  /** 알림 모달 (자녀등록/삭제 결과 등) */
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("success");
  const alertConfirmRef = useRef<(() => void) | null>(null);
  /** 알림 확인 후 포커스할 요소 id (자녀등록 유효성 실패 시) */
  const focusAfterAlertRef = useRef<string | null>(null);
  /** 삭제 확인 모달 */
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetChild, setDeleteTargetChild] =
    useState<ArmchilChildDTO | null>(null);

  /** 즐겨찾기 탭: ARTMARK 기준 목록 (메인 카드와 동일 DTO) */
  const [favoritesList, setFavoritesList] = useState<Record<string, unknown>[]>(
    [],
  );
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState<string | null>(null);
  const [favWishLoadingProId, setFavWishLoadingProId] = useState<string | null>(
    null,
  );

  const isMentorTheme = auth?.themeType === "mentor";
  const statusFilterOptions = useMemo(
    () => (isMentorTheme ? STTUS_CODE_OPTIONS_MENTOR : STTUS_CODE_OPTIONS),
    [isMentorTheme],
  );

  /** 멘토 ↔ 그 외 전환 시 ARTAPPM/ARTAPMM 코드 체계가 달라 필터 초기화 */
  useEffect(() => {
    setStatusFilter("");
  }, [isMentorTheme]);

  const fetchMyAppliedList = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const body: { sttusCode?: string } = {};
      if (statusFilter.trim() !== "") body.sttusCode = statusFilter.trim();
      const url = isMentorTheme
        ? API_ENDPOINTS.USER_ARTPROM.MY_APPLIED_MENTOR_LIST
        : API_ENDPOINTS.USER_ARTPROM.MY_APPLIED_LIST;
      const response = await apiClient.post<MyAppliedListResponse>(url, body);
      const list = Array.isArray(response?.data) ? response.data : [];
      setAppliedList(list);
    } catch (e) {
      console.error("내 신청 목록 조회 실패:", e);
      setLoadError("목록을 불러오지 못했습니다.");
      setAppliedList([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, isMentorTheme]);

  useEffect(() => {
    if (activeTab === "status") {
      fetchMyAppliedList();
    }
  }, [activeTab, fetchMyAppliedList]);

  const fetchFavoritesList = useCallback(async () => {
    setFavLoading(true);
    setFavError(null);
    try {
      const response = await apiClient.post<MyFavoriteListResponse>(
        API_ENDPOINTS.USER_ARTPROM.MY_FAVORITE_LIST,
        { start: 0, length: 200 },
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      setFavoritesList(list);
    } catch (e) {
      console.error("즐겨찾기 목록 조회 실패:", e);
      setFavError("목록을 불러오지 못했습니다.");
      setFavoritesList([]);
    } finally {
      setFavLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "favorites" && auth?.isAuthenticated) {
      fetchFavoritesList();
    }
  }, [activeTab, auth?.isAuthenticated, fetchFavoritesList]);

  const browseThemeForFavorites:
    | "student"
    | "parent"
    | "academy"
    | "mentor"
    | undefined = auth?.themeType;

  const handleFavoriteCardNavigate = useCallback(
    (row: Record<string, unknown>) => {
      const proId = getStrArtprom(row, "proId", "pro_id");
      if (!proId) return;
      const proGb = getStrArtprom(row, "proGb", "pro_gb");
      const href = buildArtpromBrowseDetailHref(
        proId,
        proGb || undefined,
        browseThemeForFavorites,
      );
      router.push(href);
    },
    [router, browseThemeForFavorites],
  );

  const handleFavoriteStarClick = useCallback(
    (row: Record<string, unknown>) => async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const proId = getStrArtprom(row, "proId", "pro_id");
      if (!proId || favWishLoadingProId) return;
      setFavWishLoadingProId(proId);
      try {
        await apiClient.delete(
          API_ENDPOINTS.USER_ARTPROM.FAVORITE_BY_PRO_ID(proId),
        );
        setFavoritesList((prev) =>
          prev.filter(
            (r) => getStrArtprom(r, "proId", "pro_id") !== proId,
          ),
        );
      } catch (err) {
        setAlertTitle("안내");
        setAlertMessage(
          err instanceof ApiError
            ? err.message
            : "즐겨찾기 해제 중 오류가 발생했습니다.",
        );
        setAlertType("danger");
        setShowAlertModal(true);
      } finally {
        setFavWishLoadingProId(null);
      }
    },
    [favWishLoadingProId],
  );

  /** 나의정보 탭 + 로그인 시 본인 상세 조회 (esntlId로 GET /api/user/armuser/{esntlId}) */
  useEffect(() => {
    if (activeTab !== "info" || !auth?.isAuthenticated) {
      setDetailResponse(null);
      setDetailError(null);
      return;
    }
    const esntlId = AuthService.getEsntlId();
    if (!esntlId || esntlId.trim() === "") {
      setDetailResponse(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    UserArmuserService.getDetail(esntlId)
      .then((res) => {
        if (!cancelled) {
          setDetailResponse(res);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("나의정보 상세 조회 실패:", err);
          setDetailError(
            err?.message ?? "회원 정보를 불러오는 중 오류가 발생했습니다.",
          );
          setDetailResponse(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, auth?.isAuthenticated, detailVersion]);

  /** 자녀연동: 학부모 + kids 탭일 때 목록 조회 */
  const fetchKids = useCallback(async () => {
    if (!isParent) return;
    setKidsLoading(true);
    setKidsError(null);
    try {
      const res = await UserArmchilService.getChildren();
      const data = res?.data ?? [];
      setKidsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("자녀 목록 조회 실패:", e);
      setKidsError(
        e instanceof Error
          ? e.message
          : "자녀 목록을 불러오는 중 오류가 발생했습니다.",
      );
      setKidsList([]);
    } finally {
      setKidsLoading(false);
    }
  }, [isParent]);

  useEffect(() => {
    if (isParent && activeTab === "kids") {
      fetchKids();
    }
  }, [isParent, activeTab, fetchKids]);

  /** 학부모가 아닐 때 kids 탭이 선택된 상태면 info로 전환 */
  useEffect(() => {
    if (!isParent && activeTab === "kids") {
      setActiveTab("info");
    }
  }, [isParent, activeTab]);

  const openRegCertModal = useCallback(() => {
    setRegCertError(null);
    setShowRegCertModal(true);
  }, []);
  const closeRegCertModal = useCallback(() => {
    setShowRegCertModal(false);
    setCertName("");
    setCertNum("");
    setCertSex("M");
    setCertId("");
    setCertIdFocused(false);
    setRegCertError(null);
  }, []);

  const handleKidsDeleteClick = useCallback(
    (child: ArmchilChildDTO) => {
      if (!child.esntlId || kidsDeleteLoading) return;
      setDeleteTargetChild(child);
      setShowDeleteConfirmModal(true);
    },
    [kidsDeleteLoading],
  );

  const handleDeleteConfirmCancel = useCallback(() => {
    setShowDeleteConfirmModal(false);
    setDeleteTargetChild(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const child = deleteTargetChild;
    if (!child?.esntlId) {
      handleDeleteConfirmCancel();
      return;
    }
    setKidsDeleteLoading(true);
    setShowDeleteConfirmModal(false);
    setDeleteTargetChild(null);
    try {
      await UserArmchilService.deleteChildLink(child.esntlId);
      await fetchKids();
      setAlertTitle("삭제 완료");
      setAlertMessage("연동이 삭제되었습니다.");
      setAlertType("success");
      setShowAlertModal(true);
    } catch (e) {
      console.error("자녀 연동 삭제 실패:", e);
      setAlertTitle("삭제 실패");
      setAlertMessage(
        e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.",
      );
      setAlertType("danger");
      setShowAlertModal(true);
    } finally {
      setKidsDeleteLoading(false);
    }
  }, [deleteTargetChild, fetchKids, handleDeleteConfirmCancel]);

  /** 자녀등록 모달에서 등록하기 클릭 → POST /api/user/armchil/children (ArmchilUserController.linkChild) */
  const handleRegCertSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const name = certName.trim();
      const num = certNum.trim().replace(/\D/g, "");
      const id = certId.trim().replace(/\D/g, "");

      if (!name) {
        focusAfterAlertRef.current = "certName";
        setAlertTitle("안내");
        setAlertMessage("학생명을 입력해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      if (!num) {
        focusAfterAlertRef.current = "certNum";
        setAlertTitle("안내");
        setAlertMessage("연락처를 입력해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      if (num.length < 9 || num.length > 11) {
        focusAfterAlertRef.current = "certNum";
        setAlertTitle("안내");
        setAlertMessage("연락처는 9~11자리 숫자로 입력해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      if (!certSex || (certSex !== "M" && certSex !== "F")) {
        focusAfterAlertRef.current = "certSexM";
        setAlertTitle("안내");
        setAlertMessage("성별을 선택해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      if (!id) {
        focusAfterAlertRef.current = "certId";
        setAlertTitle("안내");
        setAlertMessage("주민등록번호를 입력해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }
      if (id.length !== 13) {
        focusAfterAlertRef.current = "certId";
        setAlertTitle("안내");
        setAlertMessage("주민등록번호 13자리를 입력해 주세요.");
        setAlertType("danger");
        setShowAlertModal(true);
        return;
      }

      setRegCertSubmitLoading(true);
      try {
        const res = await UserArmchilService.linkChild({
          userNm: name,
          sexdstnCode: certSex,
          mbtlnum: num,
          ihidnum: id,
        });
        if (res?.result === "00") {
          closeRegCertModal();
          await fetchKids();
          setAlertTitle("등록 완료");
          setAlertMessage("등록되었습니다.");
          setAlertType("success");
          alertConfirmRef.current = null;
          setShowAlertModal(true);
        } else {
          setAlertTitle("자녀 연동 등록");
          setAlertMessage(
            res?.message ?? "해당 자녀가 없습니다. 입력 정보를 확인해 주세요.",
          );
          setAlertType("danger");
          setShowAlertModal(true);
        }
      } catch (err) {
        console.error("자녀 연동 등록 실패:", err);
        setAlertTitle("자녀 연동 등록");
        setAlertMessage(
          err instanceof Error
            ? err.message
            : "자녀 연동 등록 중 오류가 발생했습니다.",
        );
        setAlertType("danger");
        setShowAlertModal(true);
      } finally {
        setRegCertSubmitLoading(false);
      }
    },
    [certName, certNum, certSex, certId, closeRegCertModal, fetchKids],
  );

  const handleAlertConfirm = useCallback(() => {
    alertConfirmRef.current?.();
    alertConfirmRef.current = null;
    setShowAlertModal(false);
    const focusId = focusAfterAlertRef.current;
    focusAfterAlertRef.current = null;
    if (focusId) {
      requestAnimationFrame(() => {
        document.getElementById(focusId)?.focus();
      });
    }
  }, []);

  return (
    <section className="inner">
      <div className="mainTitle">MY PAGE</div>
      <div className="mainBg">
        <div className="tabWrapper" role="radiogroup" aria-label="MY PAGE 메뉴">
          <label className="tabLabel">
            <input
              type="radio"
              name="mypageMenu"
              value="info"
              className="tabInput"
              checked={activeTab === "info"}
              onChange={() => setActiveTab("info")}
            />
            <div className="tabButton">
              <span
                className="iconCheck ico_radio_check_on"
                aria-hidden="true"
              />
              <span>나의정보</span>
            </div>
          </label>
          <label className="tabLabel">
            <input
              type="radio"
              name="mypageMenu"
              value="status"
              className="tabInput"
              checked={activeTab === "status"}
              onChange={() => setActiveTab("status")}
            />
            <div className="tabButton">
              <span
                className="iconCheck ico_radio_check_off"
                aria-hidden="true"
              />
              <span>신청현황</span>
            </div>
          </label>
          <label className="tabLabel">
            <input
              type="radio"
              name="mypageMenu"
              value="favorites"
              className="tabInput"
              checked={activeTab === "favorites"}
              onChange={() => setActiveTab("favorites")}
            />
            <div className="tabButton">
              <span
                className="iconCheck ico_radio_check_off"
                aria-hidden="true"
              />
              <span>즐겨찾기</span>
            </div>
          </label>
          {isParent && (
            <label className="tabLabel">
              <input
                type="radio"
                name="mypageMenu"
                value="kids"
                className="tabInput"
                checked={activeTab === "kids"}
                onChange={() => setActiveTab("kids")}
              />
              <div className="tabButton">
                <span
                  className="iconCheck ico_radio_check_off"
                  aria-hidden="true"
                />
                <span>자녀연동</span>
              </div>
            </label>
          )}
        </div>

        <div
          id="content_info"
          className={`tabContent ${activeTab === "info" ? "active" : ""}`}
        >
          <div className="titRow">
            <div className="tit">기본 정보 수정</div>
            {!detailLoading &&
              detailResponse?.detail &&
              ["student", "parent", "academy", "mentor"].includes(
                auth?.themeType ?? "",
              ) && (
                <span
                  className={`joinStatus ${
                    detailResponse.detail.mberSttus === "P"
                      ? "join"
                      : detailResponse.detail.mberSttus === "D"
                        ? "out"
                        : "register"
                  }`}
                  role="status"
                >
                  {detailResponse.detail.mberSttus === "P"
                    ? "사용"
                    : detailResponse.detail.mberSttus === "D"
                      ? "탈퇴"
                      : "신청"}
                </span>
              )}
          </div>
          {detailLoading && (
            <p className="loading">회원 정보를 불러오는 중입니다.</p>
          )}
          {detailError && !detailLoading && (
            <p className="error">{detailError}</p>
          )}
          {auth?.themeType === "student" && !detailLoading && (
            <JoinStudentSection
              mode="mypage"
              initialData={detailResponse ?? undefined}
              onDetailUpdated={() => setDetailVersion((v) => v + 1)}
            />
          )}
          {auth?.themeType === "parent" && !detailLoading && (
            <JoinParentSection
              mode="mypage"
              initialData={detailResponse ?? undefined}
              onDetailUpdated={() => setDetailVersion((v) => v + 1)}
            />
          )}
          {auth?.themeType === "academy" && !detailLoading && (
            <JoinAcSection
              mode="mypage"
              initialData={detailResponse ?? undefined}
              onDetailUpdated={() => setDetailVersion((v) => v + 1)}
            />
          )}
          {auth?.themeType === "mentor" && !detailLoading && (
            <JoinMentorSection
              initialData={detailResponse ?? undefined}
              onDetailUpdated={() => setDetailVersion((v) => v + 1)}
            />
          )}
          {auth?.isAuthenticated &&
            !["student", "parent", "academy", "mentor"].includes(
              auth?.themeType ?? "",
            ) && (
              <div className="infoPlaceholder">
                나의정보를 불러올 수 없습니다.
              </div>
            )}
          {!auth?.isAuthenticated && (
            <div className="infoPlaceholder">로그인이 필요합니다.</div>
          )}
        </div>

        <div
          id="content_status"
          className={`tabContent ${activeTab === "status" ? "active" : ""}`}
        >
          <div className="eduListWrap eduListWrap--mainHtml">
            <div className="flex-sb">
              <div className="tit">신청목록</div>
              <select
                className="input selectInput"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="상태별 조회"
              >
                {statusFilterOptions.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="cardSection">
              {loading ? (
                <p className="loading">목록을 불러오는 중입니다.</p>
              ) : loadError ? (
                <p className="error">{loadError}</p>
              ) : appliedList.length === 0 ? (
                <p className="empty">신청한 목록이 없습니다.</p>
              ) : (
                <div className="cardGrid">
                  {appliedList.map((item, index) => {
                    const row = item as Record<string, unknown>;
                    const detailHref = getDetailHref(item, auth?.themeType);
                    const sttusCode = getStr(item, "appSttusCode");
                    const stateCls = isMentorTheme
                      ? stateClassFromSttusMentor(sttusCode)
                      : stateClassFromSttus(sttusCode);
                    const appStatusLabel = getStr(item, "appSttusCodeNm") || "";
                    const statusPill = mypageAppStatusHeaderPillClass(stateCls);
                    const cardProGb = getStr(item, "proGb");
                    const showResultSelectionBadge =
                      shouldShowResultSelectionBadge(cardProGb);
                    const resultDisplay = showResultSelectionBadge
                      ? resultDisplayFromGb(getStr(item, "resultGb"))
                      : null;
                    const reqUserNm = getStr(item, "reqUserNm");
                    const natureLabel = artpromNatureLabel(row) ?? "";
                    const department = artpromDepartment(row);
                    const cardDescText = artpromCardDesc(row);
                    const dateStr = artpromDateRange(row);
                    const location = artpromLocation(row);
                    const badges = artpromTargetBadges(row);

                    return (
                      <article
                        key={`${getStr(item, "proId")}-${getStr(item, "reqEsntlId")}-${getStr(item, "reqId")}-${getStr(item, "proSeq")}-${index}`}
                        className="cardItem"
                      >
                        <div className="cardHeader">
                          <div className="headLeft">
                            <div className="bizType">
                              {natureLabel.trim() ? natureLabel : "-"}
                            </div>
                            {appStatusLabel ? (
                              <div className={`status ${statusPill}`}>
                                {appStatusLabel}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div className="cardBody">
                          <div className="cardTitle">
                            <Link href={detailHref}>
                              {decodeDisplayText(getStr(item, "proNm"))}
                            </Link>
                          </div>
                          <ul className="infoList">
                            <li className="infoDate">
                              <span>기간</span> {dateStr}
                            </li>
                            <li className="infoPeople">
                              <span>대상</span>
                              <div className="badgeArea age">
                                {badges.map((badge, bi) => (
                                  <span
                                    key={`${badge}-${bi}`}
                                    className={`badge ${badge}`}
                                  >
                                    {artpromBadgeLabel(badge, true)}
                                  </span>
                                ))}
                              </div>
                              {location ? (
                                <div className="moreInfo">{location}</div>
                              ) : null}
                            </li>
                            <li className="infoCompany">
                              <span>부서</span>
                              {department || "-"}
                            </li>
                            <li className="infoName">
                              <span className="blind">신청자:</span>{" "}
                              {reqUserNm}
                              {resultDisplay ? (
                                <>
                                  {" "}
                                  <span
                                    className={`result ${resultDisplay.cls}`}
                                    aria-hidden
                                  >
                                    {resultDisplay.label}
                                  </span>
                                </>
                              ) : null}
                            </li>
                          </ul>
                          <p className="cardDesc">{cardDescText}</p>
                        </div>
                        <div className="cardFooter">
                          <Link href={detailHref} className="btnDetail">
                            상세보기
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          id="content_favorites"
          className={`tabContent ${activeTab === "favorites" ? "active" : ""}`}
        >
          <div className="eduListWrap eduListWrap--mainHtml">
            <div className="flex-sb">
              <div className="tit">즐겨찾기</div>
            </div>
            <div className="cardSection">
              {!auth?.isAuthenticated ? (
                <p className="infoPlaceholder">로그인이 필요합니다.</p>
              ) : favLoading ? (
                <p className="loading">목록을 불러오는 중입니다.</p>
              ) : favError ? (
                <p className="error">{favError}</p>
              ) : favoritesList.length === 0 ? (
                <p className="empty">즐겨찾기한 교육이 없습니다.</p>
              ) : (
                <div className="cardGrid">
                  {favoritesList.map((row, index) => {
                    const proId = getStrArtprom(row, "proId", "pro_id");
                    const proGb = getStrArtprom(row, "proGb", "pro_gb");
                    const browseHref = proId
                      ? buildArtpromBrowseDetailHref(
                          proId,
                          proGb || undefined,
                          browseThemeForFavorites,
                        )
                      : "#";
                    const natureLabel = artpromNatureLabel(row) ?? "";
                    const runSta = getStrArtprom(row, "runSta", "run_sta");
                    const runStaNm = getStrArtprom(row, "runStaNm", "run_sta_nm");
                    const stateClass =
                      stateClassFromRunStaForMainHtml(runSta || undefined) ||
                      undefined;
                    const recruitLabel = mainHtmlRecruitLabel(
                      runStaNm || undefined,
                    );
                    const statusPillClass =
                      mainHtmlStatusPillClass(stateClass);
                    const dateStr = artpromDateRange(row);
                    const location = artpromLocation(row);
                    const department = artpromDepartment(row);
                    const cardDescText = artpromCardDesc(row);
                    const badges = artpromTargetBadges(row);
                    return (
                      <article
                        key={`${proId || "row"}-${index}`}
                        className="cardItem is-clickable"
                        onClick={() => handleFavoriteCardNavigate(row)}
                      >
                        <div className="cardHeader">
                          <div className="headLeft">
                            <div className="bizType">
                              {natureLabel.trim() ? natureLabel : "-"}
                            </div>
                            {recruitLabel ? (
                              <div className={`status ${statusPillClass}`}>
                                {recruitLabel}
                              </div>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="btnWish isFavorite"
                            aria-label="즐겨찾기 해제"
                            aria-pressed
                            disabled={favWishLoadingProId === proId}
                            onClick={handleFavoriteStarClick(row)}
                          >
                            <span className="icoStar" />
                          </button>
                        </div>
                        <div className="cardBody">
                          <div className="cardTitle">
                            <Link
                              href={browseHref}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {decodeDisplayText(
                                getStrArtprom(row, "proNm", "pro_nm"),
                              )}
                            </Link>
                          </div>
                          <ul className="infoList">
                            <li className="infoDate">
                              <span>기간</span> {dateStr}
                            </li>
                            <li className="infoPeople">
                              <span>대상</span>
                              <div className="badgeArea age">
                                {badges.map((badge, bi) => (
                                  <span
                                    key={`${badge}-${bi}`}
                                    className={`badge ${badge}`}
                                  >
                                    {artpromBadgeLabel(badge, true)}
                                  </span>
                                ))}
                              </div>
                              {location ? (
                                <div className="moreInfo">{location}</div>
                              ) : null}
                            </li>
                            <li className="infoCompany">
                              <span>부서</span>
                              {department || "-"}
                            </li>
                            <li
                              className="infoName mypageFavoriteCardSpacer"
                              aria-hidden="true"
                            >
                              <span className="blind">신청자</span>
                            </li>
                          </ul>
                          <p className="cardDesc">{cardDescText}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {isParent && (
          <div
            id="content_kids"
            className={`tabContent ${activeTab === "kids" ? "active" : ""}`}
          >
            <div className="bizInput">
              <div className="sectionHeader mb-0">
                <div className="sectionTitle">자녀연동</div>
                <button
                  type="button"
                  className="btnApply btnPr"
                  id="btnRegCert"
                  onClick={openRegCertModal}
                >
                  자녀등록
                </button>
              </div>
              {kidsError && !kidsLoading && (
                <p className="error">{kidsError}</p>
              )}
              <div className="tableWrapper">
                <table className="certTable kidsCertTable">
                  <caption className="blind">
                    사진, 학생명, 연락처, 성별, 생년월일 상태를 포함한 자녀연동
                    목록
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="colPhoto">
                        사진
                      </th>
                      <th
                        scope="col"
                        className="colName"
                        style={{ width: 240 }}
                      >
                        학생명
                      </th>
                      <th scope="col" className="colNum" style={{ width: 240 }}>
                        연락처
                      </th>
                      <th scope="col" className="colSex" style={{ width: 240 }}>
                        성별
                      </th>
                      <th
                        scope="col"
                        className="colBirth"
                        style={{ width: 240 }}
                      >
                        생년월일
                      </th>
                      <th
                        scope="col"
                        className="colState"
                        style={{ width: 120 }}
                      >
                        상태
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {kidsLoading ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          자녀 목록을 불러오는 중입니다.
                        </td>
                      </tr>
                    ) : kidsList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty">
                          연동된 자녀가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      kidsList.map((kid) => {
                        const profileSrc = getChildProfileImageUrl(kid);
                        return (
                          <tr key={kid.esntlId ?? ""}>
                            <td className="cellPhoto">
                              <div
                                className={`ellipsis ${profileSrc ? "cursor-pointer" : ""}`}
                                role={profileSrc ? "button" : undefined}
                                tabIndex={profileSrc ? 0 : undefined}
                                onClick={() => {
                                  if (!profileSrc) return;
                                  window.open(
                                    profileSrc,
                                    "_blank",
                                    "noopener,noreferrer",
                                  );
                                }}
                                onKeyDown={(e) => {
                                  if (!profileSrc) return;
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    window.open(
                                      profileSrc,
                                      "_blank",
                                      "noopener,noreferrer",
                                    );
                                  }
                                }}
                                aria-label={profileSrc ? "자녀 사진 보기" : undefined}
                              >
                                {profileSrc ? (
                                  <img
                                    src={profileSrc}
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const next =
                                        e.currentTarget.nextElementSibling;
                                      if (
                                        next &&
                                        next instanceof HTMLImageElement
                                      ) {
                                        next.style.display = "block";
                                      }
                                    }}
                                  />
                                ) : null}
                                <img
                                  src={`${IMG}/img_noImg.png`}
                                  alt="프로필이미지"
                                  style={
                                    profileSrc ? { display: "none" } : undefined
                                  }
                                />
                              </div>
                            </td>
                            <td className="cellName">{kid.userNm ?? ""}</td>
                            <td className="cellNum">
                              {formatPhoneWithHyphen(kid.mbtlnum ?? "")}
                            </td>
                            <td className="cellSex">
                              {kid.sexdstnCodeNm ??
                                (kid.sexdstnCode === "F" ? "여" : "남")}
                            </td>
                            <td className="cellBirth">{kid.brthdy ?? ""}</td>
                            <td className="cellState">
                              <div className="btnGroup">
                                <button
                                  type="button"
                                  className="btnDelete"
                                  onClick={() => handleKidsDeleteClick(kid)}
                                  disabled={kidsDeleteLoading}
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {isParent && (
        <div
          className={`modalOverlay regCertModal ${showRegCertModal ? "active" : ""}`}
          id="regCertModal"
          aria-hidden={!showRegCertModal}
          onClick={(e) => e.target === e.currentTarget && closeRegCertModal()}
        >
          <div
            className="modalContent"
            role="dialog"
            aria-labelledby="regCertModalTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div id="regCertModalTitle" className="modalTitle">
                자녀등록
              </div>
              <button
                type="button"
                className="closeBtn"
                id="closeRegCertModal"
                aria-label="닫기"
                onClick={closeRegCertModal}
              >
                &times;
              </button>
            </div>
            <form className="modalBody" onSubmit={handleRegCertSubmit}>
              <div className="formGrid bizInput">
                <div className="formRow">
                  <label htmlFor="certName" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    학생명
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="certName"
                      className="inputField"
                      placeholder="학생명을 입력해주세요"
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="certNum" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    연락처
                  </label>
                  <div className="formControl">
                    <input
                      type="tel"
                      id="certNum"
                      className="inputField"
                      placeholder="010-1234-5678"
                      value={certNum}
                      maxLength={14}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 11);
                        setCertNum(formatPhoneWithHyphen(digits));
                      }}
                    />
                  </div>
                </div>
                <div className="formRow">
                  <span id="lblGender" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    성별
                  </span>
                  <div className="formControl">
                    <div
                      className="customGroup formControl"
                      role="radiogroup"
                      aria-labelledby="lblGender"
                    >
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gender"
                          id="certSexM"
                          className="customInput"
                          checked={certSex === "M"}
                          onChange={() => setCertSex("M")}
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">남</span>
                        </div>
                      </label>
                      <label className="customItem">
                        <input
                          type="radio"
                          name="gender"
                          className="customInput"
                          checked={certSex === "F"}
                          onChange={() => setCertSex("F")}
                        />
                        <div className="customBox">
                          <span className="customIcon" aria-hidden="true" />
                          <span className="customText">여</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="formRow">
                  <label htmlFor="certId" className="formLabel">
                    <span className="requiredMark" aria-hidden="true">
                      *
                    </span>
                    주민등록번호
                  </label>
                  <div className="formControl">
                    <input
                      type="text"
                      id="certId"
                      className="inputField"
                      placeholder="000000-0000000"
                      value={
                        certIdFocused || certId.length !== 13
                          ? formatResidentIdForDisplay(certId)
                          : formatResidentIdMasked(certId)
                      }
                      maxLength={14}
                      inputMode="numeric"
                      autoComplete="off"
                      onFocus={() => setCertIdFocused(true)}
                      onBlur={() => setCertIdFocused(false)}
                      onChange={(e) => {
                        const digits = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 13);
                        setCertId(digits);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="modalFooter">
                <button
                  type="submit"
                  className="btnSubmit"
                  disabled={regCertSubmitLoading}
                >
                  {regCertSubmitLoading ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        confirmText="확인"
        onConfirm={handleAlertConfirm}
      />
      <ConfirmModal
        isOpen={showDeleteConfirmModal}
        title="삭제 확인"
        message="해당 자녀 연동을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="닫기"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteConfirmCancel}
      />
    </section>
  );
}
