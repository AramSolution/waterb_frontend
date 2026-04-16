import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BoardService,
  BoardRegisterScreenResponse,
  Site,
  TargetCode,
  BbsSeCode,
  BoardRegisterParams,
} from "@/entities/adminWeb/board/api";
import { ApiError } from "@/shared/lib/apiClient";

export interface BoardRegisterFormData {
  siteId: string;
  bbsNm: string;
  bbsDe: string;
  atchFileCnt: string;
  replyYn: string;
  secretYn: string;
  targetGbn: string;
  bbsSe: string;
  sttusCode: string;
}

export interface ValidationErrors {
  siteId?: string;
  bbsNm?: string;
}

export function useBoardRegister() {
  const router = useRouter();
  const [siteList, setSiteList] = useState<Site[]>([]);
  const [targetList, setTargetList] = useState<TargetCode[]>([]);
  const [bbsSeList, setBbsSeList] = useState<BbsSeCode[]>([]);
  const [formData, setFormData] = useState<BoardRegisterFormData>({
    siteId: "",
    bbsNm: "",
    bbsDe: "",
    atchFileCnt: "0",
    replyYn: "N",
    secretYn: "N",
    targetGbn: "",
    bbsSe: "",
    sttusCode: "A",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");

  // 화면 열릴 때 사이트, 대상구분, 게시판유형 리스트 조회
  useEffect(() => {
    const fetchRegisterScreen = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await BoardService.getBoardRegisterScreen();

        let sites: Site[] = [];
        let targets: TargetCode[] = [];
        let bbsSes: BbsSeCode[] = [];

        if (response && typeof response === "object") {
          const responseAny = response as any;

          // siteList 처리
          const siteListData =
            responseAny.siteList || responseAny.data?.siteList || [];

          if (Array.isArray(siteListData)) {
            sites = siteListData;
          }

          // targetList 처리
          const targetListData =
            responseAny.targetList || responseAny.data?.targetList || [];

          if (Array.isArray(targetListData)) {
            targets = targetListData;
          }

          // bbsSeList 처리
          const bbsSeListData =
            responseAny.bbsSeList || responseAny.data?.bbsSeList || [];

          if (Array.isArray(bbsSeListData)) {
            bbsSes = bbsSeListData;
          }
        }

        setSiteList(sites);
        setTargetList(targets);
        setBbsSeList(bbsSes);

        // 기본값 설정
        if (sites.length > 0) {
          setFormData((prev) => ({
            ...prev,
            siteId: sites[0].siteId,
          }));
        }
        if (targets.length > 0) {
          setFormData((prev) => ({
            ...prev,
            targetGbn: targets[0].code,
          }));
        }
        if (bbsSes.length > 0) {
          setFormData((prev) => ({
            ...prev,
            bbsSe: bbsSes[0].code,
          }));
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.message ||
              "게시판 등록 화면 정보를 불러오는 중 오류가 발생했습니다.",
          );
        } else {
          setError("게시판 등록 화면 정보를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRegisterScreen();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    // 파일첨부개수: 숫자만 허용, 숫자가 아닌 문자는 즉시 제거
    const nextValue = name === "atchFileCnt" ? value.replace(/\D/g, "") : value;

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

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 사이트ID 유효성 검증
    if (!formData.siteId || formData.siteId.trim() === "") {
      newErrors.siteId = "사이트ID를 선택해주세요.";
      isValid = false;
    }

    // 게시판명 유효성 검증
    if (!formData.bbsNm || formData.bbsNm.trim() === "") {
      newErrors.bbsNm = "게시판명을 입력해주세요.";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName) {
        const firstErrorField = document.querySelector<
          HTMLInputElement | HTMLSelectElement
        >(
          `input[name="${firstErrorFieldName}"], select[name="${firstErrorFieldName}"]`,
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

      // sessionStorage에서 user 객체를 가져와서 uniqId 추출
      const userStr = sessionStorage.getItem("user");
      let uniqId = "";

      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          uniqId = user.uniqId || "";
        } catch (error) {
          console.error("user 객체 파싱 오류:", error);
        }
      }

      // API 요청 파라미터 구성 (BoardRegisterParams에 정의된 필드만)
      const registerParams: BoardRegisterParams = {
        siteId: formData.siteId,
        targetGbn: formData.targetGbn,
        bbsSe: formData.bbsSe,
        bbsNm: formData.bbsNm,
        bbsDe: formData.bbsDe || "",
        atchFileCnt: formData.atchFileCnt || "0",
        replyYn: formData.replyYn,
        secretYn: formData.secretYn,
        sttusCode: formData.sttusCode,
        uniqId: uniqId,
      };

      const response = await BoardService.registerBoard(registerParams);

      if (response.result === "00") {
        setMessageDialogTitle("등록 완료");
        setMessageDialogMessage(
          response.message || "정상적으로 등록되었습니다.",
        );
        setMessageDialogType("success");
        setShowMessageDialog(true);
      } else {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(
          response.message || "게시판 등록 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("게시판 등록 오류:", err);
      if (err instanceof ApiError) {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(
          err.message || "게시판 등록 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      } else {
        setMessageDialogTitle("등록 실패");
        setMessageDialogMessage(
          "게시판 등록 중 알 수 없는 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      }
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === "success") {
      router.push("/adminWeb/board/list");
    }
  };

  return {
    siteList,
    targetList,
    bbsSeList,
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
  };
}
