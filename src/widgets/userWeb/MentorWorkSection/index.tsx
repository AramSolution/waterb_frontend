"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient, decodeDisplayText } from "@/shared/lib";
import { API_ENDPOINTS } from "@/shared/config/apiUser";
import { AuthService } from "@/entities/auth/api";

/** 사업검색 모달 항목 (GET /api/user/mentor-work/projects 응답) */
interface MentorWorkProjectItem {
  proId: string;
  proNm: string;
  runSta?: string;
  runStaNm?: string;
  reqDate?: string;
}

/** 정보조회 목록 1건 (POST /api/user/mentor-work/list 응답) */
interface MentorWorkAdviceItem {
  reqId?: string;
  proId?: string;
  proSeq?: string;
  reqEsntlId?: string;
  pEsntlId?: string;
  pUserNm?: string;
  pMbtlnum?: string;
  schoolNm?: string;
  schoolLvlNm?: string;
  schoolNoNm?: string;
  reqEsntlNm?: string;
  mbtlnum?: string;
  fullAdres?: string;
}

/**
 * 멘토업무 화면 (work_mt.html → React)
 * 원본: source/gunsan/work_mt.html
 * 조회조건 + 정보조회 테이블, 사업검색 모달. 헤더는 LayoutWrapper에서 유지.
 */
export default function MentorWorkSection() {
  const router = useRouter();
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [projectList, setProjectList] = useState<MentorWorkProjectItem[]>([]);
  const [projectListLoading, setProjectListLoading] = useState(false);
  const [selectedBizIndex, setSelectedBizIndex] = useState<number>(-1);
  const [selectedProId, setSelectedProId] = useState<string | null>(null);
  const [selectedProNm, setSelectedProNm] = useState("");
  const [askName, setAskName] = useState("");
  const [listData, setListData] = useState<MentorWorkAdviceItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const openBizModal = useCallback(() => setBizModalOpen(true), []);
  const closeBizModal = useCallback(() => setBizModalOpen(false), []);

  const handleSearch = useCallback(() => {
    if (!selectedProId || !selectedProId.trim()) {
      alert("사업을 선택해주세요.");
      return;
    }
    const advEsntlId = AuthService.getEsntlId();
    if (!advEsntlId || !advEsntlId.trim()) {
      alert("로그인이 필요합니다.");
      return;
    }
    setListLoading(true);
    apiClient
      .post<MentorWorkAdviceItem[]>(API_ENDPOINTS.USER_MENTOR_WORK.LIST, {
        proId: selectedProId.trim(),
        advEsntlId: advEsntlId.trim(),
        reqEsntlNm: askName.trim() || undefined,
      })
      .then((list) => setListData(Array.isArray(list) ? list : []))
      .catch(() => setListData([]))
      .finally(() => setListLoading(false));
  }, [selectedProId, askName]);

  useEffect(() => {
    if (!bizModalOpen) return;
    setProjectListLoading(true);
    apiClient
      .get<MentorWorkProjectItem[]>(API_ENDPOINTS.USER_MENTOR_WORK.PROJECTS)
      .then((list) => setProjectList(Array.isArray(list) ? list : []))
      .catch(() => setProjectList([]))
      .finally(() => setProjectListLoading(false));
  }, [bizModalOpen]);

  useEffect(() => {
    if (bizModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bizModalOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bizModalOpen) closeBizModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bizModalOpen, closeBizModal]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeBizModal();
  };

  return (
    <section className="inner">
      <div className="mainTitle">멘토업무</div>
      <div className="mainBg">
        <div className="bizInput">
          <section className="formSection">
            <div className="sectionHeader">
              <div className="sectionTitle">조회조건</div>
            </div>
            <div className="formGrid">
              <div className="formRow">
                <span className="formLabel">사업명</span>
                <div className="formControl">
                  <div className="inputWithBtn">
                    <input
                      type="text"
                      className="inputField bgGray"
                      readOnly
                      value={selectedProNm}
                      title="사업명을 입력해주세요"
                    />
                    <button
                      type="button"
                      className="btnSearch"
                      onClick={openBizModal}
                    >
                      검색
                    </button>
                  </div>
                </div>
              </div>
              <div className="formRow">
                <label htmlFor="askName" className="formLabel">
                  신청자명
                </label>
                <div className="formControl">
                  <input
                    type="text"
                    id="askName"
                    className="inputField"
                    placeholder="신청자명을 입력해주세요"
                    value={askName}
                    onChange={(e) => setAskName(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="formBtnWrap">
              <button
                type="button"
                className="btnPr"
                onClick={handleSearch}
                disabled={listLoading}
              >
                {listLoading ? "조회 중..." : "조회"}
              </button>
            </div>
          </section>

          <div className="certSection">
            <div className="sectionHeader mb-0">
              <div className="sectionTitle">정보조회</div>
            </div>
            <div className="tableWrapper">
              <table className="certTable work">
                <caption className="blind">
                  보호자명,보호자연락처,학교명,학년정보,학생명,학생연락처,주소,관리버튼을
                  포함한 정보조회목록
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="colPrName" title="보호자명">
                      보호자명
                    </th>
                    <th scope="col" className="colPrNum" title="보호자 연락처">
                      보호자 연락처
                    </th>
                    <th scope="col" className="colShName" title="학교명">
                      학교명
                    </th>
                    <th scope="col" className="colShNum" title="학년정보">
                      학년정보
                    </th>
                    <th scope="col" className="colStName" title="학생명">
                      학생명
                    </th>
                    <th scope="col" className="colStNum" title="학생 연락처">
                      학생 연락처
                    </th>
                    <th scope="col" className="colAdr" title="주소">
                      주소
                    </th>
                    <th scope="col" className="colMng" title="관리">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listData.length === 0 && !listLoading ? (
                    <tr>
                      <td colSpan={8} className="emptyCell">
                        사업 선택 후 조회 버튼을 눌러 주세요.
                      </td>
                    </tr>
                  ) : (
                    listData.map((item) => {
                      const gradeInfo =
                        [item.schoolLvlNm, item.schoolNoNm]
                          .filter(Boolean)
                          .join(" ") || "";
                      return (
                        <tr
                          key={
                            item.reqId ??
                            `${item.proId}-${item.reqEsntlNm}-${item.pEsntlId}`
                          }
                        >
                          <td className="cellPrName" title={item.pUserNm ?? ""}>
                            {item.pUserNm ?? ""}
                          </td>
                          <td className="cellPrNum" title={item.pMbtlnum ?? ""}>
                            {item.pMbtlnum ?? ""}
                          </td>
                          <td
                            className="cellShName"
                            title={item.schoolNm ?? ""}
                          >
                            {item.schoolNm ?? ""}
                          </td>
                          <td className="cellShNum" title={gradeInfo}>
                            {gradeInfo}
                          </td>
                          <td
                            className="cellStName"
                            title={item.reqEsntlNm ?? ""}
                          >
                            {item.reqEsntlNm ?? ""}
                          </td>
                          <td className="cellStNum" title={item.mbtlnum ?? ""}>
                            {item.mbtlnum ?? ""}
                          </td>
                          <td className="cellAdr" title={item.fullAdres ?? ""}>
                            <div className="ellipsis">
                              {item.fullAdres ?? ""}
                            </div>
                          </td>
                          <td className="cellMng" title="멘토일지">
                            <div className="btnGroup">
                              <button
                                type="button"
                                className="btnInquiry"
                                onClick={() => {
                                  const proId = item.proId ?? "";
                                  const reqEsntlId = item.reqEsntlId ?? "";
                                  if (!proId || !reqEsntlId) {
                                    alert(
                                      "신청 정보가 없어 이동할 수 없습니다.",
                                    );
                                    return;
                                  }
                                  const params = new URLSearchParams({
                                    proId,
                                    proGb: "03",
                                    from: "mentorWork",
                                    reqEsntlId,
                                  });
                                  const reqId = (item.reqId ?? "").trim();
                                  if (reqId) params.set("reqId", reqId);
                                  router.push(
                                    `/userWeb/bizInputCt?${params.toString()}`,
                                  );
                                }}
                              >
                                멘토일지
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
      </div>

      {/* 사업검색 모달 */}
      <div
        className={`modalOverlay ${bizModalOpen ? "active" : ""}`}
        aria-hidden={!bizModalOpen}
        onClick={handleOverlayClick}
      >
        <div
          className="modalContent"
          role="dialog"
          aria-labelledby="modalTitle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modalHeader">
            <div id="modalTitle">사업검색</div>
            <button
              type="button"
              className="closeBtn"
              onClick={closeBizModal}
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
          <div className="modalBody">
            {projectListLoading ? (
              <p className="loadingMessage">로딩 중...</p>
            ) : projectList.length === 0 ? (
              <p className="emptyMessage">사업 목록이 없습니다.</p>
            ) : (
              <ul className="bizList">
                {projectList.map((item, i) => {
                  const stateClass = item.runSta === "05" ? "green" : "blue";
                  return (
                    <li
                      key={item.proId}
                      className={`bizItem ${selectedBizIndex === i ? "active" : ""}`}
                      onClick={() => {
                        setSelectedBizIndex(i);
                        setSelectedProId(item.proId);
                        setSelectedProNm(decodeDisplayText(item.proNm ?? ""));
                        closeBizModal();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedBizIndex(i);
                          setSelectedProId(item.proId);
                          setSelectedProNm(decodeDisplayText(item.proNm ?? ""));
                          closeBizModal();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="topInfo">
                        <strong className="bizName">
                          {decodeDisplayText(item.proNm)}
                        </strong>
                        {item.runStaNm && (
                          <span className={`state ${stateClass}`}>
                            {decodeDisplayText(item.runStaNm)}
                          </span>
                        )}
                      </div>
                      <dl className="infoList">
                        <dt>ID</dt>
                        <dd>{item.proId}</dd>
                        {item.reqDate && (
                          <>
                            <dt>신청기간</dt>
                            <dd>{item.reqDate}</dd>
                          </>
                        )}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
