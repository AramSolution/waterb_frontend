"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  apiClient,
  decodeDisplayText,
  userWebBadgeLabelFromUrl,
  userWebNormalizeMainQueryConflict,
  userWebPreserveTypeReqGbToParams,
  userWebSetTypeAndReqGbForBizNav,
} from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AuthService } from "@/entities/auth/api";
import {
  BIZ_INFO2_IMG as IMG,
  BIZ_INFO2_SCHOOL_GROUP_LABEL as SCHOOL_GROUP_LABEL,
  type BizInfo2ArtpromFileItem as ArtpromFileItem,
  type BizInfo2BreadcrumbCrumb as BizInfoBreadcrumbCrumb,
  type BizInfo2UserDetailResponse as ArtpromUserDetailResponse,
  displayOrDash,
  externalHref,
  formatChargeLine,
  formatProDateDd,
  formatYyyyMmDd,
  getFileClass,
  getFileDownloadUrl,
  getMainImageUrl,
  gradeParamToLabel,
  natureChecksFromDetail,
  parseReqGbPosition,
  statusPillClassFromRunNm,
} from "@/widgets/userWeb/bizInfo2/detailShared";
import {
  type ScheduleWithApplyItem,
  resolveScheduleStartTime,
} from "@/widgets/userWeb/bizInfo2/scheduleWithApply";

/** 지역연계 진로체험(05) 신청 */
const BIZINPUT_RC_PATH = "/userWeb/bizInputRc";
const BIZINFO_PR_PATH = "/userWeb/bizInfoPr";
const EXPECTED_PRO_GB = "05";

export type { ScheduleWithApplyItem } from "@/widgets/userWeb/bizInfo2/scheduleWithApply";
export { resolveScheduleStartTime } from "@/widgets/userWeb/bizInfo2/scheduleWithApply";

/**
 * 지역연계 진로체험(`proGb` 05) 상세. `bizInfo2` 껍데기 + `mainBg` 안 **회차** 버튼·모달.
 */
const BizInfoRcSection: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = (searchParams.get("proId") ?? "").trim();
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const grade = searchParams.get("grade") ?? undefined;
  const schoolGb = searchParams.get("schoolGb") ?? undefined;
  const typeParam = searchParams.get("type");
  const reqGbFromUrl = parseReqGbPosition(searchParams.get("reqGbPosition"));
  const reqGbPosition =
    reqGbFromUrl ?? (typeParam === "school" ? 5 : undefined);

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

  const roleLabel = useMemo(
    () =>
      userWebBadgeLabelFromUrl(
        reqGbPosition !== undefined ? reqGbPosition : null,
        typeParam,
      ),
    [reqGbPosition, typeParam],
  );

  const profileImgSrc = useMemo(() => {
    if (roleLabel === "학부모/일반") return `${IMG}/img_profile_parent_96.png`;
    if (roleLabel === "기관") return `${IMG}/img_profile_school_96.png`;
    if (roleLabel === "학원") return `${IMG}/img_profile_academy_96.png`;
    if (roleLabel === "멘토") return `${IMG}/img_profile_mentor_96.png`;
    return `${IMG}/img_profile_student_96.png`;
  }, [roleLabel]);

  const schoolGroupHref = useMemo(() => {
    if (!schoolGb) return mainPathWithQuery;
    const q = new URLSearchParams(preserveMainQuery);
    q.set("schoolGb", schoolGb);
    q.delete("grade");
    const s = q.toString();
    return s ? `/userWeb/main?${s}` : "/userWeb/main";
  }, [preserveMainQuery, schoolGb, mainPathWithQuery]);

  const [data, setData] = useState<ArtpromUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(!!proId);
  const [error, setError] = useState<string | null>(() =>
    proId ? null : "사업을 선택해 주세요.",
  );
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [scheduleList, setScheduleList] = useState<ScheduleWithApplyItem[]>([]);
  const [roundListLoading, setRoundListLoading] = useState(false);
  const [roundListError, setRoundListError] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_ENDPOINTS.USER_ARTPROM.DETAIL}/${encodeURIComponent(id)}`;
      const response = await apiClient.get<ArtpromUserDetailResponse>(url);
      setData(response ?? null);
    } catch (e) {
      console.error("지역연계 진로체험 상세 조회 실패:", e);
      setError("상세 정보를 불러오지 못했습니다.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (proId) {
      setError(null);
      fetchDetail(proId);
    } else {
      setData(null);
      setLoading(false);
      setError("사업을 선택해 주세요.");
    }
  }, [proId, fetchDetail]);

  const detail = data?.detail ?? null;

  useEffect(() => {
    if (!detail || loading) return;
    if (detail.proGb && detail.proGb !== EXPECTED_PRO_GB) {
      const params = new URLSearchParams();
      if (proId) params.set("proId", proId);
      userWebPreserveTypeReqGbToParams(params, searchParams);
      const fromMypageRedirect = searchParams.get("from") === "mypage";
      if (fromMypageRedirect) params.set("from", "mypage");
      router.replace(`${BIZINFO_PR_PATH}?${params.toString()}`);
    }
  }, [detail, loading, proId, router, searchParams]);

  const fromMypage = searchParams.get("from") === "mypage";
  const reqEsntlId = searchParams.get("reqEsntlId") ?? undefined;
  const proGb = (detail?.proGb as string) ?? EXPECTED_PRO_GB;
  const proTypeRaw = String(detail?.proType ?? "").trim();
  const isPromoType =
    proTypeRaw === "03" || proTypeRaw === "홍보";
  const hideApplyButtonForMentor =
    AuthService.isAuthenticated() && AuthService.getUserSe() === "MNR";
  const hideSubmitButton =
    proGb === "99" || isPromoType || hideApplyButtonForMentor;

  const handleSubmitClick = () => {
    const params = new URLSearchParams();
    if (proId) params.set("proId", proId);
    userWebSetTypeAndReqGbForBizNav(params, {
      userSe: AuthService.getUserSe(),
      fallbackType: typeParam ?? searchParams.get("type"),
      fallbackReqGb: searchParams.get("reqGbPosition"),
    });
    params.set("proGb", EXPECTED_PRO_GB);
    if (fromMypage) params.set("from", "mypage");
    if (reqEsntlId) params.set("reqEsntlId", reqEsntlId);
    const targetUrl = `${BIZINPUT_RC_PATH}?${params.toString()}`;
    if (!isAuthenticated) {
      auth?.handleRequireLogin(targetUrl);
      return;
    }
    router.push(targetUrl);
  };

  const openRoundModal = useCallback(() => {
    setRoundModalOpen(true);
    if (!proId?.trim()) {
      setRoundListError("사업 정보가 없습니다.");
      setScheduleList([]);
      return;
    }
    setRoundListError(null);
    setRoundListLoading(true);
    apiClient
      .get<{ data?: ScheduleWithApplyItem[]; result?: string }>(
        API_ENDPOINTS.USER_ARTPROM.SCHEDULE_WITH_APPLY(proId),
      )
      .then((res) => {
        const list = Array.isArray((res as { data?: ScheduleWithApplyItem[] })?.data)
          ? (res as { data: ScheduleWithApplyItem[] }).data
          : [];
        setScheduleList(list ?? []);
      })
      .catch(() => {
        setRoundListError("회차 목록을 불러오지 못했습니다.");
        setScheduleList([]);
      })
      .finally(() => setRoundListLoading(false));
  }, [proId]);

  const closeRoundModal = () => setRoundModalOpen(false);

  useEffect(() => {
    if (roundModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [roundModalOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && roundModalOpen) setRoundModalOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [roundModalOpen]);

  const proFileList = data?.proFileList ?? [];
  const fileList = data?.fileList ?? [];
  const promoImageUrl = getMainImageUrl(proFileList);
  const mainImageSrc = promoImageUrl ?? `${IMG}/img_noImg.png`;
  const contentTitle = decodeDisplayText(detail?.proNm ?? "");
  const proTargetNm = decodeDisplayText(detail?.proTargetNm ?? "");
  const recCnt = detail?.recCnt != null ? String(detail.recCnt) : "";
  const recCntDisplay =
    isPromoType && detail?.recCnt != null && Number(detail.recCnt) === 0
      ? ""
      : recCnt
        ? `${recCnt}명`
        : "";
  const recFromDd = formatYyyyMmDd(detail?.recFromDd);
  const recToDd = formatYyyyMmDd(detail?.recToDd);
  const recPeriod = [recFromDd, recToDd].filter(Boolean).join(" ~ ");
  const proDesc = decodeDisplayText(detail?.proDesc ?? "");
  const runStaNm =
    decodeDisplayText(detail?.runStaNm ?? "") || "접수중";
  const proPartNm = decodeDisplayText(String(detail?.proPartNm ?? "").trim());
  const natureLabel = proPartNm;
  const chargeLine = decodeDisplayText(formatChargeLine(detail));
  const proPage = decodeDisplayText(String(detail?.proPage ?? "").trim());
  const etcNm = decodeDisplayText(String(detail?.etcNm ?? "").trim());
  const proPeriodBiz = [
    formatProDateDd(detail?.proFromDd),
    formatProDateDd(detail?.proToDd),
  ]
    .filter(Boolean)
    .join(" ~ ");
  const proSpaceLine = decodeDisplayText(String(detail?.proSpace ?? "").trim());
  const proCostLine = decodeDisplayText(String(detail?.proCost ?? "").trim());
  const proHowLine = decodeDisplayText(String(detail?.proHow ?? "").trim());

  const natureChecks = useMemo(
    () => natureChecksFromDetail(detail),
    [detail],
  );

  const proDepaLine = decodeDisplayText(String(detail?.proDepa ?? "").trim());
  const statusPillClass = statusPillClassFromRunNm(runStaNm);

  const breadcrumbItems = useMemo((): BizInfoBreadcrumbCrumb[] => {
    const items: BizInfoBreadcrumbCrumb[] = [];
    const currentLabel =
      proPartNm.trim() || contentTitle.trim() || "프로그램";

    items.push({ label: "홈", href: mainPathWithQuery, home: true });
    items.push({ label: roleLabel, href: mainPathWithQuery });

    if (reqGbPosition === 3 || reqGbPosition === 4) {
      items.push({ label: currentLabel, current: true });
      return items;
    }
    if (reqGbPosition === 5 || typeParam === "school") {
      items.push({ label: currentLabel, current: true });
      return items;
    }

    const schoolLabel =
      schoolGb && SCHOOL_GROUP_LABEL[schoolGb]
        ? SCHOOL_GROUP_LABEL[schoolGb]
        : "";
    if (schoolLabel) {
      items.push({ label: schoolLabel, href: schoolGroupHref });
    }
    const gl = gradeParamToLabel(grade);
    if (gl) {
      items.push({ label: gl, href: mainPathWithQuery });
    }
    items.push({ label: currentLabel, current: true });
    return items;
  }, [
    mainPathWithQuery,
    schoolGroupHref,
    roleLabel,
    schoolGb,
    grade,
    proPartNm,
    contentTitle,
    reqGbPosition,
    typeParam,
  ]);

  const sidebarAside = (
    <aside className="stickySidebar" aria-labelledby="sidebarTitle">
      <div className="userProfile">
        <div className="profileImg">
          <img src={profileImgSrc} alt="" />
        </div>
        <span className="badgeName">{roleLabel}</span>
      </div>
      <div id="sidebarTitle" className="categoryTitle">
        분야별 선택
      </div>
      <ul className="filterList">
        {(
          [
            ["eduFilter", 0, "교육 / 학습"],
            ["careerFilter", 1, "진로 / 진학"],
            ["cultureFilter", 2, "문화 / 예술 / 체험"],
            ["welfareFilter", 3, "복지 / 장학"],
            ["etcFilter", 4, "기타"],
          ] as const
        ).map(([id, idx, label]) => (
          <li key={id} className="filterItem">
            <input
              type="checkbox"
              id={id}
              className="chkInput"
              checked={natureChecks[idx]}
              onChange={() => undefined}
              tabIndex={-1}
            />
            <label htmlFor={id} className="chkLabel">
              {label}
            </label>
          </li>
        ))}
      </ul>
    </aside>
  );

  const titleBreadcrumbRow = (
    <div className="flex-sb mb-24">
      <div className="headTit">프로그램 정보</div>
      <nav className="breadcrumb" aria-label="브레드크럼">
        <ol className="breadcrumbList">
          {breadcrumbItems.map((c, i) => (
            <li key={`${c.label}-${i}`} className="breadcrumbItem">
              {c.current ? (
                <span aria-current="page">{c.label}</span>
              ) : c.home ? (
                <Link href={c.href ?? "#"} className="homeLink">
                  <img
                    src="/images/userWeb/icon/ico_home_gr.png"
                    alt="홈"
                    className="icoHome"
                  />
                  <span>홈</span>
                </Link>
              ) : (
                <Link href={c.href ?? "#"}>{c.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );

  const wrongGbRedirect =
    detail != null &&
    !loading &&
    Boolean(detail.proGb && detail.proGb !== EXPECTED_PRO_GB);

  if (proId && loading) {
    return (
      <section className="flex-content bizInfoDetail">
        {sidebarAside}
        <div className="rightContent">
          {titleBreadcrumbRow}
          <div className="mainBg">
            <p className="loading">상세 정보를 불러오는 중입니다.</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex-content bizInfoDetail">
        {sidebarAside}
        <div className="rightContent">
          {titleBreadcrumbRow}
          <div className="mainBg">
            <p className="error">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!detail || wrongGbRedirect) {
    return (
      <section className="flex-content bizInfoDetail">
        {sidebarAside}
        <div className="rightContent">
          {titleBreadcrumbRow}
          <div className="mainBg">
            {wrongGbRedirect ? (
              <p className="loading">페이지를 이동하는 중입니다.</p>
            ) : (
              <p className="error">상세 정보를 불러오지 못했습니다.</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="flex-content bizInfoDetail">
        {sidebarAside}
        <div className="rightContent">
          {titleBreadcrumbRow}
          <div className="mainBg">
            <article className="bizInfo">
              <div className="imageWrapper">
                {promoImageUrl ? (
                  <a
                    href={promoImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="홍보사진 크게 보기"
                  >
                    <img
                      src={mainImageSrc}
                      alt={contentTitle || "지역연계 진로체험 활동"}
                      className="mainImage"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.src !== `${IMG}/img_noImg.png`)
                          el.src = `${IMG}/img_noImg.png`;
                      }}
                    />
                  </a>
                ) : (
                  <img
                    src={mainImageSrc}
                    alt={contentTitle || "지역연계 진로체험 활동"}
                    className="mainImage"
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (el.src !== `${IMG}/img_noImg.png`)
                        el.src = `${IMG}/img_noImg.png`;
                    }}
                  />
                )}
              </div>
              <div className="infoWrapper">
                <div className="infoHead mb-16">
                  {natureLabel ? (
                    <div className="bizType">{natureLabel}</div>
                  ) : null}
                  <div className={`status ${statusPillClass}`}>{runStaNm}</div>
                </div>
                <div className="contentTitle">{contentTitle}</div>
                <div className="detailBox">
                  <ul className="detailList">
                    <li className="detailItem">
                      <strong className="itemLabel">모집기간</strong>
                      <span className="itemValue">{recPeriod}</span>
                    </li>
                    <li className="detailItem">
                      <strong className="itemLabel">사업대상</strong>
                      <span className="itemValue">{proTargetNm}</span>
                    </li>
                    <li className="detailItem">
                      <strong className="itemLabel">모집인원</strong>
                      <span className="itemValue">{recCntDisplay}</span>
                    </li>
                    <li className="detailItem">
                      <strong className="itemLabel">담당부서</strong>
                      <span className="itemValue">
                        {displayOrDash(proDepaLine)}
                      </span>
                    </li>
                    <li className="detailItem">
                      <strong className="itemLabel">홈페이지</strong>
                      <span className="itemValue">
                        {proPage ? (
                          <a
                            href={externalHref(proPage)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {proPage}
                          </a>
                        ) : (
                          displayOrDash("")
                        )}
                      </span>
                    </li>
                  </ul>
                  <div className="flex-sb">
                    <button
                      type="button"
                      className="hakwonButton"
                      id="openRoundModal"
                      aria-haspopup="dialog"
                      aria-controls="roundModal"
                      onClick={openRoundModal}
                    >
                      회차
                    </button>
                    {!hideSubmitButton && (
                      <button
                        type="button"
                        className="submitButton"
                        onClick={handleSubmitClick}
                      >
                        신청하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
            <div className="bizBox">
              <div className="title">사업개요</div>
              <div className="content">
                <ul>
                  {proPeriodBiz ? (
                    <li>
                      <div className="tit">사업기간</div>
                      <div className="con">{proPeriodBiz}</div>
                    </li>
                  ) : null}
                  {proDesc ? (
                    <li>
                      <div className="tit">사업내용</div>
                      <div className="con">{proDesc}</div>
                    </li>
                  ) : null}
                  {isPromoType && proSpaceLine ? (
                    <li>
                      <div className="tit">활동장소</div>
                      <div className="con">{proSpaceLine}</div>
                    </li>
                  ) : null}
                  {isPromoType && proCostLine ? (
                    <li>
                      <div className="tit">참가비용</div>
                      <div className="con">{proCostLine}</div>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
            <div className="bizBox">
              <div className="title">신청 및 참여방법</div>
              <div className="content">
                <ul>
                  {proHowLine ? (
                    <li>
                      <div className="tit">참여방법</div>
                      <div className="con">{proHowLine}</div>
                    </li>
                  ) : null}
                  {isPromoType && chargeLine ? (
                    <li>
                      <div className="tit">담당자</div>
                      <div className="con">{chargeLine}</div>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
            <div className="bizBox">
              <div className="title">홍보 및 참고사항</div>
              <div className="content">
                <ul>
                  {etcNm ? (
                    <li>
                      <div className="tit">기타 안내사항</div>
                      <div className="con">{etcNm}</div>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
            <div className="bizFile">
              <div className="title" id="fileDownloadTitle">
                첨부파일
              </div>
              <ul className="fileWrap" aria-labelledby="fileDownloadTitle">
                {Array.isArray(fileList) && fileList.length > 0 ? (
                  fileList.map((file: ArtpromFileItem, idx: number) => {
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
        </div>
      </section>

      <div
        className={`modalOverlay ${roundModalOpen ? "active" : ""}`}
        id="roundModalOverlay"
        aria-hidden={!roundModalOpen}
        onClick={(e) => e.target === e.currentTarget && closeRoundModal()}
      >
        <div
          className="modalContent"
          role="dialog"
          aria-labelledby="roundModalTitle"
          id="roundModal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modalHeader">
            <div id="roundModalTitle">회차</div>
            <button
              type="button"
              className="closeBtn"
              aria-label="닫기"
              onClick={closeRoundModal}
            >
              &times;
            </button>
          </div>
          <div className="modalBody">
            {roundListLoading ? (
              <p className="loading">회차 목록을 불러오는 중입니다.</p>
            ) : roundListError ? (
              <p className="error">{roundListError}</p>
            ) : scheduleList.length === 0 ? (
              <p className="empty">등록된 회차가 없습니다.</p>
            ) : (
              <ul className="bizList">
                {scheduleList.map((item, i) => (
                  <li key={`${item.proSeq ?? i}-${i}`} className="bizItem">
                    <div className="topInfo">
                      <strong className="bizName">
                        {Number(item.proSeq ?? 0) || i + 1}회차
                      </strong>
                    </div>
                    <dl className="infoList">
                      <dt>운영일자</dt>
                      <dd>{item.workDate ?? ""}</dd>
                      <dt>시작시간</dt>
                      <dd>{resolveScheduleStartTime(item)}</dd>
                      <dt>참여인원</dt>
                      <dd>{item.applyCntStr ?? item.recCnt ?? ""}</dd>
                      {item.item1 != null && String(item.item1).trim() !== "" && (
                        <>
                          <dt>분야</dt>
                          <dd>{item.item1}</dd>
                        </>
                      )}
                      {item.item2 != null && String(item.item2).trim() !== "" && (
                        <>
                          <dt>강연자</dt>
                          <dd>{item.item2}</dd>
                        </>
                      )}
                      {item.item3 != null && String(item.item3).trim() !== "" && (
                        <>
                          <dt>주제</dt>
                          <dd>{item.item3}</dd>
                        </>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BizInfoRcSection;
