import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BoardService,
  BoardRegisterScreenResponse,
  BoardDetailResponse,
  BoardUpdateParams,
  BoardUpdateResponse,
  Site,
  TargetCode,
  BbsSeCode,
  BoardDetail,
} from "@/entities/adminWeb/board/api";
import { ApiError } from "@/shared/lib/apiClient";

export interface BoardDetailFormData {
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

export function useBoardDetail(bbsid: string) {
  const router = useRouter();
  const [siteList, setSiteList] = useState<Site[]>([]);
  const [targetList, setTargetList] = useState<TargetCode[]>([]);
  const [bbsSeList, setBbsSeList] = useState<BbsSeCode[]>([]);
  const [detail, setDetail] = useState<BoardDetail | null>(null);
  const [formData, setFormData] = useState<BoardDetailFormData>({
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
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");

  // 화면 열릴 때 사이트, 대상구분, 게시판유형 리스트 조회 및 상세 정보 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1. 등록 화면 정보 조회 (select 옵션용)
        const screenResponse = await BoardService.getBoardRegisterScreen();

        let sites: Site[] = [];
        let targets: TargetCode[] = [];
        let bbsSes: BbsSeCode[] = [];

        if (screenResponse && typeof screenResponse === "object") {
          const responseAny = screenResponse as any;

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

        // 2. 상세 정보 조회
        const detailResponse = await BoardService.getBoardDetail({
          bbsId: bbsid,
        });

        let boardDetail: BoardDetail | null = null;

        if (detailResponse && typeof detailResponse === "object") {
          const responseAny = detailResponse as any;

          // 다양한 응답 구조 대응
          let detailData = responseAny.detail || responseAny.data?.detail;

          // detail 필드가 없고 응답 자체가 detail인 경우
          if (
            !detailData &&
            typeof responseAny === "object" &&
            !Array.isArray(responseAny)
          ) {
            const responseKeys = Object.keys(responseAny);
            if (
              responseKeys.length > 0 &&
              (responseAny.bbsId || responseAny.bbsNm)
            ) {
              detailData = responseAny;
            }
          }

          // data가 직접 detail인 경우
          if (
            !detailData &&
            responseAny.data &&
            typeof responseAny.data === "object" &&
            !Array.isArray(responseAny.data)
          ) {
            const dataKeys = Object.keys(responseAny.data);
            if (
              dataKeys.length > 0 &&
              (responseAny.data.bbsId || responseAny.data.bbsNm)
            ) {
              detailData = responseAny.data;
            }
          }

          if (detailData && typeof detailData === "object") {
            boardDetail = detailData as BoardDetail;
            setDetail(boardDetail);

            // 폼 데이터에 상세 정보 설정 (화면에 있는 필드들만)
            setFormData({
              siteId: boardDetail.siteId || "",
              bbsNm: boardDetail.bbsNm || "",
              bbsDe: boardDetail.bbsDe || "",
              atchFileCnt: boardDetail.atchFileCnt || "0",
              replyYn: boardDetail.replyYn || "N",
              secretYn:
                boardDetail.secretYn || (boardDetail as any).SECRET_YN || "N",
              targetGbn: boardDetail.targetGbn || "",
              bbsSe: boardDetail.bbsSe || "",
              sttusCode: boardDetail.sttusCode || "A",
            });
          } else {
            console.error(
              "❌ detail 데이터를 찾을 수 없습니다. 응답 구조:",
              detailResponse,
            );
            setError("게시판 상세 정보를 불러올 수 없습니다.");
          }
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.message ||
              "게시판 상세 정보를 불러오는 중 오류가 발생했습니다.",
          );
        } else {
          setError("게시판 상세 정보를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    if (bbsid) {
      fetchData();
    }
  }, [bbsid]);

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

  // 목록으로 돌아가기 (상태 유지)
  const handleList = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const searchCondition = searchParams.get("searchCondition") || "";
      const searchKeyword = searchParams.get("searchKeyword") || "";
      const targetGbn = searchParams.get("targetGbn") || "";
      const page = searchParams.get("page") || "1";

      const params = new URLSearchParams();
      if (searchCondition) params.set("searchCondition", searchCondition);
      if (searchKeyword) params.set("searchKeyword", searchKeyword);
      if (targetGbn) params.set("targetGbn", targetGbn);
      if (page && page !== "1") params.set("page", page);

      const queryString = params.toString();
      router.push(
        queryString
          ? `/adminWeb/board/list?${queryString}`
          : "/adminWeb/board/list",
      );
    } else {
      // SSR fallback
      router.push("/adminWeb/board/list");
    }
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

  // 게시판 수정
  const handleEdit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setUpdating(true);
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

      // BoardUpdateParams에 정의된 필드만 사용
      const updateParams: BoardUpdateParams = {
        bbsId: bbsid,
        siteId: formData.siteId,
        bbsSe: formData.bbsSe || "",
        bbsNm: formData.bbsNm.trim(),
        bbsDe: formData.bbsDe || "",
        atchFileCnt: formData.atchFileCnt || detail?.atchFileCnt || "0",
        replyYn: formData.replyYn || detail?.replyYn || "N",
        secretYn: formData.secretYn || detail?.secretYn || "N",
        sttusCode: formData.sttusCode || detail?.sttusCode || "A",
        uniqId: uniqId,
      };

      const response = await BoardService.updateBoard(updateParams);

      if (response.result === "00") {
        setMessageDialogTitle("수정 완료");
        setMessageDialogMessage(
          response.message || "정상적으로 수정되었습니다.",
        );
        setMessageDialogType("success");
        setShowMessageDialog(true);

        // 수정 후 상세 정보 다시 조회
        const detailResponse = await BoardService.getBoardDetail({
          bbsId: bbsid,
        });

        if (detailResponse && typeof detailResponse === "object") {
          const responseAny = detailResponse as any;
          let detailData = responseAny.detail || responseAny.data?.detail;

          if (
            !detailData &&
            typeof responseAny === "object" &&
            !Array.isArray(responseAny)
          ) {
            const responseKeys = Object.keys(responseAny);
            if (
              responseKeys.length > 0 &&
              (responseAny.bbsId || responseAny.bbsNm)
            ) {
              detailData = responseAny;
            }
          }

          if (
            !detailData &&
            responseAny.data &&
            typeof responseAny.data === "object" &&
            !Array.isArray(responseAny.data)
          ) {
            const dataKeys = Object.keys(responseAny.data);
            if (
              dataKeys.length > 0 &&
              (responseAny.data.bbsId || responseAny.data.bbsNm)
            ) {
              detailData = responseAny.data;
            }
          }

          if (detailData && typeof detailData === "object") {
            const boardDetail = detailData as BoardDetail;
            setDetail(boardDetail);
            setFormData({
              siteId: boardDetail.siteId || "",
              bbsNm: boardDetail.bbsNm || "",
              bbsDe: boardDetail.bbsDe || "",
              atchFileCnt: boardDetail.atchFileCnt || "0",
              replyYn: boardDetail.replyYn || "N",
              secretYn:
                boardDetail.secretYn || (boardDetail as any).SECRET_YN || "N",
              targetGbn: boardDetail.targetGbn || "",
              bbsSe: boardDetail.bbsSe || "",
              sttusCode: boardDetail.sttusCode || "A",
            });
          }
        }
      } else {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          response.message || "게시판 수정 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      console.error("게시판 수정 오류:", err);
      if (err instanceof ApiError) {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          err.message || "게시판 수정 중 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      } else {
        setMessageDialogTitle("수정 실패");
        setMessageDialogMessage(
          "게시판 수정 중 알 수 없는 오류가 발생했습니다.",
        );
        setMessageDialogType("danger");
      }
      setShowMessageDialog(true);
    } finally {
      setUpdating(false);
    }
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    // 성공한 경우 목록으로 이동
    if (messageDialogType === "success") {
      handleList();
    }
  };

  return {
    siteList,
    targetList,
    bbsSeList,
    detail,
    formData,
    loading,
    updating,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handleList,
    handleEdit,
    handleMessageDialogClose,
  };
}
