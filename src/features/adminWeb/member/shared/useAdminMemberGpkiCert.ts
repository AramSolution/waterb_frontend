import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AdminGpkiCertService } from "@/entities/adminWeb/gpki/api";

/** 학생·학부모 관리자 폼 공통: GPKI 인증 필드 */
export interface AdminMemberGpkiCertFields {
  residentId: string;
  citizenCertYn: string;
  singleParentYn: string;
  basicLivelihoodYn: string;
  nearPovertyYn: string;
  citizenGpkiCertAt: string | null;
  singleParentGpkiCertAt: string | null;
  basicLivelihoodGpkiCertAt: string | null;
  nearPovertyGpkiCertAt: string | null;
}

function stamp(): string {
  return new Date().toISOString();
}

/**
 * 관리자 회원 등록/수정: 시민·감면 인증 버튼 (GPKI API는 AdminGpkiCertService)
 */
export function useAdminMemberGpkiCert<T extends AdminMemberGpkiCertFields>(
  formData: T,
  setFormData: Dispatch<SetStateAction<T>>,
  memberNameTrimmed: string,
) {
  const [loadingKey, setLoadingKey] = useState<
    "citizen" | "single" | "basic" | "poor" | null
  >(null);

  const prereq = useCallback(() => {
    const ihidnum = (formData.residentId || "").replace(/\D/g, "").slice(0, 13);
    const ok = ihidnum.length === 13 && Boolean(memberNameTrimmed);
    return { ok, ihidnum, name: memberNameTrimmed };
  }, [formData.residentId, memberNameTrimmed]);

  const alertPrereq = useCallback(() => {
    window.alert(
      "주민등록번호 13자리와 회원명을 입력한 뒤 인증할 수 있습니다.",
    );
  }, []);

  const runCitizen = useCallback(async () => {
    const { ok, ihidnum, name } = prereq();
    if (!ok) {
      alertPrereq();
      return;
    }
    setLoadingKey("citizen");
    try {
      const { isCitizen, reason, message } =
        await AdminGpkiCertService.checkCitizenByResideCode(ihidnum, name);
      if (reason === "service_unavailable") {
        window.alert(message || "시민인증 조회에 실패했습니다.");
        return;
      }
      const next = isCitizen ? "Y" : "N";
      setFormData((prev) => ({
        ...prev,
        citizenCertYn: next,
        citizenGpkiCertAt: stamp(),
      }));
    } finally {
      setLoadingKey(null);
    }
  }, [prereq, alertPrereq, setFormData]);

  const runSingle = useCallback(async () => {
    const { ok, ihidnum, name } = prereq();
    if (!ok) {
      alertPrereq();
      return;
    }
    setLoadingKey("single");
    try {
      const { isEligible, reason, message } =
        await AdminGpkiCertService.checkSingleParentYn(ihidnum, name);
      if (reason === "service_unavailable") {
        window.alert(message || "한부모가족 여부 조회에 실패했습니다.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        singleParentYn: isEligible ? "Y" : "N",
        singleParentGpkiCertAt: stamp(),
      }));
    } finally {
      setLoadingKey(null);
    }
  }, [prereq, alertPrereq, setFormData]);

  const runBasic = useCallback(async () => {
    const { ok, ihidnum, name } = prereq();
    if (!ok) {
      alertPrereq();
      return;
    }
    setLoadingKey("basic");
    try {
      const { isEligible, reason, message } =
        await AdminGpkiCertService.checkBasicLivelihoodYn(ihidnum, name);
      if (reason === "service_unavailable") {
        window.alert(message || "기초생활수급자 여부 조회에 실패했습니다.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        basicLivelihoodYn: isEligible ? "Y" : "N",
        basicLivelihoodGpkiCertAt: stamp(),
      }));
    } finally {
      setLoadingKey(null);
    }
  }, [prereq, alertPrereq, setFormData]);

  const runPoor = useCallback(async () => {
    const { ok, ihidnum, name } = prereq();
    if (!ok) {
      alertPrereq();
      return;
    }
    setLoadingKey("poor");
    try {
      const { isEligible, reason, message } = await AdminGpkiCertService.checkPoorYn(
        ihidnum,
        name,
      );
      if (reason === "service_unavailable") {
        window.alert(message || "차상위계층 여부 조회에 실패했습니다.");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        nearPovertyYn: isEligible ? "Y" : "N",
        nearPovertyGpkiCertAt: stamp(),
      }));
    } finally {
      setLoadingKey(null);
    }
  }, [prereq, alertPrereq, setFormData]);

  return {
    runCitizen,
    runSingle,
    runBasic,
    runPoor,
    gpkiLoadingKey: loadingKey,
  };
}
