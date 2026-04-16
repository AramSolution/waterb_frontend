import type { ArtappmInsertRequest } from "../api/supportApplicationApi";

/**
 * 신청 상세(detail) 응답을 등록/수정 폼 저장 시와 동일한 필드로 매핑하여 상태만 바꿀 때 사용.
 */
export function buildArtappmUpdateRequestFromDetail(
  detail: Record<string, unknown>,
  sttusCode: string,
  reqId: string,
): ArtappmInsertRequest {
  const d = detail as Record<string, unknown>;
  const trimStr = (v: unknown) => (v != null ? String(v).trim() : "");
  const digitsOnly = (v: unknown) => trimStr(v).replace(/[^\d]/g, "");
  const brthdyApi = (v: unknown) => trimStr(v).replace(/-/g, "");

  const numOrUndef = (v: unknown): number | undefined => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  };

  const studentEsntlId = trimStr(d.cEsntlId ?? d.reqEsntlId);
  const pEsntlId = trimStr(d.pEsntlId);
  const proSeqRaw = d.proSeq;

  return {
    reqId: reqId.trim(),
    proId: trimStr(d.proId) || undefined,
    proSeq:
      proSeqRaw != null && String(proSeqRaw).trim() !== ""
        ? String(proSeqRaw)
        : undefined,
    reqEsntlId: studentEsntlId || undefined,
    cEsntlId: studentEsntlId || undefined,
    pEsntlId: pEsntlId || undefined,
    pUserNm: trimStr(d.pUserNm ?? d.parentNm) || undefined,
    mbtlnum: digitsOnly(d.mbtlnum),
    brthdy: brthdyApi(d.brthdy),
    schoolId: trimStr(d.schoolId ?? d.sdSchulCode) || undefined,
    schoolGb: trimStr(d.schoolGb) || undefined,
    schoolNm: trimStr(d.schoolNm) || undefined,
    schoolLvl: numOrUndef(d.schoolLvl ?? d.gradeInfo),
    schoolNo: numOrUndef(d.schoolNo ?? d.gradeInfo2),
    reaDesc: trimStr(d.reaDesc) || undefined,
    sttusCode,
    fileId: trimStr(d.fileId) || undefined,
  };
}
