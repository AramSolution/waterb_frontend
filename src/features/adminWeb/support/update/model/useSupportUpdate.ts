import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SupportService,
  SupportDetailParams,
  type SupportFileItem,
} from "@/entities/adminWeb/support/api";
import { CmmCodeService } from "@/entities/adminWeb/code/api";
import { SUPPORT_CHARGE_DEPT_CODE_ID } from "@/features/adminWeb/support/lib/supportChargeDeptCodeId";
import {
  ApiError,
  TokenUtils,
  downloadWaterbAttachment,
  decodeDisplayText,
} from "@/shared/lib";
import { formatPhoneWithHyphen } from "@/shared/lib/inputValidation";
import {
  SupportRegisterFormData,
  ValidationErrors,
} from "@/features/adminWeb/support/register/model";
import {
  booleansFromYnPipe,
  ynPipeFromBooleans,
} from "@/entities/adminWeb/support/lib/proPartNature";

function fromYYYYMMDD(value?: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function useSupportUpdate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = searchParams?.get("proId") || "";
  const from = searchParams?.get("from") || ""; // study: 스터디사업 상세(청소년 전용 필드 비노출)

  const [formData, setFormData] = useState<SupportRegisterFormData>({
    businessNm: "",
    businessCode: "",
    statusCode: "01", // 기본값: 접수예정
    targetName: "",
    recruitTarget: [],
    proNature: [false, false, false, false, false],
    recruitStartDate: "",
    recruitEndDate: "",
    recruitCount: "0", // 모집인원수 기본값 0
    businessPeriodStart: "",
    businessPeriodEnd: "",
    businessSummary: "",
    businessContent: "",
    etcNm: "",
    applyMethod: "",
    homepage: "",
    reqGb: [false, false, false, false, false], // [학생, 학부모, 학원, 멘토, 학교]
    chargeDept: "",
    chargePerson: "",
    contact: "",
    basicYn: "",
    poorYn: "",
    singleYn: "",
    programType: [],
  });
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");
  /** true: 저장(수정) 성공 후 확인 시 목록으로 이동. 첨부/홍보 파일 삭제 성공은 false로 상세 유지 */
  const [messageDialogNavigateToList, setMessageDialogNavigateToList] =
    useState(false);

  // 첨부파일 관련 상태
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [selectedPromoFile, setSelectedPromoFile] = useState<File | null>(null);
  // 상세 조회 시 기존 파일 그룹 ID (수정 시 새 파일 추가/홍보파일 교체에 사용)
  const [existingProFileId, setExistingProFileId] = useState("");
  const [existingFileId, setExistingFileId] = useState("");
  // 상세 조회 시 기존 홍보파일·첨부파일 목록 (화면 표시용)
  const [existingProFileList, setExistingProFileList] = useState<
    SupportFileItem[]
  >([]);
  const [existingFileList, setExistingFileList] = useState<SupportFileItem[]>(
    [],
  );
  // 상세 조회 시 기존 proGb 값 (수정 시 유지)
  const [existingProGb, setExistingProGb] = useState<string>("");

  const [chargeDeptOptions, setChargeDeptOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [chargeDeptLoading, setChargeDeptLoading] = useState(true);

  // 파일 삭제 확인 다이얼로그 관련 상태
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = useState<
    "proFile" | "file"
  >("file");
  const [fileToDelete, setFileToDelete] = useState<{
    fileId: string | number;
    seq: string | number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchChargeDeptOptions() {
      setChargeDeptLoading(true);
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId(
          SUPPORT_CHARGE_DEPT_CODE_ID,
        );
        if (cancelled) return;
        setChargeDeptOptions(
          list.map((item) => ({
            value: item.code,
            label: item.codeNm || item.code,
          })),
        );
      } catch (err) {
        console.error("담당부서 코드 조회 실패:", err);
        if (!cancelled) setChargeDeptOptions([]);
      } finally {
        if (!cancelled) setChargeDeptLoading(false);
      }
    }

    fetchChargeDeptOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 상세 정보 조회
  useEffect(() => {
    const fetchDetail = async () => {
      if (!proId) {
        setError("사업ID가 필요합니다.");
        setDetailLoading(false);
        return;
      }

      try {
        setDetailLoading(true);
        setError("");

        if (!TokenUtils.isTokenValid()) {
          setError("로그인이 필요합니다. 다시 로그인해주세요.");
          setTimeout(() => {
            window.location.href = "/adminWeb/login";
          }, 2000);
          return;
        }

        const params: SupportDetailParams = {
          proId: proId,
        };

        const response = await SupportService.getSupportDetail(params);

        if (response.result === "00" && response.detail) {
          const detail = response.detail;

          // 사업대상 문자열을 배열로 변환 (DB 형식 E1|J1|H1|T1 그대로 사용)
          const recruitTargetArray = detail.proTarget
            ? detail.proTarget
                .split("|")
                .map((v) => v.trim())
                .filter((v) => v !== "")
            : [];

          // REQ_GB 파싱: y|y|n|n|n 형식 -> [학생, 학부모, 학원, 멘토, 학교] boolean 배열
          const parseReqGb = (reqGb: string): boolean[] => {
            if (!reqGb) return [false, false, false, false, false];
            const parts = reqGb.split("|");
            const isY = (value?: string): boolean =>
              (value ?? "").trim().toLowerCase() === "y";
            return [
              isY(parts[0]),
              isY(parts[1]),
              isY(parts[2]),
              isY(parts[3]),
              isY(parts[4]),
            ];
          };

          setFormData({
            businessNm: decodeDisplayText(detail.proNm || ""),
            businessCode: detail.proId || "",
            statusCode: detail.runSta || "01", // 진행상태 (runSta 사용)
            targetName: decodeDisplayText(
              (detail as any).proTargetNm || "",
            ),
            recruitTarget: recruitTargetArray,
            proNature: booleansFromYnPipe(
              (detail as { proPart?: string }).proPart,
              5,
            ),
            recruitStartDate: detail.recruitStartDate || "",
            recruitEndDate: detail.recruitEndDate || "",
            recruitCount: detail.recCnt?.toString() || "0", // 모집인원수 없으면 0
            businessPeriodStart: fromYYYYMMDD(
              (detail as { proFromDd?: string }).proFromDd,
            ),
            businessPeriodEnd: fromYYYYMMDD(
              (detail as { proToDd?: string }).proToDd,
            ),
            businessSummary: decodeDisplayText(detail.proSum || ""),
            businessContent: decodeDisplayText(detail.proDesc || ""),
            etcNm: decodeDisplayText((detail as any).etcNm ?? ""),
            applyMethod: decodeDisplayText(
              (detail as { proHow?: string }).proHow || "",
            ),
            homepage: decodeDisplayText(
              (detail as { proPage?: string }).proPage || "",
            ),
            reqGb: parseReqGb(
              (detail as { reqGb?: string }).reqGb ?? "",
            ),
            chargeDept: String(
              (detail as { proDepa?: string }).proDepa ?? "",
            ).trim(),
            chargePerson: decodeDisplayText(
              (detail as { proCharge?: string }).proCharge || "",
            ),
            contact: (detail as { proTel?: string }).proTel
              ? formatPhoneWithHyphen(
                  String((detail as { proTel?: string }).proTel).replace(
                    /\D/g,
                    "",
                  ),
                )
              : "",
            // 스터디사업 전용 필드
            basicYn: (detail as any).basicYn || "",
            poorYn: (detail as any).poorYn || "",
            singleYn: (detail as any).singleYn || "",
            programType: detail.eduGb ? [detail.eduGb] : [],
          });
          setExistingProFileId(detail.proFileId ?? "");
          setExistingFileId(detail.fileId ?? "");
          // 기존 proGb 값 저장 (수정 시 유지)
          setExistingProGb(detail.proGb || "");
          const res = response as {
            proFileList?: SupportFileItem[];
            fileList?: SupportFileItem[];
          };
          setExistingProFileList(
            Array.isArray(res.proFileList) ? res.proFileList : [],
          );
          setExistingFileList(Array.isArray(res.fileList) ? res.fileList : []);
        } else {
          setError("지원사업 정보를 불러올 수 없습니다.");
        }
      } catch (err) {
        console.error("지원사업 상세 조회 실패:", err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setError("인증에 실패했습니다. 다시 로그인해주세요.");
            setTimeout(() => {
              window.location.href = "/adminWeb/login";
            }, 2000);
          } else {
            setError(
              err.message || "지원사업 정보를 불러오는 중 오류가 발생했습니다.",
            );
          }
        } else {
          setError("지원사업 정보를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setDetailLoading(false);
      }
    };

    fetchDetail();
  }, [proId]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    let nextValue: string = value;
    if (name === "recruitCount") {
      nextValue = value.replace(/\D/g, "");
    } else if (name === "contact") {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      nextValue = formatPhoneWithHyphen(digits);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    // 에러 메시지 초기화
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    setFormData((prev) => {
      if (checked) {
        return {
          ...prev,
          recruitTarget: [...prev.recruitTarget, value],
        };
      } else {
        return {
          ...prev,
          recruitTarget: prev.recruitTarget.filter((item) => item !== value),
        };
      }
    });

    // 에러 메시지 초기화
    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // 스터디사업: 사업구분(마중물/희망) 체크박스 변경 핸들러
  const handleProgramTypeChange = (value: string, checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // 하나만 선택 가능: 새 값으로 대체
        return {
          ...prev,
          programType: [value],
        };
      }

      return {
        ...prev,
        programType: prev.programType.filter((item) => item !== value),
      };
    });

    if (errors.programType) {
      setErrors((prev) => ({
        ...prev,
        programType: undefined,
      }));
    }
  };

  // 신청구분 체크박스 변경 핸들러
  const handleReqGbChange = (index: number, checked: boolean) => {
    setFormData((prev) => {
      const newReqGb = [...prev.reqGb];
      newReqGb[index] = checked;
      return {
        ...prev,
        reqGb: newReqGb,
      };
    });
    if (errors.reqGb) {
      setErrors((prev) => ({ ...prev, reqGb: undefined }));
    }
  };

  const handleProNatureChange = (index: number, checked: boolean) => {
    setFormData((prev) => {
      const next = [...prev.proNature];
      next[index] = checked;
      return { ...prev, proNature: next };
    });
  };

  const handleBusinessContentChange = (html: string) => {
    setFormData((prev) => ({ ...prev, businessContent: html }));
    if (errors.businessContent) {
      setErrors((prev) => ({ ...prev, businessContent: undefined }));
    }
  };

  // 그룹별 전체 선택/해제 핸들러
  const handleGroupSelectAll = (groupValues: string[], checked: boolean) => {
    setFormData((prev) => {
      if (checked) {
        // 그룹 내 모든 항목 추가 (중복 제거)
        const newTargets = [...prev.recruitTarget];
        groupValues.forEach((value) => {
          if (!newTargets.includes(value)) {
            newTargets.push(value);
          }
        });
        return {
          ...prev,
          recruitTarget: newTargets,
        };
      } else {
        // 그룹 내 모든 항목 제거
        return {
          ...prev,
          recruitTarget: prev.recruitTarget.filter(
            (item) => !groupValues.includes(item),
          ),
        };
      }
    });

    // 에러 메시지 초기화
    if (errors.recruitTarget) {
      setErrors((prev) => ({
        ...prev,
        recruitTarget: undefined,
      }));
    }
  };

  // 그룹 전체 선택 상태 확인
  const isGroupAllSelected = (groupValues: string[]): boolean => {
    return groupValues.every((value) => formData.recruitTarget.includes(value));
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setSelectedFiles((prev) => {
      const toAdd = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
      }));
      return [...prev, ...toAdd];
    });
  };

  const handlePromoFileSelected = (file: File) => {
    setSelectedPromoFile(file);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const removePromoFile = () => {
    setSelectedPromoFile(null);
  };

  // 홍보파일 삭제 확인 다이얼로그 표시
  const handleDeleteProFileClick = (
    fileId: string | number,
    seq: string | number,
  ) => {
    setDeleteConfirmType("proFile");
    setFileToDelete({ fileId, seq });
    setShowDeleteConfirmDialog(true);
  };

  // 첨부파일 삭제 확인 다이얼로그 표시
  const handleDeleteFileClick = (
    fileId: string | number,
    seq: string | number,
  ) => {
    setDeleteConfirmType("file");
    setFileToDelete({ fileId, seq });
    setShowDeleteConfirmDialog(true);
  };

  /** 저장된 홍보파일 1건 삭제 (API 호출 후 목록에서 제거) */
  const deleteExistingProFile = async (
    fileId: string | number,
    seq: string | number,
  ) => {
    if (!proId) return;
    try {
      const response = await SupportService.deleteProFile(proId, fileId, seq);
      if (response.result === "00") {
        setExistingProFileList((prev) => {
          const next = prev.filter(
            (f) =>
              String(f.fileId) !== String(fileId) ||
              String(f.seq) !== String(seq),
          );
          if (next.length === 0) setExistingProFileId("");
          return next;
        });
        setMessageDialogTitle("삭제 완료");
        setMessageDialogMessage(
          response.message || "홍보파일이 삭제되었습니다.",
        );
        setMessageDialogNavigateToList(false);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("삭제 실패");
        setMessageDialogMessage(
          response.message || "홍보파일 삭제에 실패했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle("삭제 실패");
      setMessageDialogMessage(
        err instanceof ApiError
          ? err.message
          : "홍보파일 삭제 중 오류가 발생했습니다.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  /** 저장된 첨부파일 1건 삭제 (API 호출 후 목록에서 제거) */
  const deleteExistingFile = async (
    fileId: string | number,
    seq: string | number,
  ) => {
    if (!proId) return;
    try {
      const response = await SupportService.deleteFile(proId, fileId, seq);
      if (response.result === "00") {
        setExistingFileList((prev) => {
          const next = prev.filter(
            (f) =>
              String(f.fileId) !== String(fileId) ||
              String(f.seq) !== String(seq),
          );
          if (next.length === 0) setExistingFileId("");
          return next;
        });
        setMessageDialogTitle("삭제 완료");
        setMessageDialogMessage(
          response.message || "첨부파일이 삭제되었습니다.",
        );
        setMessageDialogNavigateToList(false);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("삭제 실패");
        setMessageDialogMessage(
          response.message || "첨부파일 삭제에 실패했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle("삭제 실패");
      setMessageDialogMessage(
        err instanceof ApiError
          ? err.message
          : "첨부파일 삭제 중 오류가 발생했습니다.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 사업명 필수 체크
    if (!formData.businessNm || formData.businessNm.trim() === "") {
      newErrors.businessNm = "사업명을 입력해주세요.";
      isValid = false;
    }

    if (!formData.businessPeriodStart || formData.businessPeriodStart.trim() === "") {
      newErrors.businessPeriodStart = "시작일을 선택해주세요.";
      isValid = false;
    }
    if (!formData.businessPeriodEnd || formData.businessPeriodEnd.trim() === "") {
      newErrors.businessPeriodEnd = "종료일을 선택해주세요.";
      isValid = false;
    }
    if (formData.businessPeriodStart && formData.businessPeriodEnd) {
      if (formData.businessPeriodStart > formData.businessPeriodEnd) {
        newErrors.businessPeriodEnd = "종료일은 시작일 이후여야 합니다.";
        isValid = false;
      }
    }

    // 모집기간 시작일 필수 체크
    if (!formData.recruitStartDate || formData.recruitStartDate.trim() === "") {
      newErrors.recruitStartDate = "시작일을 선택해주세요.";
      isValid = false;
    }

    // 모집기간 종료일 필수 체크
    if (!formData.recruitEndDate || formData.recruitEndDate.trim() === "") {
      newErrors.recruitEndDate = "종료일을 선택해주세요.";
      isValid = false;
    }

    // 모집기간 날짜 순서 검증
    if (formData.recruitStartDate && formData.recruitEndDate) {
      if (formData.recruitStartDate > formData.recruitEndDate) {
        newErrors.recruitEndDate = "종료일은 시작일 이후여야 합니다.";
        isValid = false;
      }
    }

    // 기타내용 최대 512자
    if (formData.etcNm && formData.etcNm.trim().length > 512) {
      newErrors.etcNm = "기타내용은 512자 이내로 입력해주세요.";
      isValid = false;
    }

    // 스터디사업인 경우 사업구분(마중물/희망) 필수 체크
    if (existingProGb === "02") {
      if (!formData.programType || formData.programType.length === 0) {
        newErrors.programType = "사업구분을 선택해주세요.";
        isValid = false;
      }
    }

    // 신청구분: 화면에 노출되는 학생·학부모 중 하나 이상
    if (!formData.reqGb[0] && !formData.reqGb[1]) {
      newErrors.reqGb = "학생 또는 학부모/일반을 하나 이상 선택해주세요.";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName === "reqGb") {
        document
          .getElementById("support-req-gb")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstErrorFieldName) {
        const firstErrorField = document.querySelector<
          HTMLInputElement | HTMLTextAreaElement
        >(
          `input[name="${firstErrorFieldName}"], textarea[name="${firstErrorFieldName}"]`,
        );
        if (firstErrorField) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // REQ_GB 변환: [학생, 학부모, 학원, 멘토, 학교] — 5자리
      const reqGbString = [
        formData.reqGb[0],
        formData.reqGb[1],
        formData.reqGb[2],
        formData.reqGb[3],
        formData.reqGb[4],
      ]
        .map((checked) => (checked ? "Y" : "N"))
        .join("|");

      // 스터디사업: proGb=02, eduGb=01/02(마중물/희망)
      const eduGbCode = formData.programType[0] || "";

      // 백엔드 API 호출 (새 홍보사진·첨부파일 전달 시 ARTFILE 저장 후 PRO_FILE_ID, FILE_ID 반영)
      const response = await SupportService.updateSupport({
        proId: proId,
        proGb: existingProGb || "01", // 기존 proGb 값 유지 (없으면 기본값: 01)
        proType: "01",
        eduGb: eduGbCode,
        proNm: formData.businessNm.trim(),
        proTargetNm: formData.targetName.trim() || undefined,
        proTarget: formData.recruitTarget.join(","), // ELEMENTARY_1,HIGH_1 형식 (내부에서 E1,H1로 변환)
        recFromDd: formData.recruitStartDate,
        recToDd: formData.recruitEndDate,
        recCnt: formData.recruitCount ? parseInt(formData.recruitCount, 10) : 0,
        proFromDd: formData.businessPeriodStart,
        proToDd: formData.businessPeriodEnd,
        proSum: formData.businessSummary.trim(),
        proDesc: formData.businessContent.trim(),
        etcNm: formData.etcNm.trim().slice(0, 512),
        proFileId: existingProFileId,
        fileId: existingFileId,
        runSta: formData.statusCode || "01", // RUN_STA: 01/02/04/99 (청소년 자기계발 연수지원)
        sttusCode: "A", // 사용여부 A(사용)/D(삭제)
        reqGb: reqGbString,
        proPart: ynPipeFromBooleans(formData.proNature),
        proDepa: formData.chargeDept.trim(),
        proCharge: formData.chargePerson.trim(),
        proTel: formData.contact.trim(),
        proHow: formData.applyMethod.trim(),
        proPage: formData.homepage.trim(),
        // 스터디사업 전용 필드 (없으면 N으로 처리)
        basicYn: formData.basicYn || "N",
        poorYn: formData.poorYn || "N",
        singleYn: formData.singleYn || "N",
        proFile: selectedPromoFile ?? undefined,
        artpromFiles:
          selectedFiles.length > 0
            ? selectedFiles.map((item) => item.file)
            : undefined,
      });

      if (response.result === "00") {
        setMessageDialogTitle("수정 완료");
        setMessageDialogMessage(
          response.message || "지원사업이 성공적으로 수정되었습니다.",
        );
        setMessageDialogNavigateToList(true);
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          response.message || "지원사업 수정 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("지원사업 수정 오류:", err);
      if (err instanceof ApiError) {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          err.message || "지원사업 수정 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      } else {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          "지원사업 수정 중 알 수 없는 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      }
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageDialogClose = async () => {
    if (messageDialogType === "success" && messageDialogNavigateToList) {
      handleCancel();
      return;
    }
    setShowMessageDialog(false);
    setMessageDialogNavigateToList(false);
  };

  /** 저장된 홍보/첨부 파일 다운로드 (파일명 클릭 시) */
  const downloadExistingAttachment = async (
    fileId: string | number,
    seq: string | number,
    fallbackFileName?: string,
  ) => {
    if (fileId === "" || fileId == null || seq === "" || seq == null) {
      setMessageDialogTitle("다운로드 실패");
      setMessageDialogMessage("파일 정보가 올바르지 않습니다.");
      setMessageDialogType("danger");
      setMessageDialogNavigateToList(false);
      setShowMessageDialog(true);
      return;
    }
    try {
      await downloadWaterbAttachment(fileId, seq, fallbackFileName);
    } catch (err) {
      setMessageDialogTitle("다운로드 실패");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : "파일 다운로드 중 오류가 발생했습니다.",
      );
      setMessageDialogType("danger");
      setMessageDialogNavigateToList(false);
      setShowMessageDialog(true);
    }
  };

  const handleCancel = () => {
    // from 파라미터가 'study'이면 스터디 사업 리스트로, 아니면 청소년 자기계발 연수지원 리스트로
    if (from === "study") {
      router.push("/adminWeb/support/study");
    } else {
      router.push("/adminWeb/support/list");
    }
  };

  return {
    proId,
    formData,
    loading,
    detailLoading,
    error,
    errors,
    selectedFiles,
    selectedPromoFile,
    existingProFileList,
    existingFileList,
    handleFilesSelected,
    handlePromoFileSelected,
    removeFile,
    removePromoFile,
    deleteExistingProFile,
    deleteExistingFile,
    downloadExistingAttachment,
    handleDeleteProFileClick,
    handleDeleteFileClick,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleCheckboxChange,
    handleGroupSelectAll,
    isGroupAllSelected,
    handleReqGbChange,
    handleProNatureChange,
    handleBusinessContentChange,
    handleProgramTypeChange,
    handleSubmit,
    handleMessageDialogClose,
    handleCancel,
    // 삭제 확인 다이얼로그
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    deleteConfirmType,
    fileToDelete,
    setFileToDelete,
    existingProGb,
    from,
    chargeDeptOptions,
    chargeDeptLoading,
  };
}
