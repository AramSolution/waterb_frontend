"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, decodeDisplayText } from "@/shared/lib";
import { API_ENDPOINTS, API_CONFIG } from "@/shared/config/apiUser";
import { loadKakaoMapSdk } from "@/shared/lib/kakaoMap";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import {
  fetchArtedumList,
  type HakwonModalItem,
} from "@/entities/userWeb/artedum/api";

const IMG = "/images/userWeb";
const BIZINFO_PR_PATH = "/userWeb/bizInfoPr";
/** 공부의 명수(proGb 08·09) — 지원사업 상세는 bizInfo(청소년 자기계발 연수지원과 동일 틀) */
const BIZINFO_PATH = "/userWeb/bizInfo";
/** 스터디 사업 신청 입력 페이지 (신청하기 버튼 이동 대상) */
const BIZINPUT_PR_PATH = "/userWeb/bizInputPr";

/** 스터디 사업(bizInfoPr) 기본 상세 proId - URL에 proId 없을 때 사용 */
const DEFAULT_PRO_ID = "PRO_0000000000000010";

/** API 상세 응답 detail */
interface ArtpromDetail {
  proId?: string;
  /** 사업구분: 02=스터디(학원목록 있음), 03=공공형 진로진학 컨설팅(학원목록 없음) */
  proGb?: string;
  /** 교육구분: 01=마중물스터디, 02=희망스터디 (가맹학원 목록 필터용) */
  eduGb?: string;
  proNm?: string;
  proTargetNm?: string;
  /** 기타명/기타내용 (상세 기타내용 영역 표시용) */
  etcNm?: string;
  recCnt?: number;
  recFromDd?: string;
  recToDd?: string;
  proSum?: string;
  proDesc?: string;
  runStaNm?: string;
  [key: string]: unknown;
}

/** API 파일 항목 */
interface ArtpromFileItem {
  fileId?: string;
  seq?: string;
  orgfNm?: string;
  saveNm?: string;
  filePath?: string;
  fileExt?: string;
  [key: string]: unknown;
}

/** API 상세 응답 */
interface ArtpromUserDetailResponse {
  detail?: ArtpromDetail | null;
  proFileList?: ArtpromFileItem[] | null;
  fileList?: ArtpromFileItem[] | null;
  result?: string;
}

function formatYyyyMmDd(yyyymmdd: string | undefined): string {
  if (!yyyymmdd || yyyymmdd.length < 8) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  return `${y}.${m}.${d}`;
}

function getMainImageUrl(
  proFileList: ArtpromFileItem[] | null | undefined,
): string | null {
  const first =
    Array.isArray(proFileList) && proFileList.length > 0
      ? proFileList[0]
      : null;
  const fileId = first?.fileId ?? "";
  const seq = first?.seq ?? "";
  if (fileId === "" || seq === "" || seq === undefined) return null;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
  if (!base) return null;
  return `${base}/api/v1/files/view?fileId=${encodeURIComponent(String(fileId))}&seq=${encodeURIComponent(String(seq))}`;
}

function getFileDownloadUrl(file: ArtpromFileItem): string {
  const fileId = file.fileId ?? "";
  const seq = file.seq ?? "";
  if (fileId && seq && API_CONFIG.BASE_URL) {
    return `${API_CONFIG.BASE_URL.replace(/\/$/, "")}/api/v1/files/download?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(seq)}`;
  }
  return "#";
}

function getFileClass(fileExt: string | undefined, fileName?: string): string {
  let ext = (fileExt && String(fileExt).toLowerCase().replace(/^\./, "")) || "";
  if (!ext && fileName) {
    const lastDot = String(fileName).lastIndexOf(".");
    if (lastDot >= 0)
      ext = String(fileName)
        .slice(lastDot + 1)
        .toLowerCase();
  }
  if (!ext) return "img";
  if (ext === "xlsx" || ext === "xls") return "xls";
  if (["hwp", "pdf", "ppt", "pptx", "zip"].includes(ext))
    return ext === "pptx" ? "ppt" : ext;
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext)) return "img";
  return "img";
}

interface InlineHakwonMapProps {
  address: string;
}

function InlineHakwonMap({ address }: InlineHakwonMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapStatusMessage, setMapStatusMessage] =
    useState<string>("지도를 불러오는 중입니다.");

  useEffect(() => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setMapStatusMessage("주소 정보가 없습니다.");
      return;
    }

    let cancelled = false;
    setMapStatusMessage("지도를 불러오는 중입니다.");

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled) return;

        const kakao = window.kakao;
        if (!kakao?.maps?.services || !mapContainerRef.current) {
          setMapStatusMessage("지도를 불러오지 못했습니다.");
          return;
        }
        const maps = kakao.maps;
        const services = maps.services as any;

        const geocoder = new services.Geocoder();
        geocoder.addressSearch(
          trimmedAddress,
          (result: Array<{ x: string; y: string }>, status: string) => {
            if (cancelled) return;

            if (status !== services.Status.OK || !result?.length) {
              setMapStatusMessage("지도에서 주소를 찾지 못했습니다.");
              return;
            }

            const lat = Number(result[0].y);
            const lng = Number(result[0].x);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
              setMapStatusMessage("지도 좌표를 확인하지 못했습니다.");
              return;
            }

            const position = new (maps as any).LatLng(lat, lng);
            const map = new (maps as any).Map(mapContainerRef.current, {
              center: position,
              level: 3,
            });
            const marker = new (maps as any).Marker({ position });
            marker.setMap(map);
            map.setCenter(position);
            setMapStatusMessage("");
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setMapStatusMessage("지도를 불러오지 못했습니다.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return (
    <div className="hakwonMapWrap">
      <div className="mapContainer" ref={mapContainerRef}>
        {mapStatusMessage ? (
          <div className="mapPlaceholder">{mapStatusMessage}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * bizInfo_pr.html 본문 구조 유지 (클래스명·id·접근성·DOM·이미지 원본 그대로)
 * 원본: source/gunsan/bizInfo_pr.html
 * proId 없으면 DEFAULT_PRO_ID(PRO_0000000000010)로 상세 조회 후 데이터 바인딩.
 */
const BizInfoPrSection: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = searchParams.get("proId") ?? DEFAULT_PRO_ID;
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [data, setData] = useState<ArtpromUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeHakwonIndex, setActiveHakwonIndex] = useState(0);
  const [openMapIndex, setOpenMapIndex] = useState<number | null>(null);
  /** 학원목록 모달용: API로 조회한 가맹학원 목록 (null = 미요청) */
  const [academyList, setAcademyList] = useState<HakwonModalItem[] | null>(
    null,
  );
  const [academyListLoading, setAcademyListLoading] = useState(false);
  const [academyListError, setAcademyListError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_ENDPOINTS.USER_ARTPROM.DETAIL}/${encodeURIComponent(id)}`;
      const response = await apiClient.get<ArtpromUserDetailResponse>(url);
      setData(response ?? null);
    } catch (e) {
      console.error("스터디 사업 상세 조회 실패:", e);
      setError("상세 정보를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (proId && proId.trim()) {
      fetchDetail(proId.trim());
    } else {
      setData(null);
      setLoading(false);
      setError(null);
    }
  }, [proId, fetchDetail]);

  const detail = data?.detail ?? null;

  /** 지원사업(프로그램)이 바뀌면 학원목록 캐시 초기화 → 다음 모달 오픈 시 해당 eduGb로 재조회 */
  useEffect(() => {
    setAcademyList(null);
    setOpenMapIndex(null);
  }, [proId, detail?.eduGb]);
  const proFileList = data?.proFileList ?? [];
  const fileList = data?.fileList ?? [];
  const promoImageUrl = getMainImageUrl(proFileList);
  const mainImageSrc = promoImageUrl ?? `${IMG}/img_noImg.png`;
  const contentTitle =
    decodeDisplayText(detail?.proNm ?? "") ||
    "마중물 스터디 사업 (마중물 스터디)";
  const proTargetNm =
    decodeDisplayText(detail?.proTargetNm ?? "") ||
    "관내 중학교 2학년 재학생 (또는 학교 밖 청소년)";
  const recFromDd = formatYyyyMmDd(detail?.recFromDd);
  const recToDd = formatYyyyMmDd(detail?.recToDd);
  const recPeriod =
    [recFromDd, recToDd].filter(Boolean).join(" ~ ") ||
    "1기 (3월~4월) / 2기 (7월~8월) / 3기 (10월~11월)";
  const etcContent = decodeDisplayText(detail?.etcNm ?? detail?.proDesc ?? "");
  const runStaNm = decodeDisplayText(detail?.runStaNm ?? "") || "접수중";
  const proSum =
    decodeDisplayText(detail?.proSum ?? "") ||
    "학생 스스로 자기계발 탐구영역을 정해서 신청하는 장학금으로 다양한 진로체험 기회 제공 및 자신감 향상 유도";
  const proDesc = decodeDisplayText(detail?.proDesc ?? "") || proSum;

  /** 02=스터디만 학원목록 표시. 03/04/05/06/07/08/09은 각 전용·bizInfo 경로로 리다이렉트(08·09=공부의 명수) */
  const showAcademyList =
    detail?.proGb !== "03" &&
    detail?.proGb !== "04" &&
    detail?.proGb !== "05" &&
    detail?.proGb !== "06" &&
    detail?.proGb !== "07" &&
    detail?.proGb !== "08" &&
    detail?.proGb !== "09";

  const fromMypage = searchParams.get("from") === "mypage";

  /** 03→bizInfoCt, 04→bizInfoVd, 05→bizInfoRc, 06→bizInfoDm, 07→bizInfoGc, 08·09→bizInfo(공부의 명수·청소년 자기계발과 동일 틀) 리다이렉트 */
  useEffect(() => {
    if (detail?.proGb === "03") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      params.set("type", "parent");
      if (fromMypage) params.set("from", "mypage");
      router.replace(`/userWeb/bizInfoCt?${params.toString()}`);
    } else if (detail?.proGb === "08" || detail?.proGb === "09") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      const typeParam = searchParams.get("type");
      if (typeParam) params.set("type", typeParam);
      if (fromMypage) params.set("from", "mypage");
      const reqGbPosition = searchParams.get("reqGbPosition");
      if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
      router.replace(`${BIZINFO_PATH}?${params.toString()}`);
    } else if (detail?.proGb === "04") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      params.set("type", "parent");
      if (fromMypage) params.set("from", "mypage");
      const reqGbPosition = searchParams.get("reqGbPosition");
      if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
      router.replace(`/userWeb/bizInfoVd?${params.toString()}`);
    } else if (detail?.proGb === "05") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      const typeParam = searchParams.get("type");
      if (typeParam) params.set("type", typeParam);
      if (fromMypage) params.set("from", "mypage");
      const reqGbPosition = searchParams.get("reqGbPosition");
      if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
      router.replace(`/userWeb/bizInfoRc?${params.toString()}`);
    } else if (detail?.proGb === "07") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      const typeParam = searchParams.get("type");
      if (typeParam) params.set("type", typeParam);
      if (fromMypage) params.set("from", "mypage");
      const reqGbPosition = searchParams.get("reqGbPosition");
      if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
      router.replace(`/userWeb/bizInfoGc?${params.toString()}`);
    } else if (detail?.proGb === "06") {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      params.set("type", "parent");
      if (fromMypage) params.set("from", "mypage");
      const reqGbPosition = searchParams.get("reqGbPosition");
      if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
      router.replace(`/userWeb/bizInfoDm?${params.toString()}`);
    }
  }, [detail?.proGb, proId, fromMypage, router, searchParams]);

  const handleSubmitClick = () => {
    const params = new URLSearchParams();
    if (proId) params.set("proId", proId);
    params.set("type", "parent");
    if (fromMypage) params.set("from", "mypage");
    // 현재 URL의 reqGbPosition이 있으면 유지 (학생 페이지에서 온 경우 배지 유지)
    const reqGbPosition = searchParams.get("reqGbPosition");
    if (reqGbPosition) params.set("reqGbPosition", reqGbPosition);
    const targetUrl = `${BIZINPUT_PR_PATH}?${params.toString()}`;
    // 상세 "보기"는 비로그인도 허용. 신청하기에서만 로그인 모달을 띄운다.
    if (!isAuthenticated) {
      auth?.handleRequireLogin(targetUrl);
      return;
    }
    router.push(targetUrl);
  };

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [modalOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalOpen]);

  const openModal = useCallback(() => {
    setModalOpen(true);
    if (academyList === null && !academyListLoading) {
      setAcademyListError(null);
      setAcademyListLoading(true);
      const eduGb =
        detail?.eduGb === "01" || detail?.eduGb === "02"
          ? detail.eduGb
          : undefined;
      fetchArtedumList({ start: 0, length: 100, eduGb })
        .then((list) => {
          setAcademyList(list);
        })
        .catch(() => {
          setAcademyListError("학원 목록을 불러오지 못했습니다.");
          setAcademyList([]);
        })
        .finally(() => {
          setAcademyListLoading(false);
        });
    }
  }, [academyList, academyListLoading, detail?.eduGb]);

  const closeModal = () => {
    setModalOpen(false);
    setOpenMapIndex(null);
  };

  const handleMapToggle = useCallback((index: number) => {
    setOpenMapIndex((prev) => (prev === index ? null : index));
  }, []);

  if (loading) {
    return (
      <section className="inner">
        <div className="mainBg">
          <p className="loading">상세 정보를 불러오는 중입니다.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="inner">
        <div className="mainBg">
          <p className="error">{error}</p>
        </div>
      </section>
    );
  }

  /** 03/04/05/06/07/08/09은 각 전용·bizInfo 경로로 리다이렉트 중에는 로딩 표시 */
  if (
    detail?.proGb === "03" ||
    detail?.proGb === "04" ||
    detail?.proGb === "05" ||
    detail?.proGb === "06" ||
    detail?.proGb === "07" ||
    detail?.proGb === "08" ||
    detail?.proGb === "09"
  ) {
    return (
      <section className="inner">
        <div className="mainBg">
          <p className="loading">이동 중입니다.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="inner">
        <div className="mainBg">
          <article className="bizInfo">
            <div className="imageWrapper">
              <img
                src={mainImageSrc}
                alt={contentTitle || "스터디 사업"}
                className="mainImage"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.src !== `${IMG}/img_noImg.png`)
                    el.src = `${IMG}/img_noImg.png`;
                }}
              />
            </div>
            <div className="infoWrapper">
              <span className="statusBadge ing" aria-label="현재 상태">
                {runStaNm}
              </span>
              <div className="contentTitle">{contentTitle}</div>
              <div className="detailBox">
                <ul className="detailList">
                  <li className="detailItem">
                    <strong className="itemLabel">사업대상</strong>
                    <span className="itemValue">{proTargetNm}</span>
                  </li>
                  <li className="detailItem">
                    <strong className="itemLabel">모집기간</strong>
                    <span className="itemValue">{recPeriod}</span>
                  </li>
                  <li className="detailItem">
                    <strong className="itemLabel">기타내용</strong>
                    <span className="itemValue">{etcContent}</span>
                  </li>
                </ul>
                <div className="flex-sb">
                  {showAcademyList && (
                    <button
                      type="button"
                      className="hakwonButton"
                      id="openModal"
                      aria-haspopup="dialog"
                      aria-controls="hakwonModal"
                      onClick={openModal}
                    >
                      학원목록 확인
                    </button>
                  )}
                  <button
                    type="button"
                    className="submitButton"
                    onClick={handleSubmitClick}
                  >
                    신청하기
                  </button>
                </div>
              </div>
            </div>
          </article>
          <div className="bizBox">
            <div className="title">사업개요</div>
            <div className="content">{proSum}</div>
          </div>
          <div className="bizBox">
            <div className="title">사업내용</div>
            <div className="content">{proDesc}</div>
          </div>
          <div className="bizFile">
            <div className="title" id="fileDownloadTitle">
              첨부파일
            </div>
            <ul className="fileWrap" aria-labelledby="fileDownloadTitle">
              {Array.isArray(fileList) && fileList.length > 0 ? (
                fileList.map((file, idx) => {
                  const fileName =
                    (file.orgfNm as string) || file.saveNm || "파일";
                  const fileExt = (file.fileExt as string) || "";
                  const fileClass = getFileClass(fileExt, fileName);
                  const href = getFileDownloadUrl(file);
                  return (
                    <li
                      key={`${file.fileId}-${file.seq}-${idx}`}
                      className="fileList"
                    >
                      <a
                        href={href}
                        className={`file ${fileClass}`}
                        download
                        title={`${fileName} 다운로드`}
                      >
                        <span className="fileIcon" aria-hidden="true" />
                        <span className="fileName">{fileName}</span>
                        <span className="sr-only">(다운로드)</span>
                      </a>
                    </li>
                  );
                })
              ) : (
                <li className="fileList">
                  <span className="fileName">첨부파일이 없습니다.</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {showAcademyList && (
        <div
          className={`modalOverlay ${modalOpen ? "active" : ""}`}
          id="modalOverlay"
          aria-hidden={!modalOpen}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="modalContent"
            role="dialog"
            aria-labelledby="modalTitle"
            id="hakwonModal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <div id="modalTitle">학원목록</div>
              <button
                type="button"
                className="closeBtn"
                id="closeModal"
                aria-label="닫기"
                onClick={closeModal}
              >
                &times;
              </button>
            </div>
            <div className="modalBody">
              {academyListLoading ? (
                <p className="loading">학원 목록을 불러오는 중입니다.</p>
              ) : academyListError ? (
                <p className="error">{academyListError}</p>
              ) : (academyList ?? []).length === 0 ? (
                <p className="empty">등록된 가맹학원이 없습니다.</p>
              ) : (
                <ul className="hakwonList">
                  {(academyList ?? []).map((item, i) => (
                    <li
                      key={`${item.name}-${i}`}
                      className={`hakwonItem ${activeHakwonIndex === i ? "active" : ""}`}
                      onClick={() => setActiveHakwonIndex(i)}
                    >
                      <div className="hakwonInfo">
                        <strong className="hakwonName">
                          {item.name}{" "}
                          {item.category ? (
                            <span className="categoryTag">{item.category}</span>
                          ) : null}
                        </strong>
                        <p className="hakwonAddr">
                          <span className="iconLocBg" aria-hidden="true" />
                          <span className="sr-only">주소:</span> {item.addr}
                          <button
                            type="button"
                            className="mapBtn"
                            aria-expanded={openMapIndex === i}
                            aria-controls={`hakwonMap-${i}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMapToggle(i);
                            }}
                          >
                            {openMapIndex === i ? "지도닫기" : "지도보기"}
                          </button>
                        </p>
                        {openMapIndex === i ? (
                          <div id={`hakwonMap-${i}`}>
                            <InlineHakwonMap address={item.addr} />
                          </div>
                        ) : null}
                        <p className="hakwonTel">
                          <span className="iconPhoneBg" aria-hidden="true" />
                          <span className="sr-only">전화번호:</span> {item.tel}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BizInfoPrSection;
