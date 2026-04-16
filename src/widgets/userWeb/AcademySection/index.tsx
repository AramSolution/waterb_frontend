"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/shared/lib";
import { API_CONFIG, API_ENDPOINTS } from "@/shared/config/apiUser";
import { loadKakaoMapSdk } from "@/shared/lib/kakaoMap";
import { NoticeCommunityChrome } from "@/widgets/userWeb/NoticeCommunityChrome";

const IMG = "/images/userWeb";

export interface AcademyListItem {
  id: string;
  name: string;
  contact: string;
  address: string;
  subject: string;
  logoUrl?: string;
  intro?: string;
  hasDetail?: boolean;
}

export interface AcademyDetail {
  name: string;
  contact: string;
  address: string;
  logoUrl?: string;
  intro: string;
}

interface AcademyListForUserItem {
  esntlId?: string;
  userNm?: string;
  schoolNm?: string;
  adres?: string;
  detailAdres?: string;
  offmTelno?: string;
  usrTelno?: string;
  subNmList?: string;
  userPic?: string;
  userPicSeq?: number;
  profileDesc?: string;
}

function buildLogoUrl(
  userPic: string | undefined,
  userPicSeq?: number | null,
): string | undefined {
  if (!userPic || !userPic.trim()) return undefined;
  const seq =
    userPicSeq != null && Number.isInteger(userPicSeq) ? userPicSeq : 1;
  const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
  const path = API_ENDPOINTS.FILES.VIEW;
  const url = base ? `${base}${path}` : path;
  return `${url}?fileId=${encodeURIComponent(String(userPic).trim())}&seq=${encodeURIComponent(String(seq))}`;
}

interface AcademyListForUserResponse {
  data?: AcademyListForUserItem[] | null;
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

function mapApiItemToListItem(
  item: AcademyListForUserItem,
  index: number,
): AcademyListItem {
  const name = (item.userNm ?? item.schoolNm ?? "").trim() || "(학원명 없음)";
  const contact = (item.offmTelno ?? item.usrTelno ?? "").trim();
  const addrParts = [item.adres, item.detailAdres].filter(Boolean) as string[];
  const address = addrParts.join(" ").trim();
  const subject = (item.subNmList ?? "").trim();
  const logoUrl = buildLogoUrl(item.userPic, item.userPicSeq);
  const intro = (item.profileDesc ?? "").trim();
  return {
    id: (item.esntlId ?? "").trim() || String(index),
    name,
    contact,
    address,
    subject,
    logoUrl,
    intro: intro || undefined,
    hasDetail: true,
  };
}

type AcademySearchField = "name" | "address" | "subject";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

/**
 * 학원조회 — source/gunsan/academy2.html 레이아웃(커뮤니티 비주얼·사이드바·검색·mainViewTable·모달).
 * 데이터: ARMUSER 학원 목록 API. 검색·페이지는 클라이언트(NoticeSection과 동일 패턴).
 */
export default function AcademySection() {
  const searchParams = useSearchParams();

  const themeQuery = useMemo(() => {
    const type = searchParams.get("type");
    const reqGbPosition = searchParams.get("reqGbPosition");
    if (type) return `type=${encodeURIComponent(type)}`;
    if (reqGbPosition)
      return `reqGbPosition=${encodeURIComponent(reqGbPosition)}`;
    return "";
  }, [searchParams]);

  const [list, setList] = useState<AcademyListItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [mapStatusMessage, setMapStatusMessage] =
    useState<string>("지도가 표시되는 영역입니다.");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [searchField, setSearchField] = useState<AcademySearchField>("name");
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [listPage, setListPage] = useState(1);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setListError(null);
    apiClient
      .post<AcademyListForUserResponse>(
        API_ENDPOINTS.ARMUSER_USER.ACADEMY_LIST,
        {
          start: 0,
          length: 500,
        },
      )
      .then((res) => {
        if (cancelled) return;
        const raw = res?.data ?? [];
        const mapped = raw.map((item, i) => mapApiItemToListItem(item, i));
        setList(mapped);
        const total =
          res?.recordsTotal ?? res?.recordsFiltered ?? mapped.length;
        const n =
          typeof total === "string" ? parseInt(total, 10) : Number(total);
        setRecordsTotal(
          Number.isFinite(n) && !Number.isNaN(n)
            ? Math.max(0, Math.floor(n))
            : mapped.length,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setListError("학원 목록을 불러오지 못했습니다.");
          setList([]);
          setRecordsTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredList = useMemo(() => {
    const k = appliedKeyword.trim().toLowerCase();
    if (!k) return list;
    return list.filter((row) => {
      if (searchField === "name") {
        return row.name.toLowerCase().includes(k);
      }
      if (searchField === "address") {
        return row.address.toLowerCase().includes(k);
      }
      return row.subject.toLowerCase().includes(k);
    });
  }, [list, appliedKeyword, searchField]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredList.length / pageSize) || 1,
  );

  useEffect(() => {
    setListPage(1);
  }, [appliedKeyword, searchField, pageSize]);

  useEffect(() => {
    if (listPage > totalPages) setListPage(totalPages);
  }, [listPage, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (listPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, listPage, pageSize]);

  const displayTotal = appliedKeyword.trim()
    ? filteredList.length
    : recordsTotal || list.length;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedKeyword(searchInput);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setListPage(p);
  };

  const openModal = useCallback((id: string) => {
    setDetailId(id);
    setModalOpen(true);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setDetailId(null);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeModal();
  };

  const handleCopyUrl = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard.writeText(url).then(() => {
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    });
  }, []);

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") window.print();
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = document.title;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      }
    } catch {
      /* 취소 등 */
    }
  }, []);

  const selected = detailId ? list.find((r) => r.id === detailId) : null;
  const detail: AcademyDetail | null = selected
    ? {
        name: selected.name,
        contact: selected.contact,
        address: selected.address,
        logoUrl: selected.logoUrl ?? `${IMG}/img_noImg.png`,
        intro: selected.intro ?? "",
      }
    : null;

  useEffect(() => {
    if (!modalOpen) {
      setMapStatusMessage("지도가 표시되는 영역입니다.");
      return;
    }

    const address = detail?.address?.trim();
    if (!address) {
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
          address,
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
            const marker = new (maps as any).Marker({
              position,
            });
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
  }, [modalOpen, detail?.address]);

  const renderPagination = () => {
    if (filteredList.length === 0) return null;
    const windowSize = 10;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, listPage - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const firstDisabled = listPage <= 1;
    const prevDisabled = listPage <= 1;
    const nextDisabled = listPage >= totalPages;
    const lastDisabled = listPage >= totalPages;

    return (
      <div className="communityPaginationWrap">
        <div
          className="communityPagination"
          role="navigation"
          aria-label="페이지 네비게이션"
        >
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || firstDisabled}
            onClick={() => goToPage(1)}
            aria-label="첫 페이지"
          >
            {"<<"}
          </button>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || prevDisabled}
            onClick={() => goToPage(listPage - 1)}
            aria-label="이전 페이지"
          >
            {"<"}
          </button>
          <div className="communityPageNumbers" aria-label="페이지 번호">
            {Array.from({ length: end - start + 1 }).map((_, i) => {
              const p = start + i;
              const isActive = p === listPage;
              return (
                <button
                  key={p}
                  type="button"
                  className={`communityPageBtn ${isActive ? "active" : ""}`}
                  onClick={() => goToPage(p)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || nextDisabled}
            onClick={() => goToPage(listPage + 1)}
            aria-label="다음 페이지"
          >
            {">"}
          </button>
          <button
            type="button"
            className="communityPageNavBtn"
            disabled={loading || lastDisabled}
            onClick={() => goToPage(totalPages)}
            aria-label="마지막 페이지"
          >
            {">>"}
          </button>
        </div>
      </div>
    );
  };

  const tableSummary =
    "학원조회 목록이며 번호, 학원명, 연락처, 주소, 과목 정보를 제공합니다.";

  return (
    <>
      <NoticeCommunityChrome
        themeQuery={themeQuery}
        shell="community"
        headTit="학원조회"
        breadcrumbCurrent="학원조회"
        activeNav="academy"
      >
        <form
          className="filterSearchContainer"
          aria-label="학원 검색"
          onSubmit={onSearchSubmit}
        >
          <div className="filterBar">
            <div className="filterGroupWrap">
              <fieldset className="filterGroup" aria-label="검색">
                <div className="filterTitle">검색</div>
                <div className="inputWrap">
                  <div className="searchFilter">
                    <label htmlFor="academySearchType" className="blind">
                      검색 조건 선택
                    </label>
                    <select
                      id="academySearchType"
                      className="input"
                      value={searchField}
                      onChange={(e) =>
                        setSearchField(e.target.value as AcademySearchField)
                      }
                    >
                      <option value="name">학원명</option>
                      <option value="address">주소</option>
                      <option value="subject">과목</option>
                    </select>
                  </div>
                  <input
                    type="search"
                    name="q"
                    placeholder="검색어를 입력해 주세요"
                    title="검색어 입력"
                    className="searchInput"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  <button type="submit" className="btnSearch">
                    검색
                  </button>
                </div>
              </fieldset>
            </div>
          </div>
        </form>
        <div>
          <div className="headInfo flex-sb mb-24">
            <div className="count">
              총 게시물 <b>{displayTotal}</b>개
            </div>
            <div className="listCountWrap">
              <label htmlFor="academyPageSize" className="blind">
                게시물 출력 개수 선택
              </label>
              <select
                id="academyPageSize"
                className="input inputSelect"
                title="게시물 출력 개수 선택"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}개
                  </option>
                ))}
              </select>
            </div>
          </div>
          <section className="academyListSection" id="academyList">
            <div className="mainViewTableWrapper">
              <table className="mainViewTable" summary={tableSummary}>
                <caption className="blind">학원조회 리스트</caption>
                <thead>
                  <tr>
                    <th scope="col" className="colNum">
                      번호
                    </th>
                    <th scope="col" className="colAcademyName">
                      학원명
                    </th>
                    <th scope="col" className="colContact">
                      연락처
                    </th>
                    <th scope="col" className="colAddress">
                      주소
                    </th>
                    <th scope="col" className="colSubject">
                      과목
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="colEmpty">
                        학원 목록을 불러오는 중입니다.
                      </td>
                    </tr>
                  )}
                  {!loading && listError && (
                    <tr>
                      <td colSpan={5} className="colEmpty">
                        {listError}
                      </td>
                    </tr>
                  )}
                  {!loading && !listError && pageSlice.length === 0 && (
                    <tr>
                      <td colSpan={5} className="colEmpty">
                        등록된 학원이 없습니다.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    !listError &&
                    pageSlice.map((row, i) => {
                      const rowNum = (listPage - 1) * pageSize + i + 1;
                      return (
                        <tr key={row.id}>
                          <td className="cellNum">{rowNum}</td>
                          <td className="cellAcademyName">
                            {row.hasDetail ? (
                              <button
                                type="button"
                                className="btnOpenPopup"
                                aria-haspopup="dialog"
                                aria-controls="academyModal"
                                data-academy-name={row.name}
                                onClick={() => openModal(row.id)}
                              >
                                {row.name}
                              </button>
                            ) : (
                              row.name
                            )}
                          </td>
                          <td className="cellContact">{row.contact}</td>
                          <td className="cellAddress">
                            <div className="ellipsis">{row.address}</div>
                          </td>
                          <td className="cellSubject">{row.subject}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </section>
        </div>
      </NoticeCommunityChrome>

      <div
        className={`modalOverlay ${modalOpen ? "active" : ""}`}
        id="academyModal"
        aria-hidden={!modalOpen}
        onClick={handleOverlayClick}
      >
        <div
          className="modalContent"
          role="dialog"
          aria-labelledby="modalTitle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modalHeader">
            <div id="modalTitle">학원 상세 정보</div>
            <div className="pageBtnWrap">
              <button
                type="button"
                className="btnAction"
                aria-label="SNS 공유"
                onClick={() => void handleShare()}
              >
                <i className="icoShare" aria-hidden />
              </button>
              <button
                type="button"
                className="btnAction"
                aria-label={copyDone ? "URL 복사됨" : "URL 복사"}
                onClick={() => void handleCopyUrl()}
              >
                <i className="icoAttachment" aria-hidden />
              </button>
              <button
                type="button"
                className="btnAction"
                aria-label="페이지 인쇄하기"
                onClick={handlePrint}
              >
                <i className="icoPrint" aria-hidden />
              </button>
            </div>
          </div>
          <div className="modalBody">
            <div className="formGrid academyDetail bizInput">
              <div className="formRow">
                <label className="formLabel">학원로고</label>
                <div className="formControl academyLogo">
                  <div>
                    <img
                      src={detail?.logoUrl ?? `${IMG}/img_noImg.png`}
                      alt=""
                    />
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label className="formLabel">학원명</label>
                <div className="formControl">{detail?.name ?? ""}</div>
              </div>
              <div className="formRow">
                <label className="formLabel">연락처</label>
                <div className="formControl">{detail?.contact ?? ""}</div>
              </div>
              <div className="formRow">
                <label className="formLabel">주소</label>
                <div className="formControl" id="popupAddress">
                  {detail?.address ?? ""}
                </div>
              </div>
              <div className="formRow">
                <label className="formLabel">학원소개</label>
                <div className="formControl academyIntro" id="popupIntro">
                  {detail?.intro ?? ""}
                </div>
              </div>
              <div className="formRow">
                <label className="formLabel">위치안내</label>
                <div className="formControl">
                  <div
                    id="academyMap"
                    className="mapContainer"
                    ref={mapContainerRef}
                  >
                    {mapStatusMessage ? (
                      <div className="mapPlaceholder">{mapStatusMessage}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="modalFooter">
              <button
                type="button"
                className="btnSubmit closeBtn"
                onClick={closeModal}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
