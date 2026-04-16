"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthService } from "@/entities/auth/api";
import { apiClient, ApiError } from "@/shared/lib";
import { API_CONFIG, API_ENDPOINTS } from "@/shared/config/apiUser";
import { UserArmuserService } from "@/entities/userWeb/armuser/api";
import type { ArmuserDTO } from "@/entities/adminWeb/armuser/api";
import { useUserWebAuthOptional } from "@/features/userWeb/auth/context/UserWebAuthContext";
import { AlertModal } from "@/shared/ui/userWeb";
import type { AlertModalType } from "@/shared/ui/userWeb";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";

const ICON = "/images/userWeb/icon";

/** 확장자 → biz.css .file.* 아이콘 클래스 */
function getFileTypeClass(filename: string): string {
  if (!filename) return "";
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["hwp", "hwpx"].includes(ext)) return "hwp";
  if (["pdf"].includes(ext)) return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext))
    return "img";
  if (["ppt", "pptx"].includes(ext)) return "ppt";
  if (["xls", "xlsx"].includes(ext)) return "xls";
  if (["zip", "rar", "7z"].includes(ext)) return "zip";
  return "";
}

function formatBrthdyForDateInput(raw: string | undefined): string {
  if (raw == null || raw === "") return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 8)
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  return "";
}

function buildAddressDisplay(u: ArmuserDTO | undefined): string {
  if (!u) return "";
  const zip = String(u.zip ?? "").trim();
  const base = String(u.adres ?? "").trim();
  const det = String(u.detailAdres ?? "").trim();
  const head =
    zip && base ? `(${zip}) ${base}` : base || (zip ? `(${zip})` : "");
  return [head, det].filter(Boolean).join(" ");
}

type TeacherKind = "" | "current" | "former";

type PendingLhFile = { id: string; file: File };

type MentorMypageServerFile = {
  fileId: string;
  seq: number;
  orgfNm: string;
};

function reqPlayToTeacherKind(reqPlay: string): TeacherKind {
  const s = String(reqPlay ?? "").trim();
  if (s.includes("전직")) return "former";
  if (s.includes("현직")) return "current";
  return "";
}

/**
 * 멘토 전용 — 공부의 명수 인생등대(proGb 09) 신청 UI
 * POST `/api/user/artappm/mentor-applications/{proId}` (data JSON, mentorApplicationFiles)
 */
const BizInputGstudyMentorLighthouseSection: React.FC<{
  proId?: string;
}> = ({ proId }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useUserWebAuthOptional();
  const isAuthenticated = auth?.isAuthenticated ?? false;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mypageDetailLoading, setMypageDetailLoading] = useState(false);
  const [mypageViewOnly, setMypageViewOnly] = useState(false);
  const [serverFiles, setServerFiles] = useState<MentorMypageServerFile[]>([]);

  const [mentorName, setMentorName] = useState("");
  const [mentorBirth, setMentorBirth] = useState("");
  const [mentorPhone, setMentorPhone] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [mentorAddress, setMentorAddress] = useState("");

  const [schoolNm, setSchoolNm] = useState("");
  const [teacherKind, setTeacherKind] = useState<TeacherKind>("");

  const [applyReason, setApplyReason] = useState("");
  const [careerInfo, setCareerInfo] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingLhFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<AlertModalType>("danger");
  const focusAfterAlertRef = useRef<string | null>(null);
  const afterLhAlertRef = useRef<(() => void) | null>(null);

  const showAlert = useCallback(
    (
      title: string,
      message: string,
      type: AlertModalType,
      focusId?: string,
      after?: () => void,
    ) => {
      focusAfterAlertRef.current = focusId ?? null;
      afterLhAlertRef.current = after ?? null;
      setAlertTitle(title);
      setAlertMessage(message);
      setAlertType(type);
      setShowAlertModal(true);
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !AuthService.isAuthenticated()) {
      setLoading(false);
      setLoadError("로그인 후 이용해 주세요.");
      return;
    }
    if (AuthService.getUserSe() !== "MNR") {
      setLoading(false);
      setLoadError("멘토 회원만 신청할 수 있습니다.");
      return;
    }
    const esntlId = AuthService.getEsntlId();
    if (!esntlId) {
      setLoading(false);
      setLoadError("회원 정보를 확인할 수 없습니다.");
      return;
    }
    let cancelled = false;
    setLoadError(null);
    setLoading(true);
    UserArmuserService.getDetail(esntlId)
      .then((res) => {
        if (cancelled) return;
        const u = res?.detail;
        if (!u) {
          setLoadError("회원 정보를 불러오지 못했습니다.");
          return;
        }
        setMentorName(String(u.userNm ?? "").trim());
        setMentorBirth(formatBrthdyForDateInput(String(u.brthdy ?? "")));
        const phone = formatPhoneWithHyphen(
          String(u.mbtlnum ?? u.usrTelno ?? "").trim(),
        );
        setMentorPhone(phone);
        setMentorEmail(String(u.emailAdres ?? "").trim());
        setMentorAddress(buildAddressDisplay(u));
      })
      .catch(() => {
        if (!cancelled) setLoadError("회원 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const pageProId = proId?.trim() || "";

  const buildMentorFileViewUrl = (fileId: string, seq: number) => {
    const base = API_CONFIG.BASE_URL?.replace(/\/$/, "") || "";
    return `${base}${API_ENDPOINTS.FILES.VIEW}?fileId=${encodeURIComponent(fileId)}&seq=${encodeURIComponent(String(seq))}`;
  };

  const fromMypage = searchParams.get("from") === "mypage";
  const myReqId = (searchParams.get("reqId") ?? "").trim();

  useEffect(() => {
    if (!fromMypage || !myReqId) {
      setMypageDetailLoading(false);
      setMypageViewOnly(false);
      setServerFiles([]);
      return;
    }
    if (!isAuthenticated || !AuthService.isAuthenticated()) {
      setMypageDetailLoading(false);
      return;
    }
    if (AuthService.getUserSe() !== "MNR") {
      setMypageDetailLoading(false);
      return;
    }

    let cancelled = false;
    setMypageDetailLoading(true);
    setMypageViewOnly(false);
    setServerFiles([]);

    apiClient
      .get<{
        detail?: Record<string, unknown> | null;
        fileList?: Array<Record<string, unknown>>;
      }>(API_ENDPOINTS.USER_ARTAPPM.MENTOR_APPLICATION_BY_REQ_ID(myReqId))
      .then((res) => {
        if (cancelled) return;
        const d = res?.detail;
        if (d == null) {
          setLoadError("신청 정보를 찾을 수 없습니다.");
          return;
        }
        const dProId = String(d.proId ?? "").trim();
        if (pageProId && dProId && dProId !== pageProId) {
          setLoadError("요청한 사업과 신청 내역이 일치하지 않습니다.");
          return;
        }

        setSchoolNm(String(d.collegeNm ?? "").trim());
        setTeacherKind(reqPlayToTeacherKind(String(d.reqPlay ?? "")));
        setApplyReason(String(d.reqReason ?? "").trim());
        setCareerInfo(String(d.career ?? "").trim());

        const fl = res?.fileList;
        if (Array.isArray(fl) && fl.length > 0) {
          setServerFiles(
            fl
              .map((x) => ({
                fileId: String(x.fileId ?? ""),
                seq: Number(x.seq ?? 0),
                orgfNm: String(x.orgfNm ?? "").trim(),
              }))
              .filter((f) => f.fileId !== ""),
          );
        } else {
          setServerFiles([]);
        }

        setPendingFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setMypageViewOnly(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setLoadError("본인 신청만 조회할 수 있습니다.");
        } else {
          setLoadError("신청 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setMypageDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fromMypage, myReqId, isAuthenticated, pageProId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: PendingLhFile[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      next.push({ id: `${Date.now()}_${i}_${file.name}`, file });
    }
    setPendingFiles((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const removePendingFile = (id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = () => {
    if (mypageViewOnly) return;
    setSchoolNm("");
    setTeacherKind("");
    setApplyReason("");
    setCareerInfo("");
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateExtraInfo = (): boolean => {
    if (!schoolNm.trim()) {
      showAlert("안내", "소속학교명을 입력해 주세요.", "danger", "lhSchoolNm");
      return false;
    }
    if (teacherKind === "") {
      showAlert(
        "안내",
        "구분(현직교사·전직교사)을 선택해 주세요.",
        "danger",
        "lhTeacherCurrent",
      );
      return false;
    }
    return true;
  };

  const validateApplyInfo = (): boolean => {
    if (!applyReason.trim()) {
      showAlert(
        "안내",
        "지원사유를 입력해 주세요.",
        "danger",
        "lhApplyReason",
      );
      return false;
    }
    if (!careerInfo.trim()) {
      showAlert("안내", "경력정보를 입력해 주세요.", "danger", "lhCareerInfo");
      return false;
    }
    return true;
  };

  const loginId = AuthService.getEsntlId() ?? "";

  const buildLhMentorApplicationData = (): Record<string, unknown> => {
    const kindLabel =
      teacherKind === "current"
        ? "현직교사"
        : teacherKind === "former"
          ? "전직교사"
          : "";
    return {
      proGb: "09",
      proSeq: 0,
      collegeNm: schoolNm.trim(),
      leaveYn: "N",
      majorNm: "",
      schoolLvl: 0,
      studentId: "",
      hschoolNm: "",
      reqPlay: kindLabel,
      reqReason: applyReason.trim(),
      career: careerInfo.trim(),
      sttusCode: "A",
      fileId: "",
    };
  };

  const submitLhMentorInsert = () => {
    if (!pageProId) {
      showAlert("알림", "지원사업을 선택한 뒤 이용해 주세요.", "danger");
      return;
    }
    if (!loginId) {
      showAlert("알림", "로그인 정보를 확인할 수 없습니다.", "danger");
      return;
    }
    const data = buildLhMentorApplicationData();
    const formData = new FormData();
    formData.append(
      "data",
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    pendingFiles.forEach(({ file }) => {
      formData.append("mentorApplicationFiles", file);
    });
    apiClient
      .post<{ result?: string; message?: string }>(
        API_ENDPOINTS.USER_ARTAPPM.MENTOR_APPLICATION_REGISTER(pageProId),
        formData,
      )
      .then((res) => {
        const result = res?.result ?? "";
        if (result === "40") {
          showAlert(
            "알림",
            res?.message ?? "로그인이 필요합니다.",
            "danger",
          );
          return;
        }
        if (result === "50") {
          showAlert(
            "알림",
            res?.message ?? "동일한 지원사업 신청 건이 이미 존재합니다.",
            "danger",
          );
          return;
        }
        if (result === "02") {
          showAlert(
            "알림",
            res?.message ?? "자격 조건을 충족하지 않습니다.",
            "danger",
          );
          return;
        }
        if (result === "00") {
          const reqGbPosition = searchParams.get("reqGbPosition");
          const typeParam = searchParams.get("type");
          const q = new URLSearchParams();
          if (reqGbPosition) q.set("reqGbPosition", reqGbPosition);
          if (typeParam === "mentor") q.set("type", "mentor");
          const mainUrl =
            "/userWeb/main" + (q.toString() ? "?" + q.toString() : "");
          showAlert(
            "신청 완료",
            "신청이 완료되었습니다.",
            "success",
            undefined,
            () => {
              router.replace(mainUrl);
            },
          );
          setPendingFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        showAlert(
          "알림",
          res?.message ?? "처리 중 오류가 발생했습니다.",
          "danger",
        );
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          showAlert(
            "알림",
            "로그인이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요.",
            "danger",
          );
          return;
        }
        showAlert("알림", "저장 중 오류가 발생했습니다.", "danger");
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mypageViewOnly) return;
    if (!pageProId) {
      showAlert("안내", "사업 정보(proId)가 없습니다.", "danger");
      return;
    }
    if (!AuthService.isAuthenticated() || AuthService.getUserSe() !== "MNR") {
      showAlert("알림", "멘토 로그인 후 이용해 주세요.", "danger");
      return;
    }
    if (!loginId) {
      showAlert("알림", "회원 정보를 확인할 수 없습니다.", "danger");
      return;
    }
    if (!validateExtraInfo()) return;
    if (!validateApplyInfo()) return;
    submitLhMentorInsert();
  };

  const qProGb = searchParams.get("proGb");

  return (
    <section className="inner">
      <div className="mainBg">
        <div className="registrationContainer bizInput">
          {pageProId ? (
            <p className="sr-only">지원사업 코드 {pageProId}</p>
          ) : null}
          {qProGb === "09" ? (
            <p className="sr-only">공부의 명수 인생등대</p>
          ) : null}
          {loadError ? (
            <p className="error" role="alert">
              {loadError}
            </p>
          ) : null}
          {loading || mypageDetailLoading ? (
            <p className="loading" role="status">
              정보를 불러오는 중입니다.
            </p>
          ) : null}
          {!loadError && !loading && !mypageDetailLoading ? (
            <form className="mainForm" onSubmit={handleSubmit} noValidate>
              <section
                className="formSection"
                aria-labelledby="lhMentorInfoTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="lhMentorInfoTitle">
                    멘토정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="lhDispName" className="formLabel">
                        이름
                      </label>
                      <div className="formControl">
                        <input
                          type="text"
                          id="lhDispName"
                          className="inputField bgGray"
                          readOnly
                          value={mentorName}
                          aria-label="이름"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="lhDispBirth" className="formLabel">
                        생년월일
                      </label>
                      <div className="formControl">
                        <input
                          type="date"
                          id="lhDispBirth"
                          className="inputField bgGray"
                          readOnly
                          value={mentorBirth}
                          aria-label="생년월일"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow split">
                    <div className="fieldUnit">
                      <label htmlFor="lhDispPhone" className="formLabel">
                        연락처
                      </label>
                      <div className="formControl">
                        <input
                          type="tel"
                          id="lhDispPhone"
                          className="inputField bgGray"
                          readOnly
                          value={mentorPhone}
                          aria-label="연락처"
                        />
                      </div>
                    </div>
                    <div className="fieldUnit">
                      <label htmlFor="lhDispEmail" className="formLabel">
                        이메일
                      </label>
                      <div className="formControl">
                        <input
                          type="email"
                          id="lhDispEmail"
                          className="inputField bgGray"
                          readOnly
                          value={mentorEmail}
                          aria-label="이메일"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="formRow">
                    <span className="formLabel">주소</span>
                    <div className="formControl addressContainer">
                      <input
                        type="text"
                        className="inputField bgGray"
                        readOnly
                        title="주소"
                        aria-label="주소"
                        value={mentorAddress}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="formSection"
                aria-labelledby="lhExtraInfoTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="lhExtraInfoTitle">
                    기타정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow gstudyApplyRow">
                    <span className="formLabel" id="lhLblTeacherKind">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      구분
                    </span>
                    <div className="formControl">
                      <div
                        className="customGroup"
                        role="radiogroup"
                        aria-labelledby="lhLblTeacherKind"
                      >
                        <label className="customItem">
                          <input
                            type="radio"
                            name="lhTeacherKind"
                            id="lhTeacherCurrent"
                            className="customInput"
                            checked={teacherKind === "current"}
                            onChange={() => setTeacherKind("current")}
                            aria-required="true"
                            disabled={mypageViewOnly}
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">현직교사</span>
                          </div>
                        </label>
                        <label className="customItem">
                          <input
                            type="radio"
                            name="lhTeacherKind"
                            id="lhTeacherFormer"
                            className="customInput"
                            checked={teacherKind === "former"}
                            onChange={() => setTeacherKind("former")}
                            aria-required="true"
                            disabled={mypageViewOnly}
                          />
                          <div className="customBox">
                            <span className="customIcon" aria-hidden="true" />
                            <span className="customText">전직교사</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="formRow gstudyApplyRow">
                    <label htmlFor="lhSchoolNm" className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      소속학교명
                    </label>
                    <div className="formControl">
                      <input
                        type="text"
                        id="lhSchoolNm"
                        className="inputField"
                        value={schoolNm}
                        onChange={(e) => setSchoolNm(e.target.value)}
                        placeholder="소속 학교명을 입력해 주세요"
                        aria-required="true"
                        autoComplete="organization"
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="formSection"
                aria-labelledby="lhApplyInfoTitle"
              >
                <div className="sectionHeader">
                  <div className="sectionTitle" id="lhApplyInfoTitle">
                    신청정보
                  </div>
                </div>
                <div className="formGrid">
                  <div className="formRow">
                    <label htmlFor="lhApplyReason" className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      지원사유
                    </label>
                    <div className="formControl">
                      <textarea
                        id="lhApplyReason"
                        className="textAreaField mentorApplyLarge"
                        value={applyReason}
                        onChange={(e) => setApplyReason(e.target.value)}
                        placeholder="지원 사유를 입력해 주세요"
                        aria-required="true"
                        rows={8}
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow">
                    <label htmlFor="lhCareerInfo" className="formLabel">
                      <span className="requiredMark" aria-hidden="true">
                        *
                      </span>
                      경력정보
                    </label>
                    <div className="formControl">
                      <textarea
                        id="lhCareerInfo"
                        className="textAreaField mentorApplyLarge"
                        value={careerInfo}
                        onChange={(e) => setCareerInfo(e.target.value)}
                        placeholder="관련 경력을 입력해 주세요"
                        aria-required="true"
                        rows={8}
                        readOnly={mypageViewOnly}
                      />
                    </div>
                  </div>
                  <div className="formRow gstudyAttachRow">
                    <span className="formLabel">
                      첨부파일
                      {!mypageViewOnly ? (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            id="lhFileInput"
                            className="hiddenInput"
                            multiple
                            onChange={handleFileSelect}
                          />
                          <label
                            htmlFor="lhFileInput"
                            className="btnFileAdd"
                            aria-label="파일 첨부하기"
                          >
                            <img
                              src={`${ICON}/ico_file_add.png`}
                              alt=""
                              aria-hidden="true"
                            />
                          </label>
                        </>
                      ) : null}
                    </span>
                    <div className="formControl fileListContainer">
                      {serverFiles.length === 0 && pendingFiles.length === 0 ? (
                        <span className="fileListEmpty">
                          첨부된 파일이 없습니다.
                        </span>
                      ) : (
                        <>
                          {serverFiles.map((sf) => {
                            const label = sf.orgfNm || "첨부파일";
                            const typeClass = getFileTypeClass(label);
                            const viewUrl = buildMentorFileViewUrl(
                              sf.fileId,
                              sf.seq,
                            );
                            return (
                              <div
                                key={`s_${sf.fileId}_${sf.seq}`}
                                className={`file ${typeClass}`.trim()}
                              >
                                <a
                                  href={viewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {label}
                                </a>
                              </div>
                            );
                          })}
                          {!mypageViewOnly
                            ? pendingFiles.map((p) => {
                                const label = p.file.name;
                                const typeClass = getFileTypeClass(label);
                                return (
                                  <div
                                    key={p.id}
                                    className={`file ${typeClass}`.trim()}
                                  >
                                    <span>{label}</span>
                                    <button
                                      type="button"
                                      className="btnFileDel"
                                      aria-label={`${label} 삭제`}
                                      onClick={() => removePendingFile(p.id)}
                                    >
                                      <img
                                        src={`${ICON}/ico_file_del.png`}
                                        alt=""
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </div>
                                );
                              })
                            : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {!mypageViewOnly ? (
                <div className="formActions">
                  <button
                    type="button"
                    className="btnWhite"
                    onClick={handleReset}
                    aria-label="신청 입력 내용 초기화"
                  >
                    초기화
                  </button>
                  <button type="submit" className="btnSubmit" aria-label="신청">
                    신청
                  </button>
                </div>
              ) : null}
            </form>
          ) : null}
        </div>
      </div>

      <AlertModal
        isOpen={showAlertModal}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onConfirm={() => {
          setShowAlertModal(false);
          const id = focusAfterAlertRef.current;
          focusAfterAlertRef.current = null;
          const after = afterLhAlertRef.current;
          afterLhAlertRef.current = null;
          if (after) {
            requestAnimationFrame(() => after());
          } else if (id) {
            requestAnimationFrame(() => document.getElementById(id)?.focus());
          }
        }}
      />
    </section>
  );
};

export default BizInputGstudyMentorLighthouseSection;
