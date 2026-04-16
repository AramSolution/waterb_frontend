import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CmmCodeService } from "@/entities/adminWeb/code/api";
import type { DetailCodeItem } from "@/entities/adminWeb/code/api";
import type { SelectOption } from "@/shared/ui/adminWeb/form";
import { NeisService } from "@/entities/adminWeb/neis/api";
import type { SchoolItem, ClassItem } from "@/entities/adminWeb/neis/api";
import { ArmuserService } from "@/entities/adminWeb/armuser/api";
import type { ArmuserDTO } from "@/entities/adminWeb/armuser/api";
import { ArmchilService } from "@/entities/adminWeb/armchil/api";
import type { ArmchilChildDTO } from "@/entities/adminWeb/armchil/api";
import {
  SupportApplicationService,
  type ArtappmInsertRequest,
  type ArtappmDetailResponse,
} from "@/entities/adminWeb/support/application/api/supportApplicationApi";
import type { ArtappmFileItem } from "@/entities/adminWeb/support/application/api/supportApplicationApi";
import { downloadEdreamAttachment } from "@/shared/lib";
import type {
  SupportApplicationMode,
  SupportApplicationDetailParams,
} from "./types";

export interface SupportApplicationRegisterFormData {
  // 상단 정보
  programTitle: string; // 프로그램 제목
  status: string; // 상태 (01:임시저장, 02:신청, 03:승인, 04:완료, 11:반려, 12:중단, 99:취소)
  selectionStatus: string; // 선정여부 (N:미선정, Y:선정, R:예비)

  // 유형
  applicationType: string; // 1인탐구형 / 모둠 탐구형

  // 보호자 정보 (선택 시 armuser BRTHDY 사용)
  parentName: string; // 보호자명
  parentEsntlId: string; // 보호자 고유ID
  parentBirthDate: string; // 보호자 생년월일 (BRTHDY)
  parentPhone: string; // 보호자 연락처

  // 학교정보
  schoolName: string; // 학교명
  schoolCode: string; // 학교 KEY값 (sdSchulCode)
  schoolGb: string; // 학교구분 코드 (E, J, H, U, T)
  gradeInfo: string; // 학년정보 (학년)
  gradeInfo2: string; // 학년정보2 (반)

  // 학생정보
  studentName: string; // 학생명
  studentEsntlId: string; // 학생 고유ID
  studentGender: string; // 성별 (남/여)
  studentPhone: string; // 학생 연락처
  studentBirthDate: string; // 학생 생년월일 (BRTHDY 표시용)
  studentPostalCode: string; // 우편번호
  studentAddress: string; // 주소
  studentDetailAddress: string; // 상세주소
  accountNumber: string; // 계좌번호
  bankName: string; // 은행명
  depositorName: string; // 예금주

  // 신청분야
  humanitiesField: string; // 인문분야
  scienceField: string; // 과학분야
  artsField: string; // 예체능분야
  characterField: string; // 인성분야
  otherField: string; // 기타
  humanitiesChecked: boolean; // 인문분야 체크 여부
  scienceChecked: boolean; // 과학분야 체크 여부
  artsChecked: boolean; // 예체능분야 체크 여부
  characterChecked: boolean; // 인성분야 체크 여부
  otherChecked: boolean; // 기타 체크 여부

  // 활동계획서
  activityScope: string; // 활동범위 (군산 내/외)
  purpose: string; // 목적
  activityContent: string; // 활동내용
  budgetPlan: string; // 예산 사용계획

  // 기타
  other: string; // 기타
  reaDesc: string; // 사유 (REA_DESC, VARCHAR 2048)
}

export interface ValidationErrors {
  applicationType?: string;
  status?: string;
  selectionStatus?: string;
  parentName?: string;
  parentBirthDate?: string;
  parentPhone?: string;
  schoolName?: string;
  gradeInfo?: string;
  studentName?: string;
  studentGender?: string;
  studentPhone?: string;
  studentBirthDate?: string;
  studentAddress?: string;
  accountNumber?: string;
  humanitiesField?: string;
  scienceField?: string;
  artsField?: string;
  characterField?: string;
  otherField?: string;
  activityScope?: string;
  purpose?: string;
  activityContent?: string;
  budgetPlan?: string;
  other?: string;
}

const formatClassLabel = (className?: string): string => {
  const value = (className || "").trim();
  if (!value) return "";
  if (value.includes("반")) return value;
  if (/^\d+$/.test(value)) return `${value}반`;
  return value;
};

export function useSupportApplicationRegister(
  businessId?: string,
  options?: {
    mode?: SupportApplicationMode;
    /** 지원사업신청ID(REQ_ID). 상세 모드 시 GET by-req-id API 호출에 사용 */
    reqId?: string;
  },
) {
  const router = useRouter();
  const mode: SupportApplicationMode = options?.mode || "register";
  const reqId = options?.reqId;

  const [formData, setFormData] = useState<SupportApplicationRegisterFormData>({
    programTitle: "",
    status: "02", // 기본값: 신청
    selectionStatus: "N", // 기본값: 미선정
    applicationType: "INDIVIDUAL", // 기본값: 1인탐구형 (왼쪽)
    parentName: "",
    parentEsntlId: "",
    parentBirthDate: "",
    parentPhone: "",
    schoolName: "",
    schoolCode: "",
    schoolGb: "",
    gradeInfo: "",
    gradeInfo2: "",
    studentName: "",
    studentEsntlId: "",
    studentGender: "M", // 기본값: 남 (왼쪽)
    studentPhone: "",
    studentBirthDate: "",
    studentPostalCode: "",
    studentAddress: "",
    studentDetailAddress: "",
    accountNumber: "",
    bankName: "",
    depositorName: "",
    humanitiesField: "",
    scienceField: "",
    artsField: "",
    characterField: "",
    otherField: "",
    humanitiesChecked: false,
    scienceChecked: false,
    artsChecked: false,
    characterChecked: false,
    otherChecked: false,
    activityScope: "INSIDE", // 기본값: 군산 내 (왼쪽)
    purpose: "",
    activityContent: "",
    budgetPlan: "",
    other: "",
    reaDesc: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});

  // 메시지 다이얼로그 관련 상태
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");
  /** true: 등록/수정 저장 성공 후 확인 시 신청목록으로 이동. 첨부파일 삭제 성공은 false(상세 유지) */
  const [messageDialogNavigateToList, setMessageDialogNavigateToList] =
    useState(false);

  // 첨부파일 관련 상태
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [existingFiles, setExistingFiles] = useState<ArtappmFileItem[]>([]);

  // 파일 삭제 확인 다이얼로그 관련 상태
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ArtappmFileItem | null>(
    null,
  );

  // 은행 목록 관련 상태
  const [bankOptions, setBankOptions] = useState<SelectOption[]>([
    { value: "", label: "선택하세요" },
  ]);
  const [bankLoading, setBankLoading] = useState(true);

  // 은행 목록 조회 (ARM002)
  useEffect(() => {
    let cancelled = false;

    async function fetchBankOptions() {
      setBankLoading(true);
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId("ARM002");
        if (cancelled) return;

        // codeNm으로 표시하고, code 값을 저장
        const options: SelectOption[] = [
          { value: "", label: "선택하세요" },
          ...list.map((item) => ({
            value: item.code, // code 값을 저장
            label: item.codeNm || item.code, // codeNm으로 표시
          })),
        ];
        setBankOptions(options);
      } catch (err) {
        if (!cancelled) {
          console.error("은행 목록 조회 실패:", err);
          // 에러 발생 시 기본 옵션만 유지
        }
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    }

    fetchBankOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // 학교 검색 모달 관련 상태
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolSearchKeyword, setSchoolSearchKeyword] = useState("");
  const [schoolList, setSchoolList] = useState<SchoolItem[]>([]);
  const [schoolCurrentPage, setSchoolCurrentPage] = useState(1);
  const [schoolTotalPages, setSchoolTotalPages] = useState(0);
  const [schoolTotalElements, setSchoolTotalElements] = useState(0);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const schoolPageSize = 15;

  // 보호자 검색 모달 관련 상태
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentSearchKeyword, setParentSearchKeyword] = useState("");
  const [parentList, setParentList] = useState<ArmuserDTO[]>([]);
  const [parentCurrentPage, setParentCurrentPage] = useState(1);
  const [parentTotalPages, setParentTotalPages] = useState(0);
  const [parentTotalElements, setParentTotalElements] = useState(0);
  const [parentLoading, setParentLoading] = useState(false);
  const parentPageSize = 15;

  // 학생 콤보박스 옵션 (부모 선택 시 해당 부모의 자녀 목록 from /api/admin/armchil/children)
  const [studentList, setStudentList] = useState<ArmchilChildDTO[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  // 학급 정보 관련 상태
  const [classOptions, setClassOptions] = useState<SelectOption[]>([
    { value: "", label: "선택" },
  ]);
  const [classOptions2, setClassOptions2] = useState<SelectOption[]>([
    { value: "", label: "선택" },
  ]);
  const [classLoading, setClassLoading] = useState(false);

  // 학교구분 코드 매핑 (EDR002: 초등학교=E, 중학교=J, 고등학교=H, 대학교=U, 기타=T)
  const [schoolGbMapping, setSchoolGbMapping] = useState<Map<string, string>>(
    new Map(),
  );

  // 상세 모드에서 원본 상세 데이터 보관 (update 시 기존 값 유지용)
  const [detailData, setDetailData] = useState<any | null>(null);

  // 학교구분 코드 조회 (EDR002)
  useEffect(() => {
    let cancelled = false;

    async function fetchSchoolGbMapping() {
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId("EDR002");
        if (cancelled) return;

        // 학교종류명 -> 코드 매핑 생성
        // 예: "초등학교" -> "E", "중학교" -> "J"
        const mapping = new Map<string, string>();
        list.forEach((item) => {
          if (item.codeNm && item.code) {
            mapping.set(item.codeNm, item.code);
          }
        });
        setSchoolGbMapping(mapping);
      } catch (err) {
        console.error("학교구분 코드 조회 실패:", err);
      }
    }

    fetchSchoolGbMapping();
    return () => {
      cancelled = true;
    };
  }, []);

  const schoolSearchKeywordRef = useRef(schoolSearchKeyword);
  useEffect(() => {
    schoolSearchKeywordRef.current = schoolSearchKeyword;
  }, [schoolSearchKeyword]);

  // 학교 목록 조회
  const fetchSchoolList = useCallback(async () => {
    try {
      setSchoolLoading(true);
      const response = await NeisService.getGunsanSchools({
        page: schoolCurrentPage - 1, // 0부터 시작
        size: schoolPageSize,
        text: schoolSearchKeywordRef.current || undefined,
      });

      let schools: SchoolItem[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        schools = response;
        total = response.length;
      } else if (response && typeof response === "object") {
        if (Array.isArray(response.content)) {
          schools = response.content;
        } else if (Array.isArray(response.data)) {
          schools = response.data;
        } else if (Array.isArray(response.Array)) {
          schools = response.Array;
        } else if (Array.isArray(response.list)) {
          schools = response.list;
        }

        total = Number(response.totalElements) || schools.length;
      }

      setSchoolList(schools);
      setSchoolTotalElements(total);
      setSchoolTotalPages(Math.ceil(total / schoolPageSize) || 1);
    } catch (err) {
      console.error("학교 목록 조회 실패:", err);
      setSchoolList([]);
      setSchoolTotalElements(0);
      setSchoolTotalPages(0);
    } finally {
      setSchoolLoading(false);
    }
  }, [schoolCurrentPage, schoolPageSize]);

  const fetchSchoolListRef = useRef(fetchSchoolList);
  useEffect(() => {
    fetchSchoolListRef.current = fetchSchoolList;
  }, [fetchSchoolList]);

  // 페이지 변경 시 자동 조회 (모달이 열려있을 때만)
  useEffect(() => {
    if (showSchoolModal) {
      fetchSchoolListRef.current();
    }
  }, [schoolCurrentPage, showSchoolModal, fetchSchoolListRef]);

  // 학교 검색 (Enter 키 또는 버튼 클릭)
  const handleSchoolSearch = () => {
    setSchoolCurrentPage(1);
    fetchSchoolListRef.current();
  };

  const handleSchoolSearchKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      handleSchoolSearch();
    }
  };

  // 학교 선택 시 학급 정보 조회
  const handleSchoolSelect = async (school: SchoolItem) => {
    const schoolCode = school.sdSchulCode || "";
    const schoolName = school.schulNm || "";
    const schoolTypeName = school.schulKndScNm || ""; // "초등학교", "중학교" 등

    // 학교종류명을 코드로 변환
    // 예: "초등학교" -> "E", "중학교" -> "J"
    const schoolGbCode = schoolGbMapping.get(schoolTypeName) || "";

    setFormData((prev) => ({
      ...prev,
      schoolName: schoolName, // 학교명 저장
      schoolCode: schoolCode, // 학교 KEY 저장
      schoolGb: schoolGbCode, // 학교구분 코드 저장 (E, J, H, U, T)
      gradeInfo: "", // 초기화
      gradeInfo2: "", // 초기화
    }));

    setShowSchoolModal(false);
    setSchoolSearchKeyword("");

    // 학급 정보 조회
    if (schoolCode) {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: schoolCode,
        });

        // 학년 목록 생성 (중복 제거)
        const gradeSet = new Set<string>();
        classList.forEach((item) => {
          if (item.grade) {
            gradeSet.add(item.grade);
          }
        });

        const gradeOptions: SelectOption[] = [
          { value: "", label: "선택" },
          ...Array.from(gradeSet)
            .sort()
            .map((grade) => ({
              value: grade,
              label: `${grade}학년`,
            })),
        ];

        setClassOptions(gradeOptions);
        setClassOptions2([{ value: "", label: "선택" }]); // 반 목록 초기화
      } catch (err) {
        console.error("학급 정보 조회 실패:", err);
        setClassOptions([{ value: "", label: "선택" }]);
        setClassOptions2([{ value: "", label: "선택" }]);
      } finally {
        setClassLoading(false);
      }
    }
  };

  // 학년 선택 시 반 목록 업데이트
  useEffect(() => {
    if (!formData.gradeInfo || !formData.schoolCode) {
      setClassOptions2([{ value: "", label: "선택" }]);
      return;
    }

    const fetchClassList = async () => {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: formData.schoolCode,
        });

        // 선택한 학년에 해당하는 반 목록 필터링
        const filteredClasses = classList.filter(
          (item) => item.grade === formData.gradeInfo,
        );

        const classOptions2List: SelectOption[] = [
          { value: "", label: "선택" },
          ...filteredClasses
            .map((item) => ({
              value: item.classNm || "",
              label: formatClassLabel(item.classNm),
            }))
            .filter((item) => item.value !== ""),
        ];

        setClassOptions2(classOptions2List);
        // 상세 모드가 아니고, 아직 학생이 선택되지 않은 상태에서만 반을 초기화
        // → 학생 선택으로 인해 학년/학교가 바뀐 경우에는 gradeInfo2를 유지
        if (mode !== "detail" && !formData.studentEsntlId) {
          setFormData((prev) => ({ ...prev, gradeInfo2: "" })); // 반 초기화
        }
      } catch (err) {
        console.error("반 정보 조회 실패:", err);
        setClassOptions2([{ value: "", label: "선택" }]);
      } finally {
        setClassLoading(false);
      }
    };

    fetchClassList();
  }, [formData.gradeInfo, formData.schoolCode, formData.studentEsntlId, mode]);

  // 학교 모달 열기
  const handleOpenSchoolModal = () => {
    setShowSchoolModal(true);
    setSchoolSearchKeyword("");
    setSchoolCurrentPage(1);
    fetchSchoolListRef.current();
  };

  // 학교 모달 닫기
  const handleCloseSchoolModal = () => {
    setShowSchoolModal(false);
    setSchoolSearchKeyword("");
  };

  // 보호자 목록 조회
  const fetchParentList = useCallback(async () => {
    try {
      setParentLoading(true);
      const response = await ArmuserService.getList({
        userSe: "PNR", // 학부모
        mberSttus: "P", // 사용중 회원만
        searchCondition: parentSearchKeywordRef.current ? "1" : undefined, // 이름으로 검색
        searchKeyword: parentSearchKeywordRef.current || undefined,
        lengthPage: parentPageSize,
        startIndex: (parentCurrentPage - 1) * parentPageSize,
      });

      let parents: ArmuserDTO[] = [];
      let total = 0;

      if (response.data && Array.isArray(response.data)) {
        parents = response.data;
      }

      total =
        response.recordsTotal || response.recordsFiltered || parents.length;

      setParentList(parents);
      setParentTotalElements(total);
      setParentTotalPages(Math.ceil(total / parentPageSize) || 1);
    } catch (err) {
      console.error("보호자 목록 조회 실패:", err);
      setParentList([]);
      setParentTotalElements(0);
      setParentTotalPages(0);
    } finally {
      setParentLoading(false);
    }
  }, [parentCurrentPage, parentPageSize]);

  const parentSearchKeywordRef = useRef(parentSearchKeyword);
  useEffect(() => {
    parentSearchKeywordRef.current = parentSearchKeyword;
  }, [parentSearchKeyword]);

  const fetchParentListRef = useRef(fetchParentList);
  useEffect(() => {
    fetchParentListRef.current = fetchParentList;
  }, [fetchParentList]);

  // 페이지 변경 시 자동 조회 (모달이 열려있을 때만)
  useEffect(() => {
    if (showParentModal) {
      fetchParentListRef.current();
    }
  }, [parentCurrentPage, showParentModal, fetchParentListRef]);

  // 보호자 검색 (Enter 키 또는 버튼 클릭)
  const handleParentSearch = () => {
    setParentCurrentPage(1);
    fetchParentListRef.current();
  };

  const handleParentSearchKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      handleParentSearch();
    }
  };

  // 보호자 선택
  const handleParentSelect = (parent: ArmuserDTO) => {
    console.log("선택한 보호자:", parent);
    setFormData((prev) => {
      // 생년월일 포맷팅 (YYYY-MM-DD 형식으로 변환)
      let formattedBirthDate = prev.parentBirthDate;
      if (parent.brthdy) {
        // YYYY-MM-DD 형식이면 그대로 사용
        if (parent.brthdy.includes("-")) {
          formattedBirthDate = parent.brthdy;
        } else {
          // YYYYMMDD 형식이면 YYYY-MM-DD로 변환
          const cleaned = parent.brthdy.replace(/-/g, "");
          if (cleaned.length === 8) {
            formattedBirthDate = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
          }
        }
      }

      const newData = {
        ...prev,
        parentName: parent.userNm || "",
        parentEsntlId: parent.esntlId || "",
        parentPhone: parent.mbtlnum || "",
        parentBirthDate: formattedBirthDate,
        accountNumber: parent.payBank ?? prev.accountNumber,
        bankName: parent.payBankCode ?? prev.bankName,
        depositorName: parent.holderNm ?? prev.depositorName,
        studentName: "",
        studentEsntlId: "",
        studentPhone: "",
        studentBirthDate: "",
        studentGender: "M",
        studentPostalCode: "",
        studentAddress: "",
        studentDetailAddress: "",
      };

      console.log("설정된 보호자 정보 (DB 컬럼명 기준):", {
        pEsntlId: newData.parentEsntlId, // P_ESNTL_ID 컬럼
        pUserNm: newData.parentName, // P_USER_NM 컬럼
      });

      return newData;
    });
    setStudentList([]);
    handleCloseParentModal();
    fetchStudentList(parent.esntlId || "");
  };

  // 보호자 모달 열기
  const handleOpenParentModal = () => {
    setShowParentModal(true);
    setParentSearchKeyword("");
    setParentCurrentPage(1);
    fetchParentListRef.current();
  };

  // 보호자 모달 닫기
  const handleCloseParentModal = () => {
    setShowParentModal(false);
    setParentSearchKeyword("");
  };

  // 학생(자녀) 목록 조회: 선택된 학부모의 자녀만 /api/admin/armchil/children 로 조회
  const fetchStudentList = useCallback(async (pEsntlId: string) => {
    if (!pEsntlId || !pEsntlId.trim()) {
      setStudentList([]);
      return;
    }
    try {
      setStudentLoading(true);
      const response = await ArmchilService.getChildren(pEsntlId.trim());
      const list =
        response.data && Array.isArray(response.data) ? response.data : [];
      setStudentList(list);
    } catch (err) {
      console.error("자녀 목록 조회 실패:", err);
      setStudentList([]);
    } finally {
      setStudentLoading(false);
    }
  }, []);

  // 학생 선택(콤보박스) 시 /api/shared/armuser/{esntlId} 로 상세 조회 후 폼에 반영 + SCHOOL_ID로 학교/학급 세팅
  const handleStudentSelect = useCallback(async (esntlId: string) => {
    const id = esntlId?.trim();
    if (!id) return;
    try {
      setStudentLoading(true);
      const response = await ArmuserService.getDetail(id);
      const student = response.detail;
      if (!student) {
        setError("학생 정보를 불러올 수 없습니다.");
        return;
      }
      let formattedBirthDate = "";
      if (student.brthdy) {
        if (student.brthdy.includes("-")) {
          formattedBirthDate = student.brthdy;
        } else {
          const cleaned = student.brthdy.replace(/-/g, "");
          if (cleaned.length === 8) {
            formattedBirthDate = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
          }
        }
      }
      const gender = student.sexdstnCode === "F" ? "F" : "M";
      const schoolCode = student.schoolId || "";
      const schoolName = student.schoolNm || "";
      const schoolGb = student.schoolGb || "";
      const gradeInfo =
        student.schoolLvl != null ? String(student.schoolLvl) : "";
      // 반(SCHOOL_NO)은 classOptions2의 value(item.classNm) 포맷과 동일하게 숫자 문자열로 저장
      const gradeInfo2 =
        student.schoolNo != null ? String(student.schoolNo) : "";

      setFormData((prev) => ({
        ...prev,
        studentName: student.userNm || "",
        studentEsntlId: student.esntlId || "",
        studentPhone: student.mbtlnum || "",
        studentBirthDate: formattedBirthDate,
        studentGender: gender,
        studentPostalCode: student.zip || "",
        studentAddress: student.adres || "",
        studentDetailAddress: student.detailAdres || "",
        schoolCode,
        schoolName,
        schoolGb,
        gradeInfo,
        gradeInfo2,
      }));

      if (schoolCode) {
        try {
          setClassLoading(true);
          const classList = await NeisService.getClassInfo({
            sdSchulCode: schoolCode,
          });
          const gradeSet = new Set<string>();
          classList.forEach((item) => {
            if (item.grade) gradeSet.add(item.grade);
          });
          const gradeOptions: SelectOption[] = [
            { value: "", label: "선택" },
            ...Array.from(gradeSet)
              .sort()
              .map((grade) => ({ value: grade, label: `${grade}학년` })),
          ];
          setClassOptions(gradeOptions);
          const filteredClasses = classList.filter(
            (item) => item.grade === gradeInfo,
          );
          const classOptions2List: SelectOption[] = [
            { value: "", label: "선택" },
            ...filteredClasses
              .map((item) => ({
                value: item.classNm || "",
                label: formatClassLabel(item.classNm),
              }))
              .filter((item) => item.value !== ""),
          ];
          setClassOptions2(classOptions2List);
        } catch (err) {
          console.error("학급 정보 조회 실패:", err);
          setClassOptions([{ value: "", label: "선택" }]);
          setClassOptions2([{ value: "", label: "선택" }]);
        } finally {
          setClassLoading(false);
        }
      } else {
        setClassOptions([{ value: "", label: "선택" }]);
        setClassOptions2([{ value: "", label: "선택" }]);
      }
    } catch (err) {
      console.error("학생 상세 조회 실패:", err);
      setError("학생 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setStudentLoading(false);
    }
  }, []);

  // 전화번호 포맷팅 함수 (화면 표시용)
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, "");

    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 11자리 초과 시 11자리까지만
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    // 연락처 필드인 경우 포맷팅 적용 (화면 표시용)
    if (name === "parentPhone" || name === "studentPhone") {
      const formattedValue = formatPhoneNumber(value);
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

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

    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
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

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  // 기존 첨부파일 삭제 확인 다이얼로그 표시
  const handleDeleteFileClick = (file: ArtappmFileItem) => {
    console.log("handleDeleteFileClick 호출됨:", file);
    setFileToDelete(file);
    setShowDeleteConfirmDialog(true);
    console.log("showDeleteConfirmDialog 설정됨:", true);
  };

  // 기존 첨부파일 삭제 (상세 모드 전용). 삭제/상세 모두 reqId 기반.
  const deleteExistingFile = async (file: ArtappmFileItem) => {
    console.log("deleteExistingFile 직접 호출됨:", file);
    const reqId = detailData?.reqId;
    if (!reqId || !reqId.trim()) {
      setError(
        "첨부파일을 삭제하기 위한 상세 정보가 없습니다. 페이지를 새로고침해 주세요.",
      );
      return;
    }

    // fileId와 seq를 문자열로 변환 (18자리 숫자 정밀도 문제 해결)
    const fileId = file.fileId != null ? String(file.fileId) : null;
    const seq = file.seq != null ? String(file.seq) : null;

    if (!fileId || !seq) {
      console.error("삭제할 파일의 fileId 또는 seq가 유효하지 않습니다.", {
        file,
        fileId,
        seq,
        fileIdType: typeof file.fileId,
        seqType: typeof file.seq,
      });
      setError("삭제할 파일 정보가 올바르지 않습니다.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("첨부파일 삭제 요청:", {
        reqId,
        fileId,
        seq,
      });

      const response = await SupportApplicationService.deleteArtappmFile({
        reqId: reqId.trim(),
        fileId,
        seq: Number(seq),
      });

      console.log("첨부파일 삭제 응답:", response);

      if (response.result === "00") {
        // 삭제 성공 시 상세 정보를 다시 불러와서 파일 목록 갱신 (REQ_ID 기준)
        const refetchReqId = detailData?.reqId;
        if (mode === "detail" && refetchReqId) {
          try {
            const detailResponse: ArtappmDetailResponse =
              await SupportApplicationService.getArtappmDetail({
                reqId: refetchReqId,
              });

            // 첨부파일 목록 갱신
            const files: ArtappmFileItem[] =
              (detailResponse && (detailResponse.files as ArtappmFileItem[])) ||
              [];
            setExistingFiles(files || []);

            // fileId 콘솔 출력 (파일 삭제 후)
            console.log("=== 파일 삭제 후 재조회 - 파일 정보 ===");
            if (detailResponse.detail) {
              console.log(
                "ARTAPPM.FILE_ID (그룹 fileId):",
                detailResponse.detail.fileId,
              );
            }
            if (files && files.length > 0) {
              console.log("남은 첨부파일 목록:");
              files.forEach((file, index) => {
                console.log(`  파일 ${index + 1}:`, {
                  fileId: file.fileId,
                  seq: file.seq,
                  orgfNm: file.orgfNm,
                });
              });
            } else {
              console.log("첨부파일 없음");
            }
            console.log("====================================");

            // 성공 메시지 표시 (확인 시 목록으로 가지 않음)
            setMessageDialogTitle("삭제 완료");
            setMessageDialogMessage(
              response.message || "첨부파일이 삭제되었습니다.",
            );
            setMessageDialogNavigateToList(false);
            setMessageDialogType("success");
            setShowMessageDialog(true);
          } catch (refreshErr) {
            console.error("삭제 후 상세 정보 갱신 오류:", refreshErr);
            // 갱신 실패해도 프론트 목록에서만 제거
            setExistingFiles((prev) =>
              prev.filter((f) => {
                // String() 변환으로 비교 (18자리 숫자 정밀도 문제 해결)
                return !(
                  String(f.fileId) === String(fileId) &&
                  String(f.seq) === String(seq)
                );
              }),
            );
          }
        } else {
          // 등록 모드일 때는 프론트 목록에서만 제거
          setExistingFiles((prev) =>
            prev.filter((f) => {
              // String() 변환으로 비교 (18자리 숫자 정밀도 문제 해결)
              return !(
                String(f.fileId) === String(fileId) &&
                String(f.seq) === String(seq)
              );
            }),
          );
          // 성공 메시지 표시 (확인 시 목록으로 가지 않음)
          setMessageDialogTitle("삭제 완료");
          setMessageDialogMessage(
            response.message || "첨부파일이 삭제되었습니다.",
          );
          setMessageDialogNavigateToList(false);
          setMessageDialogType("success");
          setShowMessageDialog(true);
        }
      } else {
        // 삭제 실패 시
        const errorMsg = response.message || "첨부파일 삭제에 실패했습니다.";
        setMessageDialogTitle("삭제 실패");
        setMessageDialogMessage(errorMsg);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        console.error("첨부파일 삭제 실패:", errorMsg, response);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("첨부파일 삭제 오류:", err);
      setMessageDialogTitle("삭제 실패");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : "첨부파일 삭제 중 오류가 발생했습니다.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("첨부파일 삭제 중 오류가 발생했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** 상세 모드 서버 저장 첨부 다운로드 (파일명 클릭 시) */
  const downloadExistingSupportApplicationAttachment = useCallback(
    async (file: ArtappmFileItem) => {
      const fileId = file.fileId != null ? String(file.fileId).trim() : "";
      const seqNum = file.seq != null ? Number(file.seq) : Number.NaN;
      if (!fileId || Number.isNaN(seqNum)) {
        setMessageDialogTitle("다운로드 실패");
        setMessageDialogMessage("파일 정보가 올바르지 않습니다.");
        setMessageDialogNavigateToList(false);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      try {
        await downloadEdreamAttachment(
          fileId,
          seqNum,
          file.orgfNm || file.saveNm || undefined,
        );
      } catch (err) {
        setMessageDialogTitle("다운로드 실패");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "파일 다운로드 중 오류가 발생했습니다.",
        );
        setMessageDialogNavigateToList(false);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    },
    [],
  );

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // 보호자명 필수 체크 (보호자 검색 필수)
    if (!formData.parentName || formData.parentName.trim() === "") {
      newErrors.parentName = "보호자를 검색하여 선택해주세요.";
      isValid = false;
    }

    // 보호자 고유ID 필수 체크
    if (!formData.parentEsntlId || formData.parentEsntlId.trim() === "") {
      newErrors.parentName = "보호자를 검색하여 선택해주세요.";
      isValid = false;
    }

    // 보호자 생년월일 필수
    if (!formData.parentBirthDate || formData.parentBirthDate.trim() === "") {
      newErrors.parentBirthDate = "보호자 생년월일을 입력해주세요.";
      isValid = false;
    }

    // 보호자 연락처 필수
    if (!formData.parentPhone || formData.parentPhone.trim() === "") {
      newErrors.parentPhone = "보호자 연락처를 입력해주세요.";
      isValid = false;
    }

    // 학교명 필수
    if (!formData.schoolName || formData.schoolName.trim() === "") {
      newErrors.schoolName = "학교명을 선택해주세요.";
      isValid = false;
    }

    // 학년 필수
    if (!formData.gradeInfo || formData.gradeInfo.trim() === "") {
      newErrors.gradeInfo = "학년을 선택해주세요.";
      isValid = false;
    }

    // 학생명 필수 체크 (학생 검색 필수)
    if (!formData.studentName || formData.studentName.trim() === "") {
      newErrors.studentName = "학생을 검색하여 선택해주세요.";
      isValid = false;
    }

    // 학생 고유ID 필수 체크
    if (!formData.studentEsntlId || formData.studentEsntlId.trim() === "") {
      newErrors.studentName = "학생을 검색하여 선택해주세요.";
      isValid = false;
    }

    // 학생 연락처 필수
    if (!formData.studentPhone || formData.studentPhone.trim() === "") {
      newErrors.studentPhone = "학생 연락처를 입력해주세요.";
      isValid = false;
    }

    // 학생 생년월일 필수
    if (!formData.studentBirthDate || formData.studentBirthDate.trim() === "") {
      newErrors.studentBirthDate = "학생 생년월일을 입력해주세요.";
      isValid = false;
    }

    // 학생 주소(도로명) 필수
    if (!formData.studentAddress || formData.studentAddress.trim() === "") {
      newErrors.studentAddress = "주소를 입력해주세요.";
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) {
      const firstErrorFieldName = Object.keys(newErrors)[0];
      if (firstErrorFieldName) {
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

      // 날짜 형식 변환 (YYYY-MM-DD -> YYYYMMDD)
      const formatDate = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined;
        return dateStr.replace(/-/g, "");
      };

      // 신청분야 형식 변환:
      // 각 분야를 "Y|내용|" 또는 "N||" 형태로 직렬화
      // - 체크박스 체크 + 텍스트 있음: "Y|텍스트|"
      // - 그 외: "N||"
      const getFieldValue = (
        checked: boolean,
        fieldText: string | undefined,
      ): string => {
        if (checked && fieldText?.trim()) {
          return `Y|${fieldText.trim()}|`;
        }
        return "N||";
      };

      // 다섯 개 분야를 구분자 없이 그대로 이어 붙임
      // 예: N||Y|222|Y|333|Y|444|Y|555|
      const reqPart =
        getFieldValue(formData.humanitiesChecked, formData.humanitiesField) +
        getFieldValue(formData.scienceChecked, formData.scienceField) +
        getFieldValue(formData.artsChecked, formData.artsField) +
        getFieldValue(formData.characterChecked, formData.characterField) +
        getFieldValue(formData.otherChecked, formData.otherField);

      // formData를 ArtappmInsertRequest 형식으로 변환
      // 디버깅: 보호자 정보 확인 (DB 컬럼명 기준)
      console.log("보호자 정보 (DB 컬럼명 기준):", {
        pEsntlId: formData.parentEsntlId, // P_ESNTL_ID 컬럼
        pUserNm: formData.parentName, // P_USER_NM 컬럼
      });

      // 빈 문자열 체크 및 값 확인
      const pEsntlIdValue = formData.parentEsntlId?.trim() || "";
      const pUserNmValue = formData.parentName?.trim() || "";

      console.log("보호자 정보 값 확인:", {
        pEsntlId: pEsntlIdValue,
        pEsntlIdLength: pEsntlIdValue.length,
        pUserNm: pUserNmValue,
        pUserNmLength: pUserNmValue.length,
      });

      // 학생 고유ID 확인
      const studentEsntlIdValue = formData.studentEsntlId?.trim() || "";

      const requestData: ArtappmInsertRequest = {
        proId: businessId || "", // 사업코드
        proType: formData.applicationType === "INDIVIDUAL" ? "01" : "02", // 01:1인탐구형, 02:모둠 탐구형
        reqEsntlId: pEsntlIdValue, // 신청자(학부모) ID → REQ_ESNTL_ID
        cEsntlId: studentEsntlIdValue, // 학생 ID → C_ESNTL_ID
        pEsntlId: pEsntlIdValue, // 학부모ID (보호자 고유ID) - P_ESNTL_ID 컬럼
        headNm: pUserNmValue, // 세대주명 (보호자명)
        pUserNm: pUserNmValue, // 보호자명 - P_USER_NM 컬럼
        mbtlnum: formData.parentPhone?.replace(/-/g, ""), // 보호자 연락처 (하이픈 제거)
        brthdy: formatDate(formData.parentBirthDate), // 보호자 생년월일 (YYYYMMDD 형식)
        schoolId: formData.schoolCode?.trim() || undefined, // 학교 ID (상세 조회 시 학교명·학년·반 표시용)
        schoolGb: formData.schoolGb, // 학교구분 코드 (E, J, H, U, T)
        schoolNm: formData.schoolName, // 학교명
        schoolLvl: formData.gradeInfo
          ? parseInt(formData.gradeInfo)
          : undefined, // 학년
        schoolNo: formData.gradeInfo2
          ? parseInt(formData.gradeInfo2)
          : undefined, // 반
        payBankCode: formData.bankName, // 은행코드
        payBank: formData.accountNumber, // 계좌번호
        holderNm: formData.depositorName, // 예금주
        reqPart: reqPart, // 신청분야 (형식: N||Y|텍스트|N||N||N||N||)
        playPart: formData.activityScope === "INSIDE" ? "1" : "2", // 활동범위 (1:군산 내, 2:군산 외)
        reqObj: formData.purpose, // 목적
        reqPlay: formData.activityContent, // 활동내용
        reqPlan: formData.budgetPlan, // 예산 사용계획
        reqDesc: formData.other, // 기타
        reaDesc: formData.reaDesc?.trim() || undefined, // 사유 (REA_DESC)
        sttusCode: formData.status || "01", // 상태코드 (01:임시저장, 02:신청, 03:승인, 04:완료, 11:반려, 12:중단, 99:취소)
        // 선정여부 → 결과구분(RESULT_GB) N:미선정, Y:선정, R:예비
        resultGb:
          formData.selectionStatus ||
          (mode === "detail" ? detailData?.resultGb : undefined),
        reqDt:
          mode === "detail"
            ? detailData?.reqDt ||
              new Date().toISOString().slice(0, 19).replace("T", " ")
            : new Date().toISOString().slice(0, 19).replace("T", " "), // 신청일시
        certYn: "Y", // 샘플업무 신청등록 시 인증여부 무조건 Y
      };

      // 상세 모드에서는 PK, 파일/결과 관련 필드 및 기타 필드를 기존 값으로 보존 (detailData 기준)
      if (mode === "detail") {
        requestData.reqId = detailData?.reqId ?? reqId ?? ""; // 수정 시 필수 (백엔드 WHERE REQ_ID)
        requestData.proSeq = detailData?.proSeq;
        // 신청자=부모·학생=C_ESNTL_ID는 폼 값(requestData) 유지 (detail의 구형 req=학생 덮어쓰기 금지)

        // 다자녀 등 UI에 없는 필드는 원본 값 유지 (인증여부는 항상 Y)
        requestData.certYn = "Y"; // 수정 시에도 인증여부 무조건 Y
        requestData.mchilYn = detailData?.mchilYn ?? requestData.mchilYn;
        requestData.mchilNm = detailData?.mchilNm ?? requestData.mchilNm;
        requestData.schoolId = detailData?.schoolId ?? requestData.schoolId; // 상세 조회 시 학교 ID로 학교명·학년·반 표시

        // 파일/결과/일시/사유 등도 유지
        requestData.fileId = detailData?.fileId ?? requestData.fileId;
        requestData.aprrDt = detailData?.aprrDt ?? requestData.aprrDt;
        requestData.chgDt = detailData?.chgDt ?? requestData.chgDt;
        requestData.stopDt = detailData?.stopDt ?? requestData.stopDt;
      }

      // 디버깅: 전송할 데이터 확인
      console.log("전송할 requestData:", JSON.stringify(requestData, null, 2));
      console.log("pEsntlId 값 (P_ESNTL_ID 컬럼):", requestData.pEsntlId);
      console.log("pEsntlId 타입:", typeof requestData.pEsntlId);
      console.log("pUserNm 값 (P_USER_NM 컬럼):", requestData.pUserNm);
      console.log("pUserNm 타입:", typeof requestData.pUserNm);

      // 첨부파일 배열 생성
      const files = selectedFiles.map((item) => item.file);

      // API 호출 (등록 / 수정 분기)
      const response =
        mode === "detail"
          ? await SupportApplicationService.updateArtappm(
              requestData,
              files.length > 0 ? files : undefined,
            )
          : await SupportApplicationService.insertArtappm(
              requestData,
              files.length > 0 ? files : undefined,
            );

      if (response.result === "00") {
        // 성공
        const successMessage =
          response.message ||
          (mode === "detail"
            ? "신청이 수정되었습니다."
            : "신청이 등록되었습니다.");

        setMessageDialogTitle(mode === "detail" ? "수정 완료" : "등록 완료");
        setMessageDialogMessage(successMessage);
        setMessageDialogNavigateToList(true);
        setMessageDialogType("success");
        setShowMessageDialog(true);

        if (mode === "detail") {
          // 수정 모드: 페이지 유지 + 상세 재조회로 첨부파일 목록 새로고침 (REQ_ID 기준)
          const refetchReqId = detailData?.reqId;
          if (refetchReqId) {
            try {
              const detailResponse: ArtappmDetailResponse =
                await SupportApplicationService.getArtappmDetail({
                  reqId: refetchReqId,
                });
              const files: ArtappmFileItem[] =
                (detailResponse &&
                  (detailResponse.files as ArtappmFileItem[])) ||
                [];
              setExistingFiles(files || []);

              // fileId 콘솔 출력 (저장 후 재조회)
              console.log("=== 저장 후 재조회 - 파일 정보 ===");
              if (detailResponse.detail) {
                console.log(
                  "ARTAPPM.FILE_ID (그룹 fileId):",
                  detailResponse.detail.fileId,
                );
              }
              if (files && files.length > 0) {
                console.log("첨부파일 목록:");
                files.forEach((file, index) => {
                  console.log(`  파일 ${index + 1}:`, {
                    fileId: file.fileId,
                    seq: file.seq,
                    orgfNm: file.orgfNm,
                  });
                });
              } else {
                console.log("첨부파일 없음");
              }
              console.log("====================================");
            } catch (err) {
              console.error("저장 후 상세 재조회 중 오류가 발생했습니다:", err);
              // 재조회 실패는 치명적이지 않으므로 에러 메시지로만 표시
              if (err instanceof Error) {
                setError(
                  err.message ||
                    "저장 후 상세 정보를 다시 불러오는 중 오류가 발생했습니다.",
                );
              }
            }
          }
          // 새로 추가했던 파일 목록은 초기화
          setSelectedFiles([]);
        }
        // 등록 모드는 다이얼로그 확인 후 목록으로 이동 (handleMessageDialogClose에서 처리)
      } else {
        // 실패
        const errorPrefix = mode === "detail" ? "신청 수정" : "신청 등록";
        setMessageDialogTitle(mode === "detail" ? "수정 실패" : "등록 실패");
        setMessageDialogMessage(
          response.message || `${errorPrefix} 중 오류가 발생했습니다.`,
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      const actionLabel = mode === "detail" ? "신청 수정" : "신청 등록";
      console.error(`${actionLabel} 오류:`, err);
      setMessageDialogTitle(mode === "detail" ? "수정 실패" : "등록 실패");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : `${actionLabel} 중 오류가 발생했습니다.`,
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/adminWeb/support/detail?businessId=${businessId || ""}`);
  };

  // 메시지 다이얼로그 닫기 핸들러
  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === "success" && messageDialogNavigateToList) {
      router.push(`/adminWeb/support/detail?businessId=${businessId || ""}`);
    }
    setMessageDialogNavigateToList(false);
  };

  // 상세 모드일 때 기존 신청 정보 조회 (REQ_ID 기준 by-req-id API)
  useEffect(() => {
    if (mode !== "detail") return;
    if (!reqId) return;

    let cancelled = false;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError("");

        const response: ArtappmDetailResponse =
          await SupportApplicationService.getArtappmDetail({ reqId });

        // 상세 데이터
        const rawDetail =
          (response && (response.detail || (response as any).data)) || null;

        if (!rawDetail || cancelled) {
          return;
        }

        const detail: any = rawDetail;
        setDetailData(detail);

        // 첨부파일 목록 (기존 파일)
        const files: ArtappmFileItem[] =
          (response && (response.files as ArtappmFileItem[])) || [];
        if (!cancelled) {
          setExistingFiles(files || []);

          // fileId 콘솔 출력
          console.log("=== 지원사업 신청 상세 - 파일 정보 ===");
          console.log("ARTAPPM.FILE_ID (그룹 fileId):", detail.fileId);
          if (files && files.length > 0) {
            console.log("첨부파일 목록:");
            files.forEach((file, index) => {
              console.log(`  파일 ${index + 1}:`, {
                fileId: file.fileId,
                seq: file.seq,
                orgfNm: file.orgfNm,
              });
            });
          } else {
            console.log("첨부파일 없음");
          }
          console.log("====================================");
        }

        // 신청분야 파싱: 직렬화 형식은 다음 2가지
        // - "N||"  : 체크 안 함
        // - "Y|텍스트|" : 체크 + 텍스트
        const parseReqPart = (reqPart?: string) => {
          const value = reqPart || "";
          let index = 0;

          const parseOne = () => {
            // 남은 문자열이 없으면 기본값
            if (index >= value.length) {
              return { text: "", checked: false };
            }

            const ch = value[index];

            // N|| 패턴
            if (ch === "N" && value.slice(index, index + 3) === "N||") {
              index += 3;
              return { text: "", checked: false };
            }

            // Y|텍스트| 패턴
            if (ch === "Y" && value[index + 1] === "|") {
              const start = index + 2;
              const end = value.indexOf("|", start);
              if (end === -1) {
                // 종료 구분자가 없으면 남은 부분 전체를 텍스트로 간주
                const text = value.slice(start);
                index = value.length;
                return { text, checked: true };
              }
              const text = value.slice(start, end);
              index = end + 1; // 마지막 '|' 다음으로 이동
              return { text, checked: true };
            }

            // 인식 못 하는 패턴이면 한 글자만 소비하고 비체크로 처리
            index += 1;
            return { text: "", checked: false };
          };

          const humanities = parseOne();
          const science = parseOne();
          const arts = parseOne();
          const character = parseOne();
          const other = parseOne();

          return {
            humanitiesField: humanities.text,
            scienceField: science.text,
            artsField: arts.text,
            characterField: character.text,
            otherField: other.text,
            humanitiesChecked: humanities.checked,
            scienceChecked: science.checked,
            artsChecked: arts.checked,
            characterChecked: character.checked,
            otherChecked: other.checked,
          };
        };

        const {
          humanitiesField,
          scienceField,
          artsField,
          characterField,
          otherField,
          humanitiesChecked,
          scienceChecked,
          artsChecked,
          characterChecked,
          otherChecked,
        } = parseReqPart(detail.reqPart);

        // 날짜 포맷: YYYYMMDD -> YYYY-MM-DD
        const formatDateFromYYYYMMDD = (value?: string): string => {
          if (!value) return "";
          const cleaned = value.replace(/-/g, "");
          if (cleaned.length !== 8) return value;
          return `${cleaned.slice(0, 4)}-${cleaned.slice(
            4,
            6,
          )}-${cleaned.slice(6, 8)}`;
        };

        // 학생 생년월일 / 성별 매핑
        // C_BRTHDY: 학생 생년월일 (YYYYMMDD)
        // C_SEXDSTN_CODE: 학생 성별 코드
        const studentBirthDate = formatDateFromYYYYMMDD(detail.cBrthdy || "");
        const studentGender = detail.cSexdstnCode === "F" ? "F" : "M";

        // SCHOOL_ID(schoolId/sdSchulCode)가 있으면 사용, 없으면 학교명으로 검색
        const findSchoolCodeByName = async (
          schoolName: string,
        ): Promise<string> => {
          if (!schoolName) return "";
          try {
            const response = await NeisService.getGunsanSchools({
              page: 0,
              size: 10,
              text: schoolName,
            });

            let schools: SchoolItem[] = [];
            if (Array.isArray(response)) {
              schools = response;
            } else if (response && typeof response === "object") {
              if (Array.isArray(response.content)) {
                schools = response.content;
              } else if (Array.isArray(response.data)) {
                schools = response.data;
              }
            }

            const matchedSchool = schools.find(
              (school) => school.schulNm === schoolName,
            );
            if (matchedSchool?.sdSchulCode) {
              return matchedSchool.sdSchulCode;
            }
          } catch (err) {
            console.error("학교 코드 찾기 실패:", err);
          }
          return "";
        };

        const schoolCodeFromId =
          (detail as { schoolId?: string; sdSchulCode?: string }).schoolId ||
          (detail as { schoolId?: string; sdSchulCode?: string }).sdSchulCode ||
          "";
        const schoolCode = schoolCodeFromId
          ? schoolCodeFromId
          : await findSchoolCodeByName(detail.schoolNm || "");

        // 반 번호 매칭을 위한 변수 (나중에 사용)
        let matchedClassValue = "";
        let classOptions2ListForDebug: SelectOption[] = []; // 디버깅용

        // 학교 코드가 있으면 학급 정보 조회
        if (schoolCode) {
          try {
            setClassLoading(true);
            const classList = await NeisService.getClassInfo({
              sdSchulCode: schoolCode,
            });

            const gradeSet = new Set<string>();
            classList.forEach((item) => {
              if (item.grade) {
                gradeSet.add(item.grade);
              }
            });

            const gradeOptions: SelectOption[] = [
              { value: "", label: "선택" },
              ...Array.from(gradeSet)
                .sort()
                .map((grade) => ({
                  value: grade,
                  label: `${grade}학년`,
                })),
            ];

            setClassOptions(gradeOptions);

            // 학년이 있으면 반 목록도 조회
            const gradeInfo =
              detail.schoolLvl !== undefined && detail.schoolLvl !== null
                ? String(detail.schoolLvl)
                : "";

            const schoolNo =
              detail.schoolNo !== undefined && detail.schoolNo !== null
                ? Number(detail.schoolNo)
                : null;

            // 디버깅: 학년과 반 번호 확인
            console.log(
              "[상세 조회] 학년 (schoolLvl):",
              detail.schoolLvl,
              "->",
              gradeInfo,
            );
            console.log(
              "[상세 조회] 반 번호 (schoolNo):",
              detail.schoolNo,
              "->",
              schoolNo,
            );

            if (gradeInfo) {
              const filteredClasses = classList.filter(
                (item) => item.grade === gradeInfo,
              );

              const classOptions2List: SelectOption[] = [
                { value: "", label: "선택" },
                ...filteredClasses
                  .map((item) => ({
                    value: item.classNm || "",
                    label: formatClassLabel(item.classNm),
                  }))
                  .filter((item) => item.value !== ""),
              ];

              // 디버깅용으로 저장
              classOptions2ListForDebug = classOptions2List;

              // 디버깅: 반 목록 확인
              console.log(
                "[상세 조회] 반 목록 (classOptions2List):",
                classOptions2List,
              );
              console.log(
                "[상세 조회] classOptions2List의 실제 value들:",
                classOptions2List.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
              );
              console.log(
                "[상세 조회] classOptions2List의 value 타입:",
                classOptions2List.map((o) => ({
                  value: o.value,
                  valueType: typeof o.value,
                })),
              );

              setClassOptions2(classOptions2List);

              // 반 번호 매칭: SCHOOL_NO (숫자)를 classNm (예: "1반") 형식으로 변환
              if (schoolNo !== null && classOptions2List.length > 1) {
                // SCHOOL_NO와 일치하는 반 찾기 (예: 1 -> "1반")
                const matchedClass = classOptions2List.find((option) => {
                  if (!option.value) return false;
                  // "1반"에서 숫자만 추출하여 비교
                  const classNumber = parseInt(
                    option.value.replace(/[^0-9]/g, ""),
                  );
                  const isMatch = classNumber === schoolNo;
                  console.log(
                    `[상세 조회] 반 매칭 시도: "${option.value}" (숫자: ${classNumber}) vs SCHOOL_NO: ${schoolNo} -> ${isMatch}`,
                  );
                  return isMatch;
                });
                if (matchedClass) {
                  matchedClassValue = matchedClass.value;
                  console.log(
                    "[상세 조회] 매칭된 반:",
                    matchedClassValue,
                    "타입:",
                    typeof matchedClassValue,
                  );
                } else {
                  console.warn("[상세 조회] 반 번호 매칭 실패:", {
                    schoolNo,
                    availableClasses: classOptions2List.map((o) => o.value),
                  });
                  // 매칭 실패 시 숫자 그대로 사용
                  matchedClassValue = String(schoolNo);
                }
              } else if (schoolNo !== null) {
                // 반 목록이 없거나 1개 이하인 경우 숫자 그대로 사용
                matchedClassValue = String(schoolNo);
              }
            } else {
              setClassOptions2([{ value: "", label: "선택" }]);
              // 학년이 없어도 반 번호는 설정
              if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
                matchedClassValue = String(detail.schoolNo);
              }
            }
          } catch (err) {
            console.error("[상세 조회] 학급 정보 조회 실패:", err);
            setClassOptions([{ value: "", label: "선택" }]);
            setClassOptions2([{ value: "", label: "선택" }]);
            // 에러 발생 시에도 반 번호는 설정
            if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
              matchedClassValue = String(detail.schoolNo);
            }
          } finally {
            setClassLoading(false);
          }
        } else {
          // 학교 코드가 없어도 반 번호는 설정할 수 있도록
          if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
            matchedClassValue = String(detail.schoolNo);
          }
        }

        setFormData((prev) => {
          const newGradeInfo2 =
            matchedClassValue ||
            (detail.schoolNo !== undefined && detail.schoolNo !== null
              ? String(detail.schoolNo)
              : "");

          const newFormData = {
            ...prev,
            // 상단
            programTitle: prev.programTitle || "",
            status: detail.sttusCode || prev.status,
            selectionStatus: detail.resultGb || "N",

            // 유형
            applicationType: detail.proType === "02" ? "GROUP" : "INDIVIDUAL",

            // 보호자 정보
            parentName: detail.pUserNm || "",
            parentEsntlId: detail.pEsntlId || "",
            parentBirthDate: formatDateFromYYYYMMDD(detail.brthdy),
            parentPhone: formatPhoneNumber(detail.mbtlnum || ""),

            // 학교정보
            schoolName: detail.schoolNm || "",
            schoolCode: schoolCode, // 찾은 학교 코드 설정
            schoolGb: detail.schoolGb || "",
            gradeInfo:
              detail.schoolLvl !== undefined && detail.schoolLvl !== null
                ? String(detail.schoolLvl)
                : "",
            gradeInfo2: newGradeInfo2,

            // 학생정보 (신규: cEsntlId, 구데이터: REQ_ESNTL_ID가 학생이었음)
            studentName: detail.userNm || "",
            studentEsntlId:
              (detail.cEsntlId && String(detail.cEsntlId).trim()) ||
              detail.reqEsntlId ||
              "",
            studentGender,
            studentPhone: formatPhoneNumber(detail.cMbtlnum || ""),
            studentBirthDate,
            studentPostalCode: detail.zip || "",
            studentAddress: detail.adres || "",
            studentDetailAddress: detail.detailAdres || "",

            // 계좌정보
            accountNumber: detail.payBank || "",
            bankName: detail.payBankCode || "",
            depositorName: detail.holderNm || "",

            // 신청분야
            humanitiesField,
            scienceField,
            artsField,
            characterField,
            otherField,
            humanitiesChecked,
            scienceChecked,
            artsChecked,
            characterChecked,
            otherChecked,

            // 활동계획서
            activityScope: detail.playPart === "2" ? "OUTSIDE" : "INSIDE",
            purpose: detail.reqObj || "",
            activityContent: detail.reqPlay || "",
            budgetPlan: detail.reqPlan || "",

            // 기타
            other: detail.reqDesc || "",
            reaDesc: detail.reaDesc || "",
          };

          // 디버깅: 최종 설정된 값 확인
          console.log("[상세 조회] 최종 설정된 반:", newGradeInfo2);
          if (classOptions2ListForDebug.length > 0) {
            console.log(
              "[상세 조회] classOptions2List의 value 목록:",
              classOptions2ListForDebug.map((o) => o.value),
            );
            console.log(
              "[상세 조회] gradeInfo2와 매칭 여부:",
              classOptions2ListForDebug.some((o) => o.value === newGradeInfo2),
            );
          }

          return newFormData;
        });
        if (detail.pEsntlId) {
          fetchStudentList(detail.pEsntlId);
        }
      } catch (err) {
        console.error("신청 상세 조회 오류:", err);
        if (!cancelled) {
          if (err instanceof Error) {
            setError(
              err.message ||
                "신청 상세 정보를 불러오는 중 오류가 발생했습니다.",
            );
          } else {
            setError("신청 상세 정보를 불러오는 중 오류가 발생했습니다.");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [mode, reqId]);

  // classOptions2가 설정된 후 gradeInfo2를 동기화하는 useEffect
  // (등록/상세 공통) SCHOOL_NO(숫자)와 NEIS classNm("2반", "02" 등)을 매칭해서 반을 자동 선택
  useEffect(() => {
    if (classOptions2.length <= 1 || !formData.gradeInfo2) return;

    const currentValue = formData.gradeInfo2;

    const existsInOptions = classOptions2.some(
      (opt) => opt.value === currentValue,
    );

    if (!existsInOptions) {
      const numericValue = parseInt(currentValue);
      if (!isNaN(numericValue)) {
        const matchedClass = classOptions2.find((option) => {
          if (!option.value) return false;
          const classNumber = parseInt(
            String(option.value).replace(/[^0-9]/g, ""),
          );
          return classNumber === numericValue;
        });

        if (matchedClass) {
          setFormData((prev) => ({
            ...prev,
            gradeInfo2: matchedClass.value,
          }));
        } else {
          console.warn("[반 동기화] gradeInfo2 매칭 실패:", {
            currentValue,
            numericValue,
            availableOptions: classOptions2.map((o) => ({
              value: o.value,
              label: o.label,
            })),
          });
        }
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        gradeInfo2: currentValue,
      }));
    }
  }, [classOptions2, formData.gradeInfo2]);

  return {
    formData,
    loading,
    error,
    errors,
    selectedFiles,
    existingFiles,
    bankOptions,
    bankLoading,
    // 학교 검색 모달
    showSchoolModal,
    schoolSearchKeyword,
    setSchoolSearchKeyword,
    schoolList,
    schoolCurrentPage,
    setSchoolCurrentPage,
    schoolTotalPages,
    schoolLoading,
    handleSchoolSearch,
    handleSchoolSearchKeyPress,
    handleSchoolSelect,
    handleOpenSchoolModal,
    handleCloseSchoolModal,
    // 보호자 검색 모달
    showParentModal,
    parentSearchKeyword,
    setParentSearchKeyword,
    parentList,
    parentCurrentPage,
    setParentCurrentPage,
    parentTotalPages,
    parentLoading,
    handleParentSearch,
    handleParentSearchKeyPress,
    handleParentSelect,
    handleOpenParentModal,
    handleCloseParentModal,
    // 학생 콤보박스 (부모별 자녀 목록)
    studentList,
    studentLoading,
    handleStudentSelect,
    // 학급 정보
    classOptions,
    classOptions2,
    classLoading,
    handleInputChange,
    handleRadioChange,
    handleCheckboxChange,
    handleFilesSelected,
    removeFile,
    deleteExistingFile,
    handleDeleteFileClick,
    downloadExistingSupportApplicationAttachment,
    handleSubmit,
    handleCancel,
    // 메시지 다이얼로그
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleMessageDialogClose,
    // 삭제 확인 다이얼로그
    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    fileToDelete,
    setFileToDelete,
  };
}
