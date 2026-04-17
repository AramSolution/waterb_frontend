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
import { downloadWaterbAttachment } from "@/shared/lib";
import type {
  SupportApplicationMode,
  SupportApplicationDetailParams,
} from "./types";

export interface SupportApplicationRegisterFormData {
  // ?ë‹¨ ?•ë³´
  programTitle: string; // ?„ë¡œê·¸ë¨ ?œëª©
  status: string; // ?íƒœ (01:?„ì‹œ?€?? 02:? ì²­, 03:?¹ì¸, 04:?„ë£Œ, 11:ë°˜ë ¤, 12:ì¤‘ë‹¨, 99:ì·¨ì†Œ)
  selectionStatus: string; // ? ì •?¬ë? (N:ë¯¸ì„ ?? Y:? ì •, R:?ˆë¹„)

  // ? í˜•
  applicationType: string; // 1?¸íƒêµ¬í˜• / ëª¨ë‘  ?êµ¬??
  // ë³´í˜¸???•ë³´ (? íƒ ??armuser BRTHDY ?¬ìš©)
  parentName: string; // ë³´í˜¸?ëª…
  parentEsntlId: string; // ë³´í˜¸??ê³ ìœ ID
  parentBirthDate: string; // ë³´í˜¸???ë…„?”ì¼ (BRTHDY)
  parentPhone: string; // ë³´í˜¸???°ë½ì²?
  // ?™êµ?•ë³´
  schoolName: string; // ?™êµëª?  schoolCode: string; // ?™êµ KEYê°?(sdSchulCode)
  schoolGb: string; // ?™êµêµ¬ë¶„ ì½”ë“œ (E, J, H, U, T)
  gradeInfo: string; // ?™ë…„?•ë³´ (?™ë…„)
  gradeInfo2: string; // ?™ë…„?•ë³´2 (ë°?

  // ?™ìƒ?•ë³´
  studentName: string; // ?™ìƒëª?  studentEsntlId: string; // ?™ìƒ ê³ ìœ ID
  studentGender: string; // ?±ë³„ (????
  studentPhone: string; // ?™ìƒ ?°ë½ì²?  studentBirthDate: string; // ?™ìƒ ?ë…„?”ì¼ (BRTHDY ?œì‹œ??
  studentPostalCode: string; // ?°í¸ë²ˆí˜¸
  studentAddress: string; // ì£¼ì†Œ
  studentDetailAddress: string; // ?ì„¸ì£¼ì†Œ
  accountNumber: string; // ê³„ì¢Œë²ˆí˜¸
  bankName: string; // ?€?‰ëª…
  depositorName: string; // ?ˆê¸ˆì£?
  // ? ì²­ë¶„ì•¼
  humanitiesField: string; // ?¸ë¬¸ë¶„ì•¼
  scienceField: string; // ê³¼í•™ë¶„ì•¼
  artsField: string; // ?ˆì²´?¥ë¶„??  characterField: string; // ?¸ì„±ë¶„ì•¼
  otherField: string; // ê¸°í?
  humanitiesChecked: boolean; // ?¸ë¬¸ë¶„ì•¼ ì²´í¬ ?¬ë?
  scienceChecked: boolean; // ê³¼í•™ë¶„ì•¼ ì²´í¬ ?¬ë?
  artsChecked: boolean; // ?ˆì²´?¥ë¶„??ì²´í¬ ?¬ë?
  characterChecked: boolean; // ?¸ì„±ë¶„ì•¼ ì²´í¬ ?¬ë?
  otherChecked: boolean; // ê¸°í? ì²´í¬ ?¬ë?

  // ?œë™ê³„íš??  activityScope: string; // ?œë™ë²”ìœ„ (êµ°ì‚° ????
  purpose: string; // ëª©ì 
  activityContent: string; // ?œë™?´ìš©
  budgetPlan: string; // ?ˆì‚° ?¬ìš©ê³„íš

  // ê¸°í?
  other: string; // ê¸°í?
  reaDesc: string; // ?¬ìœ  (REA_DESC, VARCHAR 2048)
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
  if (value.includes("ë°?)) return value;
  if (/^\d+$/.test(value)) return `${value}ë°?;
  return value;
};

export function useSupportApplicationRegister(
  businessId?: string,
  options?: {
    mode?: SupportApplicationMode;
    /** ì§€?ì‚¬?…ì‹ ì²­ID(REQ_ID). ?ì„¸ ëª¨ë“œ ??GET by-req-id API ?¸ì¶œ???¬ìš© */
    reqId?: string;
  },
) {
  const router = useRouter();
  const mode: SupportApplicationMode = options?.mode || "register";
  const reqId = options?.reqId;

  const [formData, setFormData] = useState<SupportApplicationRegisterFormData>({
    programTitle: "",
    status: "02", // ê¸°ë³¸ê°? ? ì²­
    selectionStatus: "N", // ê¸°ë³¸ê°? ë¯¸ì„ ??    applicationType: "INDIVIDUAL", // ê¸°ë³¸ê°? 1?¸íƒêµ¬í˜• (?¼ìª½)
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
    studentGender: "M", // ê¸°ë³¸ê°? ??(?¼ìª½)
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
    activityScope: "INSIDE", // ê¸°ë³¸ê°? êµ°ì‚° ??(?¼ìª½)
    purpose: "",
    activityContent: "",
    budgetPlan: "",
    other: "",
    reaDesc: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});

  // ë©”ì‹œì§€ ?¤ì´?¼ë¡œê·?ê´€???íƒœ
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState("");
  const [messageDialogMessage, setMessageDialogMessage] = useState("");
  const [messageDialogType, setMessageDialogType] = useState<
    "danger" | "success"
  >("success");
  /** true: ?±ë¡/?˜ì • ?€???±ê³µ ???•ì¸ ??? ì²­ëª©ë¡?¼ë¡œ ?´ë™. ì²¨ë??Œì¼ ?? œ ?±ê³µ?€ false(?ì„¸ ? ì?) */
  const [messageDialogNavigateToList, setMessageDialogNavigateToList] =
    useState(false);

  // ì²¨ë??Œì¼ ê´€???íƒœ
  const [selectedFiles, setSelectedFiles] = useState<
    { id: string; file: File }[]
  >([]);
  const [existingFiles, setExistingFiles] = useState<ArtappmFileItem[]>([]);

  // ?Œì¼ ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·?ê´€???íƒœ
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ArtappmFileItem | null>(
    null,
  );

  // ?€??ëª©ë¡ ê´€???íƒœ
  const [bankOptions, setBankOptions] = useState<SelectOption[]>([
    { value: "", label: "? íƒ?˜ì„¸?? },
  ]);
  const [bankLoading, setBankLoading] = useState(true);

  // ?€??ëª©ë¡ ì¡°íšŒ (ARM002)
  useEffect(() => {
    let cancelled = false;

    async function fetchBankOptions() {
      setBankLoading(true);
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId("ARM002");
        if (cancelled) return;

        // codeNm?¼ë¡œ ?œì‹œ?˜ê³ , code ê°’ì„ ?€??        const options: SelectOption[] = [
          { value: "", label: "? íƒ?˜ì„¸?? },
          ...list.map((item) => ({
            value: item.code, // code ê°’ì„ ?€??            label: item.codeNm || item.code, // codeNm?¼ë¡œ ?œì‹œ
          })),
        ];
        setBankOptions(options);
      } catch (err) {
        if (!cancelled) {
          console.error("?€??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨:", err);
          // ?ëŸ¬ ë°œìƒ ??ê¸°ë³¸ ?µì…˜ë§?? ì?
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

  // ?™êµ ê²€??ëª¨ë‹¬ ê´€???íƒœ
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [schoolSearchKeyword, setSchoolSearchKeyword] = useState("");
  const [schoolList, setSchoolList] = useState<SchoolItem[]>([]);
  const [schoolCurrentPage, setSchoolCurrentPage] = useState(1);
  const [schoolTotalPages, setSchoolTotalPages] = useState(0);
  const [schoolTotalElements, setSchoolTotalElements] = useState(0);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const schoolPageSize = 15;

  // ë³´í˜¸??ê²€??ëª¨ë‹¬ ê´€???íƒœ
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentSearchKeyword, setParentSearchKeyword] = useState("");
  const [parentList, setParentList] = useState<ArmuserDTO[]>([]);
  const [parentCurrentPage, setParentCurrentPage] = useState(1);
  const [parentTotalPages, setParentTotalPages] = useState(0);
  const [parentTotalElements, setParentTotalElements] = useState(0);
  const [parentLoading, setParentLoading] = useState(false);
  const parentPageSize = 15;

  // ?™ìƒ ì½¤ë³´ë°•ìŠ¤ ?µì…˜ (ë¶€ëª?? íƒ ???´ë‹¹ ë¶€ëª¨ì˜ ?ë? ëª©ë¡ from /api/admin/armchil/children)
  const [studentList, setStudentList] = useState<ArmchilChildDTO[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  // ?™ê¸‰ ?•ë³´ ê´€???íƒœ
  const [classOptions, setClassOptions] = useState<SelectOption[]>([
    { value: "", label: "? íƒ" },
  ]);
  const [classOptions2, setClassOptions2] = useState<SelectOption[]>([
    { value: "", label: "? íƒ" },
  ]);
  const [classLoading, setClassLoading] = useState(false);

  // ?™êµêµ¬ë¶„ ì½”ë“œ ë§¤í•‘ (EDR002: ì´ˆë“±?™êµ=E, ì¤‘í•™êµ?J, ê³ ë“±?™êµ=H, ?€?™êµ=U, ê¸°í?=T)
  const [schoolGbMapping, setSchoolGbMapping] = useState<Map<string, string>>(
    new Map(),
  );

  // ?ì„¸ ëª¨ë“œ?ì„œ ?ë³¸ ?ì„¸ ?°ì´??ë³´ê? (update ??ê¸°ì¡´ ê°?? ì???
  const [detailData, setDetailData] = useState<any | null>(null);

  // ?™êµêµ¬ë¶„ ì½”ë“œ ì¡°íšŒ (EDR002)
  useEffect(() => {
    let cancelled = false;

    async function fetchSchoolGbMapping() {
      try {
        const list = await CmmCodeService.getDetailCodeListByCodeId("EDR002");
        if (cancelled) return;

        // ?™êµì¢…ë¥˜ëª?-> ì½”ë“œ ë§¤í•‘ ?ì„±
        // ?? "ì´ˆë“±?™êµ" -> "E", "ì¤‘í•™êµ? -> "J"
        const mapping = new Map<string, string>();
        list.forEach((item) => {
          if (item.codeNm && item.code) {
            mapping.set(item.codeNm, item.code);
          }
        });
        setSchoolGbMapping(mapping);
      } catch (err) {
        console.error("?™êµêµ¬ë¶„ ì½”ë“œ ì¡°íšŒ ?¤íŒ¨:", err);
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

  // ?™êµ ëª©ë¡ ì¡°íšŒ
  const fetchSchoolList = useCallback(async () => {
    try {
      setSchoolLoading(true);
      const response = await NeisService.getGunsanSchools({
        page: schoolCurrentPage - 1, // 0ë¶€???œì‘
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
      console.error("?™êµ ëª©ë¡ ì¡°íšŒ ?¤íŒ¨:", err);
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

  // ?˜ì´ì§€ ë³€ê²????ë™ ì¡°íšŒ (ëª¨ë‹¬???´ë ¤?ˆì„ ?Œë§Œ)
  useEffect(() => {
    if (showSchoolModal) {
      fetchSchoolListRef.current();
    }
  }, [schoolCurrentPage, showSchoolModal, fetchSchoolListRef]);

  // ?™êµ ê²€??(Enter ???ëŠ” ë²„íŠ¼ ?´ë¦­)
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

  // ?™êµ ? íƒ ???™ê¸‰ ?•ë³´ ì¡°íšŒ
  const handleSchoolSelect = async (school: SchoolItem) => {
    const schoolCode = school.sdSchulCode || "";
    const schoolName = school.schulNm || "";
    const schoolTypeName = school.schulKndScNm || ""; // "ì´ˆë“±?™êµ", "ì¤‘í•™êµ? ??
    // ?™êµì¢…ë¥˜ëª…ì„ ì½”ë“œë¡?ë³€??    // ?? "ì´ˆë“±?™êµ" -> "E", "ì¤‘í•™êµ? -> "J"
    const schoolGbCode = schoolGbMapping.get(schoolTypeName) || "";

    setFormData((prev) => ({
      ...prev,
      schoolName: schoolName, // ?™êµëª??€??      schoolCode: schoolCode, // ?™êµ KEY ?€??      schoolGb: schoolGbCode, // ?™êµêµ¬ë¶„ ì½”ë“œ ?€??(E, J, H, U, T)
      gradeInfo: "", // ì´ˆê¸°??      gradeInfo2: "", // ì´ˆê¸°??    }));

    setShowSchoolModal(false);
    setSchoolSearchKeyword("");

    // ?™ê¸‰ ?•ë³´ ì¡°íšŒ
    if (schoolCode) {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: schoolCode,
        });

        // ?™ë…„ ëª©ë¡ ?ì„± (ì¤‘ë³µ ?œê±°)
        const gradeSet = new Set<string>();
        classList.forEach((item) => {
          if (item.grade) {
            gradeSet.add(item.grade);
          }
        });

        const gradeOptions: SelectOption[] = [
          { value: "", label: "? íƒ" },
          ...Array.from(gradeSet)
            .sort()
            .map((grade) => ({
              value: grade,
              label: `${grade}?™ë…„`,
            })),
        ];

        setClassOptions(gradeOptions);
        setClassOptions2([{ value: "", label: "? íƒ" }]); // ë°?ëª©ë¡ ì´ˆê¸°??      } catch (err) {
        console.error("?™ê¸‰ ?•ë³´ ì¡°íšŒ ?¤íŒ¨:", err);
        setClassOptions([{ value: "", label: "? íƒ" }]);
        setClassOptions2([{ value: "", label: "? íƒ" }]);
      } finally {
        setClassLoading(false);
      }
    }
  };

  // ?™ë…„ ? íƒ ??ë°?ëª©ë¡ ?…ë°?´íŠ¸
  useEffect(() => {
    if (!formData.gradeInfo || !formData.schoolCode) {
      setClassOptions2([{ value: "", label: "? íƒ" }]);
      return;
    }

    const fetchClassList = async () => {
      try {
        setClassLoading(true);
        const classList = await NeisService.getClassInfo({
          sdSchulCode: formData.schoolCode,
        });

        // ? íƒ???™ë…„???´ë‹¹?˜ëŠ” ë°?ëª©ë¡ ?„í„°ë§?        const filteredClasses = classList.filter(
          (item) => item.grade === formData.gradeInfo,
        );

        const classOptions2List: SelectOption[] = [
          { value: "", label: "? íƒ" },
          ...filteredClasses
            .map((item) => ({
              value: item.classNm || "",
              label: formatClassLabel(item.classNm),
            }))
            .filter((item) => item.value !== ""),
        ];

        setClassOptions2(classOptions2List);
        // ?ì„¸ ëª¨ë“œê°€ ?„ë‹ˆê³? ?„ì§ ?™ìƒ??? íƒ?˜ì? ?Šì? ?íƒœ?ì„œë§?ë°˜ì„ ì´ˆê¸°??        // ???™ìƒ ? íƒ?¼ë¡œ ?¸í•´ ?™ë…„/?™êµê°€ ë°”ë€?ê²½ìš°?ëŠ” gradeInfo2ë¥?? ì?
        if (mode !== "detail" && !formData.studentEsntlId) {
          setFormData((prev) => ({ ...prev, gradeInfo2: "" })); // ë°?ì´ˆê¸°??        }
      } catch (err) {
        console.error("ë°??•ë³´ ì¡°íšŒ ?¤íŒ¨:", err);
        setClassOptions2([{ value: "", label: "? íƒ" }]);
      } finally {
        setClassLoading(false);
      }
    };

    fetchClassList();
  }, [formData.gradeInfo, formData.schoolCode, formData.studentEsntlId, mode]);

  // ?™êµ ëª¨ë‹¬ ?´ê¸°
  const handleOpenSchoolModal = () => {
    setShowSchoolModal(true);
    setSchoolSearchKeyword("");
    setSchoolCurrentPage(1);
    fetchSchoolListRef.current();
  };

  // ?™êµ ëª¨ë‹¬ ?«ê¸°
  const handleCloseSchoolModal = () => {
    setShowSchoolModal(false);
    setSchoolSearchKeyword("");
  };

  // ë³´í˜¸??ëª©ë¡ ì¡°íšŒ
  const fetchParentList = useCallback(async () => {
    try {
      setParentLoading(true);
      const response = await ArmuserService.getList({
        userSe: "PNR", // ?™ë?ëª?        mberSttus: "P", // ?¬ìš©ì¤??Œì›ë§?        searchCondition: parentSearchKeywordRef.current ? "1" : undefined, // ?´ë¦„?¼ë¡œ ê²€??        searchKeyword: parentSearchKeywordRef.current || undefined,
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
      console.error("ë³´í˜¸??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨:", err);
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

  // ?˜ì´ì§€ ë³€ê²????ë™ ì¡°íšŒ (ëª¨ë‹¬???´ë ¤?ˆì„ ?Œë§Œ)
  useEffect(() => {
    if (showParentModal) {
      fetchParentListRef.current();
    }
  }, [parentCurrentPage, showParentModal, fetchParentListRef]);

  // ë³´í˜¸??ê²€??(Enter ???ëŠ” ë²„íŠ¼ ?´ë¦­)
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

  // ë³´í˜¸??? íƒ
  const handleParentSelect = (parent: ArmuserDTO) => {
    console.log("? íƒ??ë³´í˜¸??", parent);
    setFormData((prev) => {
      // ?ë…„?”ì¼ ?¬ë§·??(YYYY-MM-DD ?•ì‹?¼ë¡œ ë³€??
      let formattedBirthDate = prev.parentBirthDate;
      if (parent.brthdy) {
        // YYYY-MM-DD ?•ì‹?´ë©´ ê·¸ë?ë¡??¬ìš©
        if (parent.brthdy.includes("-")) {
          formattedBirthDate = parent.brthdy;
        } else {
          // YYYYMMDD ?•ì‹?´ë©´ YYYY-MM-DDë¡?ë³€??          const cleaned = parent.brthdy.replace(/-/g, "");
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

      console.log("?¤ì •??ë³´í˜¸???•ë³´ (DB ì»¬ëŸ¼ëª?ê¸°ì?):", {
        pEsntlId: newData.parentEsntlId, // P_ESNTL_ID ì»¬ëŸ¼
        pUserNm: newData.parentName, // P_USER_NM ì»¬ëŸ¼
      });

      return newData;
    });
    setStudentList([]);
    handleCloseParentModal();
    fetchStudentList(parent.esntlId || "");
  };

  // ë³´í˜¸??ëª¨ë‹¬ ?´ê¸°
  const handleOpenParentModal = () => {
    setShowParentModal(true);
    setParentSearchKeyword("");
    setParentCurrentPage(1);
    fetchParentListRef.current();
  };

  // ë³´í˜¸??ëª¨ë‹¬ ?«ê¸°
  const handleCloseParentModal = () => {
    setShowParentModal(false);
    setParentSearchKeyword("");
  };

  // ?™ìƒ(?ë?) ëª©ë¡ ì¡°íšŒ: ? íƒ???™ë?ëª¨ì˜ ?ë?ë§?/api/admin/armchil/children ë¡?ì¡°íšŒ
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
      console.error("?ë? ëª©ë¡ ì¡°íšŒ ?¤íŒ¨:", err);
      setStudentList([]);
    } finally {
      setStudentLoading(false);
    }
  }, []);

  // ?™ìƒ ? íƒ(ì½¤ë³´ë°•ìŠ¤) ??/api/shared/armuser/{esntlId} ë¡??ì„¸ ì¡°íšŒ ???¼ì— ë°˜ì˜ + SCHOOL_IDë¡??™êµ/?™ê¸‰ ?¸íŒ…
  const handleStudentSelect = useCallback(async (esntlId: string) => {
    const id = esntlId?.trim();
    if (!id) return;
    try {
      setStudentLoading(true);
      const response = await ArmuserService.getDetail(id);
      const student = response.detail;
      if (!student) {
        setError("?™ìƒ ?•ë³´ë¥?ë¶ˆëŸ¬?????†ìŠµ?ˆë‹¤.");
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
      // ë°?SCHOOL_NO)?€ classOptions2??value(item.classNm) ?¬ë§·ê³??™ì¼?˜ê²Œ ?«ì ë¬¸ì?´ë¡œ ?€??      const gradeInfo2 =
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
            { value: "", label: "? íƒ" },
            ...Array.from(gradeSet)
              .sort()
              .map((grade) => ({ value: grade, label: `${grade}?™ë…„` })),
          ];
          setClassOptions(gradeOptions);
          const filteredClasses = classList.filter(
            (item) => item.grade === gradeInfo,
          );
          const classOptions2List: SelectOption[] = [
            { value: "", label: "? íƒ" },
            ...filteredClasses
              .map((item) => ({
                value: item.classNm || "",
                label: formatClassLabel(item.classNm),
              }))
              .filter((item) => item.value !== ""),
          ];
          setClassOptions2(classOptions2List);
        } catch (err) {
          console.error("?™ê¸‰ ?•ë³´ ì¡°íšŒ ?¤íŒ¨:", err);
          setClassOptions([{ value: "", label: "? íƒ" }]);
          setClassOptions2([{ value: "", label: "? íƒ" }]);
        } finally {
          setClassLoading(false);
        }
      } else {
        setClassOptions([{ value: "", label: "? íƒ" }]);
        setClassOptions2([{ value: "", label: "? íƒ" }]);
      }
    } catch (err) {
      console.error("?™ìƒ ?ì„¸ ì¡°íšŒ ?¤íŒ¨:", err);
      setError("?™ìƒ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
    } finally {
      setStudentLoading(false);
    }
  }, []);

  // ?„í™”ë²ˆí˜¸ ?¬ë§·???¨ìˆ˜ (?”ë©´ ?œì‹œ??
  const formatPhoneNumber = (value: string): string => {
    // ?«ìë§?ì¶”ì¶œ
    const numbers = value.replace(/[^\d]/g, "");

    // ê¸¸ì´???°ë¼ ?¬ë§·??    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      // 11?ë¦¬ ì´ˆê³¼ ??11?ë¦¬ê¹Œì?ë§?      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    // ?°ë½ì²??„ë“œ??ê²½ìš° ?¬ë§·???ìš© (?”ë©´ ?œì‹œ??
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

    // ?ëŸ¬ ë©”ì‹œì§€ ì´ˆê¸°??    if (errors[name as keyof ValidationErrors]) {
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

  // ê¸°ì¡´ ì²¨ë??Œì¼ ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·??œì‹œ
  const handleDeleteFileClick = (file: ArtappmFileItem) => {
    console.log("handleDeleteFileClick ?¸ì¶œ??", file);
    setFileToDelete(file);
    setShowDeleteConfirmDialog(true);
    console.log("showDeleteConfirmDialog ?¤ì •??", true);
  };

  // ê¸°ì¡´ ì²¨ë??Œì¼ ?? œ (?ì„¸ ëª¨ë“œ ?„ìš©). ?? œ/?ì„¸ ëª¨ë‘ reqId ê¸°ë°˜.
  const deleteExistingFile = async (file: ArtappmFileItem) => {
    console.log("deleteExistingFile ì§ì ‘ ?¸ì¶œ??", file);
    const reqId = detailData?.reqId;
    if (!reqId || !reqId.trim()) {
      setError(
        "ì²¨ë??Œì¼???? œ?˜ê¸° ?„í•œ ?ì„¸ ?•ë³´ê°€ ?†ìŠµ?ˆë‹¤. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨??ì£¼ì„¸??",
      );
      return;
    }

    // fileId?€ seqë¥?ë¬¸ì?´ë¡œ ë³€??(18?ë¦¬ ?«ì ?•ë???ë¬¸ì œ ?´ê²°)
    const fileId = file.fileId != null ? String(file.fileId) : null;
    const seq = file.seq != null ? String(file.seq) : null;

    if (!fileId || !seq) {
      console.error("?? œ???Œì¼??fileId ?ëŠ” seqê°€ ? íš¨?˜ì? ?ŠìŠµ?ˆë‹¤.", {
        file,
        fileId,
        seq,
        fileIdType: typeof file.fileId,
        seqType: typeof file.seq,
      });
      setError("?? œ???Œì¼ ?•ë³´ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("ì²¨ë??Œì¼ ?? œ ?”ì²­:", {
        reqId,
        fileId,
        seq,
      });

      const response = await SupportApplicationService.deleteArtappmFile({
        reqId: reqId.trim(),
        fileId,
        seq: Number(seq),
      });

      console.log("ì²¨ë??Œì¼ ?? œ ?‘ë‹µ:", response);

      if (response.result === "00") {
        // ?? œ ?±ê³µ ???ì„¸ ?•ë³´ë¥??¤ì‹œ ë¶ˆëŸ¬?€???Œì¼ ëª©ë¡ ê°±ì‹  (REQ_ID ê¸°ì?)
        const refetchReqId = detailData?.reqId;
        if (mode === "detail" && refetchReqId) {
          try {
            const detailResponse: ArtappmDetailResponse =
              await SupportApplicationService.getArtappmDetail({
                reqId: refetchReqId,
              });

            // ì²¨ë??Œì¼ ëª©ë¡ ê°±ì‹ 
            const files: ArtappmFileItem[] =
              (detailResponse && (detailResponse.files as ArtappmFileItem[])) ||
              [];
            setExistingFiles(files || []);

            // fileId ì½˜ì†” ì¶œë ¥ (?Œì¼ ?? œ ??
            console.log("=== ?Œì¼ ?? œ ???¬ì¡°??- ?Œì¼ ?•ë³´ ===");
            if (detailResponse.detail) {
              console.log(
                "ARTAPPM.FILE_ID (ê·¸ë£¹ fileId):",
                detailResponse.detail.fileId,
              );
            }
            if (files && files.length > 0) {
              console.log("?¨ì? ì²¨ë??Œì¼ ëª©ë¡:");
              files.forEach((file, index) => {
                console.log(`  ?Œì¼ ${index + 1}:`, {
                  fileId: file.fileId,
                  seq: file.seq,
                  orgfNm: file.orgfNm,
                });
              });
            } else {
              console.log("ì²¨ë??Œì¼ ?†ìŒ");
            }
            console.log("====================================");

            // ?±ê³µ ë©”ì‹œì§€ ?œì‹œ (?•ì¸ ??ëª©ë¡?¼ë¡œ ê°€ì§€ ?ŠìŒ)
            setMessageDialogTitle("?? œ ?„ë£Œ");
            setMessageDialogMessage(
              response.message || "ì²¨ë??Œì¼???? œ?˜ì—ˆ?µë‹ˆ??",
            );
            setMessageDialogNavigateToList(false);
            setMessageDialogType("success");
            setShowMessageDialog(true);
          } catch (refreshErr) {
            console.error("?? œ ???ì„¸ ?•ë³´ ê°±ì‹  ?¤ë¥˜:", refreshErr);
            // ê°±ì‹  ?¤íŒ¨?´ë„ ?„ë¡ ??ëª©ë¡?ì„œë§??œê±°
            setExistingFiles((prev) =>
              prev.filter((f) => {
                // String() ë³€?˜ìœ¼ë¡?ë¹„êµ (18?ë¦¬ ?«ì ?•ë???ë¬¸ì œ ?´ê²°)
                return !(
                  String(f.fileId) === String(fileId) &&
                  String(f.seq) === String(seq)
                );
              }),
            );
          }
        } else {
          // ?±ë¡ ëª¨ë“œ???ŒëŠ” ?„ë¡ ??ëª©ë¡?ì„œë§??œê±°
          setExistingFiles((prev) =>
            prev.filter((f) => {
              // String() ë³€?˜ìœ¼ë¡?ë¹„êµ (18?ë¦¬ ?«ì ?•ë???ë¬¸ì œ ?´ê²°)
              return !(
                String(f.fileId) === String(fileId) &&
                String(f.seq) === String(seq)
              );
            }),
          );
          // ?±ê³µ ë©”ì‹œì§€ ?œì‹œ (?•ì¸ ??ëª©ë¡?¼ë¡œ ê°€ì§€ ?ŠìŒ)
          setMessageDialogTitle("?? œ ?„ë£Œ");
          setMessageDialogMessage(
            response.message || "ì²¨ë??Œì¼???? œ?˜ì—ˆ?µë‹ˆ??",
          );
          setMessageDialogNavigateToList(false);
          setMessageDialogType("success");
          setShowMessageDialog(true);
        }
      } else {
        // ?? œ ?¤íŒ¨ ??        const errorMsg = response.message || "ì²¨ë??Œì¼ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
        setMessageDialogTitle("?? œ ?¤íŒ¨");
        setMessageDialogMessage(errorMsg);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        console.error("ì²¨ë??Œì¼ ?? œ ?¤íŒ¨:", errorMsg, response);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("ì²¨ë??Œì¼ ?? œ ?¤ë¥˜:", err);
      setMessageDialogTitle("?? œ ?¤íŒ¨");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : "ì²¨ë??Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
      );
      setMessageDialogType("danger");
      setShowMessageDialog(true);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("ì²¨ë??Œì¼ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** ?ì„¸ ëª¨ë“œ ?œë²„ ?€??ì²¨ë? ?¤ìš´ë¡œë“œ (?Œì¼ëª??´ë¦­ ?? */
  const downloadExistingSupportApplicationAttachment = useCallback(
    async (file: ArtappmFileItem) => {
      const fileId = file.fileId != null ? String(file.fileId).trim() : "";
      const seqNum = file.seq != null ? Number(file.seq) : Number.NaN;
      if (!fileId || Number.isNaN(seqNum)) {
        setMessageDialogTitle("?¤ìš´ë¡œë“œ ?¤íŒ¨");
        setMessageDialogMessage("?Œì¼ ?•ë³´ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
        setMessageDialogNavigateToList(false);
        setMessageDialogType("danger");
        setShowMessageDialog(true);
        return;
      }
      try {
        await downloadWaterbAttachment(
          fileId,
          seqNum,
          file.orgfNm || file.saveNm || undefined,
        );
      } catch (err) {
        setMessageDialogTitle("?¤ìš´ë¡œë“œ ?¤íŒ¨");
        setMessageDialogMessage(
          err instanceof Error
            ? err.message
            : "?Œì¼ ?¤ìš´ë¡œë“œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
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

    // ë³´í˜¸?ëª… ?„ìˆ˜ ì²´í¬ (ë³´í˜¸??ê²€???„ìˆ˜)
    if (!formData.parentName || formData.parentName.trim() === "") {
      newErrors.parentName = "ë³´í˜¸?ë? ê²€?‰í•˜??? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ë³´í˜¸??ê³ ìœ ID ?„ìˆ˜ ì²´í¬
    if (!formData.parentEsntlId || formData.parentEsntlId.trim() === "") {
      newErrors.parentName = "ë³´í˜¸?ë? ê²€?‰í•˜??? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ë³´í˜¸???ë…„?”ì¼ ?„ìˆ˜
    if (!formData.parentBirthDate || formData.parentBirthDate.trim() === "") {
      newErrors.parentBirthDate = "ë³´í˜¸???ë…„?”ì¼???…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ë³´í˜¸???°ë½ì²??„ìˆ˜
    if (!formData.parentPhone || formData.parentPhone.trim() === "") {
      newErrors.parentPhone = "ë³´í˜¸???°ë½ì²˜ë? ?…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™êµëª??„ìˆ˜
    if (!formData.schoolName || formData.schoolName.trim() === "") {
      newErrors.schoolName = "?™êµëª…ì„ ? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ë…„ ?„ìˆ˜
    if (!formData.gradeInfo || formData.gradeInfo.trim() === "") {
      newErrors.gradeInfo = "?™ë…„??? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ìƒëª??„ìˆ˜ ì²´í¬ (?™ìƒ ê²€???„ìˆ˜)
    if (!formData.studentName || formData.studentName.trim() === "") {
      newErrors.studentName = "?™ìƒ??ê²€?‰í•˜??? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ìƒ ê³ ìœ ID ?„ìˆ˜ ì²´í¬
    if (!formData.studentEsntlId || formData.studentEsntlId.trim() === "") {
      newErrors.studentName = "?™ìƒ??ê²€?‰í•˜??? íƒ?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ìƒ ?°ë½ì²??„ìˆ˜
    if (!formData.studentPhone || formData.studentPhone.trim() === "") {
      newErrors.studentPhone = "?™ìƒ ?°ë½ì²˜ë? ?…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ìƒ ?ë…„?”ì¼ ?„ìˆ˜
    if (!formData.studentBirthDate || formData.studentBirthDate.trim() === "") {
      newErrors.studentBirthDate = "?™ìƒ ?ë…„?”ì¼???…ë ¥?´ì£¼?¸ìš”.";
      isValid = false;
    }

    // ?™ìƒ ì£¼ì†Œ(?„ë¡œëª? ?„ìˆ˜
    if (!formData.studentAddress || formData.studentAddress.trim() === "") {
      newErrors.studentAddress = "ì£¼ì†Œë¥??…ë ¥?´ì£¼?¸ìš”.";
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

      // ? ì§œ ?•ì‹ ë³€??(YYYY-MM-DD -> YYYYMMDD)
      const formatDate = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined;
        return dateStr.replace(/-/g, "");
      };

      // ? ì²­ë¶„ì•¼ ?•ì‹ ë³€??
      // ê°?ë¶„ì•¼ë¥?"Y|?´ìš©|" ?ëŠ” "N||" ?•íƒœë¡?ì§ë ¬??      // - ì²´í¬ë°•ìŠ¤ ì²´í¬ + ?ìŠ¤???ˆìŒ: "Y|?ìŠ¤??"
      // - ê·??? "N||"
      const getFieldValue = (
        checked: boolean,
        fieldText: string | undefined,
      ): string => {
        if (checked && fieldText?.trim()) {
          return `Y|${fieldText.trim()}|`;
        }
        return "N||";
      };

      // ?¤ì„¯ ê°?ë¶„ì•¼ë¥?êµ¬ë¶„???†ì´ ê·¸ë?ë¡??´ì–´ ë¶™ì„
      // ?? N||Y|222|Y|333|Y|444|Y|555|
      const reqPart =
        getFieldValue(formData.humanitiesChecked, formData.humanitiesField) +
        getFieldValue(formData.scienceChecked, formData.scienceField) +
        getFieldValue(formData.artsChecked, formData.artsField) +
        getFieldValue(formData.characterChecked, formData.characterField) +
        getFieldValue(formData.otherChecked, formData.otherField);

      // formDataë¥?ArtappmInsertRequest ?•ì‹?¼ë¡œ ë³€??      // ?”ë²„ê¹? ë³´í˜¸???•ë³´ ?•ì¸ (DB ì»¬ëŸ¼ëª?ê¸°ì?)
      console.log("ë³´í˜¸???•ë³´ (DB ì»¬ëŸ¼ëª?ê¸°ì?):", {
        pEsntlId: formData.parentEsntlId, // P_ESNTL_ID ì»¬ëŸ¼
        pUserNm: formData.parentName, // P_USER_NM ì»¬ëŸ¼
      });

      // ë¹?ë¬¸ì??ì²´í¬ ë°?ê°??•ì¸
      const pEsntlIdValue = formData.parentEsntlId?.trim() || "";
      const pUserNmValue = formData.parentName?.trim() || "";

      console.log("ë³´í˜¸???•ë³´ ê°??•ì¸:", {
        pEsntlId: pEsntlIdValue,
        pEsntlIdLength: pEsntlIdValue.length,
        pUserNm: pUserNmValue,
        pUserNmLength: pUserNmValue.length,
      });

      // ?™ìƒ ê³ ìœ ID ?•ì¸
      const studentEsntlIdValue = formData.studentEsntlId?.trim() || "";

      const requestData: ArtappmInsertRequest = {
        proId: businessId || "", // ?¬ì—…ì½”ë“œ
        proType: formData.applicationType === "INDIVIDUAL" ? "01" : "02", // 01:1?¸íƒêµ¬í˜•, 02:ëª¨ë‘  ?êµ¬??        reqEsntlId: pEsntlIdValue, // ? ì²­???™ë?ëª? ID ??REQ_ESNTL_ID
        cEsntlId: studentEsntlIdValue, // ?™ìƒ ID ??C_ESNTL_ID
        pEsntlId: pEsntlIdValue, // ?™ë?ëª¨ID (ë³´í˜¸??ê³ ìœ ID) - P_ESNTL_ID ì»¬ëŸ¼
        headNm: pUserNmValue, // ?¸ë?ì£¼ëª… (ë³´í˜¸?ëª…)
        pUserNm: pUserNmValue, // ë³´í˜¸?ëª… - P_USER_NM ì»¬ëŸ¼
        mbtlnum: formData.parentPhone?.replace(/-/g, ""), // ë³´í˜¸???°ë½ì²?(?˜ì´???œê±°)
        brthdy: formatDate(formData.parentBirthDate), // ë³´í˜¸???ë…„?”ì¼ (YYYYMMDD ?•ì‹)
        schoolId: formData.schoolCode?.trim() || undefined, // ?™êµ ID (?ì„¸ ì¡°íšŒ ???™êµëª…Â·í•™?„Â·ë°˜ ?œì‹œ??
        schoolGb: formData.schoolGb, // ?™êµêµ¬ë¶„ ì½”ë“œ (E, J, H, U, T)
        schoolNm: formData.schoolName, // ?™êµëª?        schoolLvl: formData.gradeInfo
          ? parseInt(formData.gradeInfo)
          : undefined, // ?™ë…„
        schoolNo: formData.gradeInfo2
          ? parseInt(formData.gradeInfo2)
          : undefined, // ë°?        payBankCode: formData.bankName, // ?€?‰ì½”??        payBank: formData.accountNumber, // ê³„ì¢Œë²ˆí˜¸
        holderNm: formData.depositorName, // ?ˆê¸ˆì£?        reqPart: reqPart, // ? ì²­ë¶„ì•¼ (?•ì‹: N||Y|?ìŠ¤??N||N||N||N||)
        playPart: formData.activityScope === "INSIDE" ? "1" : "2", // ?œë™ë²”ìœ„ (1:êµ°ì‚° ?? 2:êµ°ì‚° ??
        reqObj: formData.purpose, // ëª©ì 
        reqPlay: formData.activityContent, // ?œë™?´ìš©
        reqPlan: formData.budgetPlan, // ?ˆì‚° ?¬ìš©ê³„íš
        reqDesc: formData.other, // ê¸°í?
        reaDesc: formData.reaDesc?.trim() || undefined, // ?¬ìœ  (REA_DESC)
        sttusCode: formData.status || "01", // ?íƒœì½”ë“œ (01:?„ì‹œ?€?? 02:? ì²­, 03:?¹ì¸, 04:?„ë£Œ, 11:ë°˜ë ¤, 12:ì¤‘ë‹¨, 99:ì·¨ì†Œ)
        // ? ì •?¬ë? ??ê²°ê³¼êµ¬ë¶„(RESULT_GB) N:ë¯¸ì„ ?? Y:? ì •, R:?ˆë¹„
        resultGb:
          formData.selectionStatus ||
          (mode === "detail" ? detailData?.resultGb : undefined),
        reqDt:
          mode === "detail"
            ? detailData?.reqDt ||
              new Date().toISOString().slice(0, 19).replace("T", " ")
            : new Date().toISOString().slice(0, 19).replace("T", " "), // ? ì²­?¼ì‹œ
        certYn: "Y", // ?˜í”Œ?…ë¬´ ? ì²­?±ë¡ ???¸ì¦?¬ë? ë¬´ì¡°ê±?Y
      };

      // ?ì„¸ ëª¨ë“œ?ì„œ??PK, ?Œì¼/ê²°ê³¼ ê´€???„ë“œ ë°?ê¸°í? ?„ë“œë¥?ê¸°ì¡´ ê°’ìœ¼ë¡?ë³´ì¡´ (detailData ê¸°ì?)
      if (mode === "detail") {
        requestData.reqId = detailData?.reqId ?? reqId ?? ""; // ?˜ì • ???„ìˆ˜ (ë°±ì—”??WHERE REQ_ID)
        requestData.proSeq = detailData?.proSeq;
        // ? ì²­??ë¶€ëª¨Â·í•™??C_ESNTL_ID????ê°?requestData) ? ì? (detail??êµ¬í˜• req=?™ìƒ ??–´?°ê¸° ê¸ˆì?)

        // ?¤ì?€ ??UI???†ëŠ” ?„ë“œ???ë³¸ ê°?? ì? (?¸ì¦?¬ë?????ƒ Y)
        requestData.certYn = "Y"; // ?˜ì • ?œì—???¸ì¦?¬ë? ë¬´ì¡°ê±?Y
        requestData.mchilYn = detailData?.mchilYn ?? requestData.mchilYn;
        requestData.mchilNm = detailData?.mchilNm ?? requestData.mchilNm;
        requestData.schoolId = detailData?.schoolId ?? requestData.schoolId; // ?ì„¸ ì¡°íšŒ ???™êµ IDë¡??™êµëª…Â·í•™?„Â·ë°˜ ?œì‹œ

        // ?Œì¼/ê²°ê³¼/?¼ì‹œ/?¬ìœ  ?±ë„ ? ì?
        requestData.fileId = detailData?.fileId ?? requestData.fileId;
        requestData.aprrDt = detailData?.aprrDt ?? requestData.aprrDt;
        requestData.chgDt = detailData?.chgDt ?? requestData.chgDt;
        requestData.stopDt = detailData?.stopDt ?? requestData.stopDt;
      }

      // ?”ë²„ê¹? ?„ì†¡???°ì´???•ì¸
      console.log("?„ì†¡??requestData:", JSON.stringify(requestData, null, 2));
      console.log("pEsntlId ê°?(P_ESNTL_ID ì»¬ëŸ¼):", requestData.pEsntlId);
      console.log("pEsntlId ?€??", typeof requestData.pEsntlId);
      console.log("pUserNm ê°?(P_USER_NM ì»¬ëŸ¼):", requestData.pUserNm);
      console.log("pUserNm ?€??", typeof requestData.pUserNm);

      // ì²¨ë??Œì¼ ë°°ì—´ ?ì„±
      const files = selectedFiles.map((item) => item.file);

      // API ?¸ì¶œ (?±ë¡ / ?˜ì • ë¶„ê¸°)
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
        // ?±ê³µ
        const successMessage =
          response.message ||
          (mode === "detail"
            ? "? ì²­???˜ì •?˜ì—ˆ?µë‹ˆ??"
            : "? ì²­???±ë¡?˜ì—ˆ?µë‹ˆ??");

        setMessageDialogTitle(mode === "detail" ? "?˜ì • ?„ë£Œ" : "?±ë¡ ?„ë£Œ");
        setMessageDialogMessage(successMessage);
        setMessageDialogNavigateToList(true);
        setMessageDialogType("success");
        setShowMessageDialog(true);

        if (mode === "detail") {
          // ?˜ì • ëª¨ë“œ: ?˜ì´ì§€ ? ì? + ?ì„¸ ?¬ì¡°?Œë¡œ ì²¨ë??Œì¼ ëª©ë¡ ?ˆë¡œê³ ì¹¨ (REQ_ID ê¸°ì?)
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

              // fileId ì½˜ì†” ì¶œë ¥ (?€?????¬ì¡°??
              console.log("=== ?€?????¬ì¡°??- ?Œì¼ ?•ë³´ ===");
              if (detailResponse.detail) {
                console.log(
                  "ARTAPPM.FILE_ID (ê·¸ë£¹ fileId):",
                  detailResponse.detail.fileId,
                );
              }
              if (files && files.length > 0) {
                console.log("ì²¨ë??Œì¼ ëª©ë¡:");
                files.forEach((file, index) => {
                  console.log(`  ?Œì¼ ${index + 1}:`, {
                    fileId: file.fileId,
                    seq: file.seq,
                    orgfNm: file.orgfNm,
                  });
                });
              } else {
                console.log("ì²¨ë??Œì¼ ?†ìŒ");
              }
              console.log("====================================");
            } catch (err) {
              console.error("?€?????ì„¸ ?¬ì¡°??ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤:", err);
              // ?¬ì¡°???¤íŒ¨??ì¹˜ëª…?ì´ì§€ ?Šìœ¼ë¯€ë¡??ëŸ¬ ë©”ì‹œì§€ë¡œë§Œ ?œì‹œ
              if (err instanceof Error) {
                setError(
                  err.message ||
                    "?€?????ì„¸ ?•ë³´ë¥??¤ì‹œ ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
                );
              }
            }
          }
          // ?ˆë¡œ ì¶”ê??ˆë˜ ?Œì¼ ëª©ë¡?€ ì´ˆê¸°??          setSelectedFiles([]);
        }
        // ?±ë¡ ëª¨ë“œ???¤ì´?¼ë¡œê·??•ì¸ ??ëª©ë¡?¼ë¡œ ?´ë™ (handleMessageDialogClose?ì„œ ì²˜ë¦¬)
      } else {
        // ?¤íŒ¨
        const errorPrefix = mode === "detail" ? "? ì²­ ?˜ì •" : "? ì²­ ?±ë¡";
        setMessageDialogTitle(mode === "detail" ? "?˜ì • ?¤íŒ¨" : "?±ë¡ ?¤íŒ¨");
        setMessageDialogMessage(
          response.message || `${errorPrefix} ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.`,
        );
        setMessageDialogType("danger");
        setShowMessageDialog(true);
      }
    } catch (err) {
      const actionLabel = mode === "detail" ? "? ì²­ ?˜ì •" : "? ì²­ ?±ë¡";
      console.error(`${actionLabel} ?¤ë¥˜:`, err);
      setMessageDialogTitle(mode === "detail" ? "?˜ì • ?¤íŒ¨" : "?±ë¡ ?¤íŒ¨");
      setMessageDialogMessage(
        err instanceof Error
          ? err.message
          : `${actionLabel} ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.`,
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

  // ë©”ì‹œì§€ ?¤ì´?¼ë¡œê·??«ê¸° ?¸ë“¤??  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
    if (messageDialogType === "success" && messageDialogNavigateToList) {
      router.push(`/adminWeb/support/detail?businessId=${businessId || ""}`);
    }
    setMessageDialogNavigateToList(false);
  };

  // ?ì„¸ ëª¨ë“œ????ê¸°ì¡´ ? ì²­ ?•ë³´ ì¡°íšŒ (REQ_ID ê¸°ì? by-req-id API)
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

        // ?ì„¸ ?°ì´??        const rawDetail =
          (response && (response.detail || (response as any).data)) || null;

        if (!rawDetail || cancelled) {
          return;
        }

        const detail: any = rawDetail;
        setDetailData(detail);

        // ì²¨ë??Œì¼ ëª©ë¡ (ê¸°ì¡´ ?Œì¼)
        const files: ArtappmFileItem[] =
          (response && (response.files as ArtappmFileItem[])) || [];
        if (!cancelled) {
          setExistingFiles(files || []);

          // fileId ì½˜ì†” ì¶œë ¥
          console.log("=== ì§€?ì‚¬??? ì²­ ?ì„¸ - ?Œì¼ ?•ë³´ ===");
          console.log("ARTAPPM.FILE_ID (ê·¸ë£¹ fileId):", detail.fileId);
          if (files && files.length > 0) {
            console.log("ì²¨ë??Œì¼ ëª©ë¡:");
            files.forEach((file, index) => {
              console.log(`  ?Œì¼ ${index + 1}:`, {
                fileId: file.fileId,
                seq: file.seq,
                orgfNm: file.orgfNm,
              });
            });
          } else {
            console.log("ì²¨ë??Œì¼ ?†ìŒ");
          }
          console.log("====================================");
        }

        // ? ì²­ë¶„ì•¼ ?Œì‹±: ì§ë ¬???•ì‹?€ ?¤ìŒ 2ê°€ì§€
        // - "N||"  : ì²´í¬ ????        // - "Y|?ìŠ¤??" : ì²´í¬ + ?ìŠ¤??        const parseReqPart = (reqPart?: string) => {
          const value = reqPart || "";
          let index = 0;

          const parseOne = () => {
            // ?¨ì? ë¬¸ì?´ì´ ?†ìœ¼ë©?ê¸°ë³¸ê°?            if (index >= value.length) {
              return { text: "", checked: false };
            }

            const ch = value[index];

            // N|| ?¨í„´
            if (ch === "N" && value.slice(index, index + 3) === "N||") {
              index += 3;
              return { text: "", checked: false };
            }

            // Y|?ìŠ¤?? ?¨í„´
            if (ch === "Y" && value[index + 1] === "|") {
              const start = index + 2;
              const end = value.indexOf("|", start);
              if (end === -1) {
                // ì¢…ë£Œ êµ¬ë¶„?ê? ?†ìœ¼ë©??¨ì? ë¶€ë¶??„ì²´ë¥??ìŠ¤?¸ë¡œ ê°„ì£¼
                const text = value.slice(start);
                index = value.length;
                return { text, checked: true };
              }
              const text = value.slice(start, end);
              index = end + 1; // ë§ˆì?ë§?'|' ?¤ìŒ?¼ë¡œ ?´ë™
              return { text, checked: true };
            }

            // ?¸ì‹ ëª??˜ëŠ” ?¨í„´?´ë©´ ??ê¸€?ë§Œ ?Œë¹„?˜ê³  ë¹„ì²´?¬ë¡œ ì²˜ë¦¬
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

        // ? ì§œ ?¬ë§·: YYYYMMDD -> YYYY-MM-DD
        const formatDateFromYYYYMMDD = (value?: string): string => {
          if (!value) return "";
          const cleaned = value.replace(/-/g, "");
          if (cleaned.length !== 8) return value;
          return `${cleaned.slice(0, 4)}-${cleaned.slice(
            4,
            6,
          )}-${cleaned.slice(6, 8)}`;
        };

        // ?™ìƒ ?ë…„?”ì¼ / ?±ë³„ ë§¤í•‘
        // C_BRTHDY: ?™ìƒ ?ë…„?”ì¼ (YYYYMMDD)
        // C_SEXDSTN_CODE: ?™ìƒ ?±ë³„ ì½”ë“œ
        const studentBirthDate = formatDateFromYYYYMMDD(detail.cBrthdy || "");
        const studentGender = detail.cSexdstnCode === "F" ? "F" : "M";

        // SCHOOL_ID(schoolId/sdSchulCode)ê°€ ?ˆìœ¼ë©??¬ìš©, ?†ìœ¼ë©??™êµëª…ìœ¼ë¡?ê²€??        const findSchoolCodeByName = async (
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
            console.error("?™êµ ì½”ë“œ ì°¾ê¸° ?¤íŒ¨:", err);
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

        // ë°?ë²ˆí˜¸ ë§¤ì¹­???„í•œ ë³€??(?˜ì¤‘???¬ìš©)
        let matchedClassValue = "";
        let classOptions2ListForDebug: SelectOption[] = []; // ?”ë²„ê¹…ìš©

        // ?™êµ ì½”ë“œê°€ ?ˆìœ¼ë©??™ê¸‰ ?•ë³´ ì¡°íšŒ
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
              { value: "", label: "? íƒ" },
              ...Array.from(gradeSet)
                .sort()
                .map((grade) => ({
                  value: grade,
                  label: `${grade}?™ë…„`,
                })),
            ];

            setClassOptions(gradeOptions);

            // ?™ë…„???ˆìœ¼ë©?ë°?ëª©ë¡??ì¡°íšŒ
            const gradeInfo =
              detail.schoolLvl !== undefined && detail.schoolLvl !== null
                ? String(detail.schoolLvl)
                : "";

            const schoolNo =
              detail.schoolNo !== undefined && detail.schoolNo !== null
                ? Number(detail.schoolNo)
                : null;

            // ?”ë²„ê¹? ?™ë…„ê³?ë°?ë²ˆí˜¸ ?•ì¸
            console.log(
              "[?ì„¸ ì¡°íšŒ] ?™ë…„ (schoolLvl):",
              detail.schoolLvl,
              "->",
              gradeInfo,
            );
            console.log(
              "[?ì„¸ ì¡°íšŒ] ë°?ë²ˆí˜¸ (schoolNo):",
              detail.schoolNo,
              "->",
              schoolNo,
            );

            if (gradeInfo) {
              const filteredClasses = classList.filter(
                (item) => item.grade === gradeInfo,
              );

              const classOptions2List: SelectOption[] = [
                { value: "", label: "? íƒ" },
                ...filteredClasses
                  .map((item) => ({
                    value: item.classNm || "",
                    label: formatClassLabel(item.classNm),
                  }))
                  .filter((item) => item.value !== ""),
              ];

              // ?”ë²„ê¹…ìš©?¼ë¡œ ?€??              classOptions2ListForDebug = classOptions2List;

              // ?”ë²„ê¹? ë°?ëª©ë¡ ?•ì¸
              console.log(
                "[?ì„¸ ì¡°íšŒ] ë°?ëª©ë¡ (classOptions2List):",
                classOptions2List,
              );
              console.log(
                "[?ì„¸ ì¡°íšŒ] classOptions2List???¤ì œ value??",
                classOptions2List.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
              );
              console.log(
                "[?ì„¸ ì¡°íšŒ] classOptions2List??value ?€??",
                classOptions2List.map((o) => ({
                  value: o.value,
                  valueType: typeof o.value,
                })),
              );

              setClassOptions2(classOptions2List);

              // ë°?ë²ˆí˜¸ ë§¤ì¹­: SCHOOL_NO (?«ì)ë¥?classNm (?? "1ë°?) ?•ì‹?¼ë¡œ ë³€??              if (schoolNo !== null && classOptions2List.length > 1) {
                // SCHOOL_NO?€ ?¼ì¹˜?˜ëŠ” ë°?ì°¾ê¸° (?? 1 -> "1ë°?)
                const matchedClass = classOptions2List.find((option) => {
                  if (!option.value) return false;
                  // "1ë°??ì„œ ?«ìë§?ì¶”ì¶œ?˜ì—¬ ë¹„êµ
                  const classNumber = parseInt(
                    option.value.replace(/[^0-9]/g, ""),
                  );
                  const isMatch = classNumber === schoolNo;
                  console.log(
                    `[?ì„¸ ì¡°íšŒ] ë°?ë§¤ì¹­ ?œë„: "${option.value}" (?«ì: ${classNumber}) vs SCHOOL_NO: ${schoolNo} -> ${isMatch}`,
                  );
                  return isMatch;
                });
                if (matchedClass) {
                  matchedClassValue = matchedClass.value;
                  console.log(
                    "[?ì„¸ ì¡°íšŒ] ë§¤ì¹­??ë°?",
                    matchedClassValue,
                    "?€??",
                    typeof matchedClassValue,
                  );
                } else {
                  console.warn("[?ì„¸ ì¡°íšŒ] ë°?ë²ˆí˜¸ ë§¤ì¹­ ?¤íŒ¨:", {
                    schoolNo,
                    availableClasses: classOptions2List.map((o) => o.value),
                  });
                  // ë§¤ì¹­ ?¤íŒ¨ ???«ì ê·¸ë?ë¡??¬ìš©
                  matchedClassValue = String(schoolNo);
                }
              } else if (schoolNo !== null) {
                // ë°?ëª©ë¡???†ê±°??1ê°??´í•˜??ê²½ìš° ?«ì ê·¸ë?ë¡??¬ìš©
                matchedClassValue = String(schoolNo);
              }
            } else {
              setClassOptions2([{ value: "", label: "? íƒ" }]);
              // ?™ë…„???†ì–´??ë°?ë²ˆí˜¸???¤ì •
              if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
                matchedClassValue = String(detail.schoolNo);
              }
            }
          } catch (err) {
            console.error("[?ì„¸ ì¡°íšŒ] ?™ê¸‰ ?•ë³´ ì¡°íšŒ ?¤íŒ¨:", err);
            setClassOptions([{ value: "", label: "? íƒ" }]);
            setClassOptions2([{ value: "", label: "? íƒ" }]);
            // ?ëŸ¬ ë°œìƒ ?œì—??ë°?ë²ˆí˜¸???¤ì •
            if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
              matchedClassValue = String(detail.schoolNo);
            }
          } finally {
            setClassLoading(false);
          }
        } else {
          // ?™êµ ì½”ë“œê°€ ?†ì–´??ë°?ë²ˆí˜¸???¤ì •?????ˆë„ë¡?          if (detail.schoolNo !== undefined && detail.schoolNo !== null) {
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
            // ?ë‹¨
            programTitle: prev.programTitle || "",
            status: detail.sttusCode || prev.status,
            selectionStatus: detail.resultGb || "N",

            // ? í˜•
            applicationType: detail.proType === "02" ? "GROUP" : "INDIVIDUAL",

            // ë³´í˜¸???•ë³´
            parentName: detail.pUserNm || "",
            parentEsntlId: detail.pEsntlId || "",
            parentBirthDate: formatDateFromYYYYMMDD(detail.brthdy),
            parentPhone: formatPhoneNumber(detail.mbtlnum || ""),

            // ?™êµ?•ë³´
            schoolName: detail.schoolNm || "",
            schoolCode: schoolCode, // ì°¾ì? ?™êµ ì½”ë“œ ?¤ì •
            schoolGb: detail.schoolGb || "",
            gradeInfo:
              detail.schoolLvl !== undefined && detail.schoolLvl !== null
                ? String(detail.schoolLvl)
                : "",
            gradeInfo2: newGradeInfo2,

            // ?™ìƒ?•ë³´ (? ê·œ: cEsntlId, êµ¬ë°?´í„°: REQ_ESNTL_IDê°€ ?™ìƒ?´ì—ˆ??
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

            // ê³„ì¢Œ?•ë³´
            accountNumber: detail.payBank || "",
            bankName: detail.payBankCode || "",
            depositorName: detail.holderNm || "",

            // ? ì²­ë¶„ì•¼
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

            // ?œë™ê³„íš??            activityScope: detail.playPart === "2" ? "OUTSIDE" : "INSIDE",
            purpose: detail.reqObj || "",
            activityContent: detail.reqPlay || "",
            budgetPlan: detail.reqPlan || "",

            // ê¸°í?
            other: detail.reqDesc || "",
            reaDesc: detail.reaDesc || "",
          };

          // ?”ë²„ê¹? ìµœì¢… ?¤ì •??ê°??•ì¸
          console.log("[?ì„¸ ì¡°íšŒ] ìµœì¢… ?¤ì •??ë°?", newGradeInfo2);
          if (classOptions2ListForDebug.length > 0) {
            console.log(
              "[?ì„¸ ì¡°íšŒ] classOptions2List??value ëª©ë¡:",
              classOptions2ListForDebug.map((o) => o.value),
            );
            console.log(
              "[?ì„¸ ì¡°íšŒ] gradeInfo2?€ ë§¤ì¹­ ?¬ë?:",
              classOptions2ListForDebug.some((o) => o.value === newGradeInfo2),
            );
          }

          return newFormData;
        });
        if (detail.pEsntlId) {
          fetchStudentList(detail.pEsntlId);
        }
      } catch (err) {
        console.error("? ì²­ ?ì„¸ ì¡°íšŒ ?¤ë¥˜:", err);
        if (!cancelled) {
          if (err instanceof Error) {
            setError(
              err.message ||
                "? ì²­ ?ì„¸ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.",
            );
          } else {
            setError("? ì²­ ?ì„¸ ?•ë³´ë¥?ë¶ˆëŸ¬?¤ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
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

  // classOptions2ê°€ ?¤ì •????gradeInfo2ë¥??™ê¸°?”í•˜??useEffect
  // (?±ë¡/?ì„¸ ê³µí†µ) SCHOOL_NO(?«ì)?€ NEIS classNm("2ë°?, "02" ????ë§¤ì¹­?´ì„œ ë°˜ì„ ?ë™ ? íƒ
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
          console.warn("[ë°??™ê¸°?? gradeInfo2 ë§¤ì¹­ ?¤íŒ¨:", {
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
    // ?™êµ ê²€??ëª¨ë‹¬
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
    // ë³´í˜¸??ê²€??ëª¨ë‹¬
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
    // ?™ìƒ ì½¤ë³´ë°•ìŠ¤ (ë¶€ëª¨ë³„ ?ë? ëª©ë¡)
    studentList,
    studentLoading,
    handleStudentSelect,
    // ?™ê¸‰ ?•ë³´
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
    // ë©”ì‹œì§€ ?¤ì´?¼ë¡œê·?    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleMessageDialogClose,
    // ?? œ ?•ì¸ ?¤ì´?¼ë¡œê·?    showDeleteConfirmDialog,
    setShowDeleteConfirmDialog,
    fileToDelete,
    setFileToDelete,
  };
}
