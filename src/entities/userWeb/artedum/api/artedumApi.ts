import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiUser";

/** 가맹학원 목록 항목 (API 응답 DTO) */
export interface ArtedumDTO {
  rnum?: number;
  esntlId?: string;
  userId?: string;
  userNm?: string;
  schoolNm?: string;
  adres?: string;
  adresLot?: string;
  detailAdres?: string;
  offmTelno?: string;
  /** 휴대전화 (사무실전화 없을 때 학원목록 모달 표시용) */
  mbtlnum?: string;
  usrTelno?: string;
  subNmList?: string;
  eduEsntlId?: string;
  eduGb?: string;
  [key: string]: unknown;
}

/** 가맹학원 목록 응답 */
export interface ArtedumListResponse {
  data?: ArtedumDTO[] | null;
  recordsTotal?: number;
  recordsFiltered?: number;
  result?: string;
}

/** 목록 요청 (페이징 등) */
export interface ArtedumListRequest {
  start?: number;
  length?: number;
  runSta?: string;
  /** 교육구분: 01=마중물스터디, 02=희망스터디 (지원사업별 가맹학원 필터) */
  eduGb?: string;
  searchCondition?: string;
  searchKeyword?: string;
}

/** 모달용 학원 항목 (매핑 후) */
export interface HakwonModalItem {
  name: string;
  category: string;
  addr: string;
  tel: string;
}

function dtoToModalItem(dto: ArtedumDTO): HakwonModalItem {
  const name = (dto.userNm ?? dto.schoolNm ?? "").trim() || "(학원명 없음)";
  const category = (dto.subNmList ?? "").trim();
  const addrParts = [dto.adres, dto.detailAdres].filter(Boolean) as string[];
  const addr =
    addrParts.length > 0
      ? addrParts.join(" ").trim()
      : (dto.adresLot ?? "").trim() || "(주소 없음)";
  const tel = (dto.offmTelno ?? dto.mbtlnum ?? "").trim() || "-";
  return { name, category, addr, tel };
}

/**
 * 사용자웹 - 승인된 가맹학원 목록 조회 (학원목록 모달용)
 */
export async function fetchArtedumList(
  params?: ArtedumListRequest,
): Promise<HakwonModalItem[]> {
  try {
    const path = API_ENDPOINTS.USER_ARTEDUM.LIST;
    const body = {
      start: params?.start ?? 0,
      length: params?.length ?? 100,
      runSta: "03",
      ...params,
    };
    const response = await apiClient.post<ArtedumListResponse>(path, body);
    const list = response?.data ?? [];
    return list.map(dtoToModalItem);
  } catch (error) {
    console.error("가맹학원 목록 조회 실패:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, "학원 목록을 불러오는 중 오류가 발생했습니다.");
  }
}
