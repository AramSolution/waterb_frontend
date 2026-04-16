import { apiClient, ApiError } from "@/shared/lib/apiClient";
import { API_ENDPOINTS } from "@/shared/config/apiAdmin";

// 게시글 정보 타입 (API 응답 구조에 맞게 정의)
export interface Article {
  rnum: string; // 번호
  nttId: string; // 게시글ID (고유 식별자) - SQL 매퍼에서 NTT_ID로 반환
  bbsId: string; // 게시판ID
  parntscttid: string; // 부모ID
  answerAt: string; // 답변여부
  nttSj: string; // 제목
  nttCn: string; // 내용
  rdcnt: string; // 조회수
  ntcrId: string; // 게시자ID
  ntcrNm: string; // 게시자명
  ntcrDt: string; // 게시일시
  noticeAt: string; // 공지여부
  secretAt: string; // 비밀글여부
  atchFileId: string; // 첨부파일 ID
  ntcrStartDt: string; // 게시시작일시
  ntcrEndDt: string; // 게시종료일시
  sttusCode: string; // 상태코드
  sttusCodeNm: string; // 상태
  replyYn: string; // 답장사용여부
  answerCnt: string; // 답변갯수
  useImage: string; // 이미지사용여부
  nttData1?: string;
  nttData2?: string;
  nttData3?: string;
  nttData4?: string;
  nttData5?: string;
  nttData6?: string;
  nttImgFileId?: string;
  [key: string]: any;
}

// 게시글 목록 조회 요청 파라미터 (서버 사이드 페이징)
export interface ArticleListParams {
  searchCondition: string; // "1": 제목, "2": 내용
  searchKeyword: string;
  bbsId: string; // 게시판ID (필수)
  length: string; // 페이지 사이즈
  start: string; // 시작 인덱스 (0부터 시작)
  // 테이블 필터 파라미터
  filterNttSj?: string; // 제목 필터
  filterNtcrNm?: string; // 게시자명 필터
  filterAnswerAt?: string; // 답글여부 필터
  filterSttusCode?: string; // 사용여부 필터
}

// 게시글 목록 응답 타입
export interface ArticleListResponse {
  result?: string; // "00": 성공, "01": 실패
  recordsFiltered?: string | number;
  recordsTotal?: string | number;
  data?: Article[];
  Array?: Article[]; // API 응답에서 배열 필드명이 "Array"일 수 있음
  [key: string]: any;
}

/** 아카이브 이미지 그룹 내 최종 순서 (백엔드 ARTFILE.SEQ 재배치용) */
export type ArchiveImageOrderEntry =
  | { type: "existing"; seq: number }
  | { type: "new"; index: number };

// 게시글 등록 요청 파라미터
export interface ArticleRegisterParams {
  bbsId: string; // 게시판ID
  nttSj: string; // 게시글 제목
  nttCn: string; // 게시글 내용
  noticeAt: string; // 공지여부 (Y/N)
  ntcrStartDt: string; // 게시기간 시작일
  ntcrEndDt: string; // 게시기간 종료일
  sttusCode: string; // 상태코드 (A/D)
  answerAt?: string; // 답글 여부 (Y/N, 선택)
  password?: string; // 비밀글 비밀번호 (게시판 SECRET_YN=Y일 때 선택)
  secretAt?: string; // 비밀글 여부 (Y/N, 비밀번호 입력 시 Y)
  articleFiles?: File[]; // 첨부파일 (선택)
  uniqId?: string; // 사용자 고유ID (선택, 세션에서 가져옴)
  name?: string; // 사용자 이름 (선택, 세션에서 가져옴)
  nttData1?: string; // 지정별 (아카이브)
  nttData2?: string; // 지정일 (아카이브)
  nttData3?: string; // 연대/시대 (아카이브)
  nttData4?: string; // 소재지 (아카이브)
  nttData5?: string; // 자료출처 (아카이브)
  nttData6?: string; // 소개 (아카이브)
  /** 아카이브 이미지 다건 — multipart archiveImageFiles + archiveImageFileSeqs(JSON) */
  archiveImageFiles?: File[];
  /** 업로드 순서와 동일 길이, 파일별 seq (미전달 시 0,1,2…) */
  archiveImageFileSeqs?: number[];
  /** multipart 파일과 동일 길이: -1=그룹에 append, >=0=해당 ARTFILE.SEQ 행을 새 파일로 교체 */
  archiveImageFileReplaceSeqs?: number[];
  /** 슬롯 순서: 기존(existing seq) + 신규(new multipart index) — 수정 시 순서만 바꿀 때도 전달 */
  archiveImageOrder?: ArchiveImageOrderEntry[];
  /** 하위 호환: 단일 파일만 보낼 때 */
  archiveImageFile?: File;
}

// 게시글 등록 응답 타입
export interface ArticleRegisterResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string;
  data?: number;
  [key: string]: any;
}

// 게시글 수정 요청 파라미터
export interface ArticleUpdateParams {
  nttId: string; // 게시글ID (필수)
  bbsId: string; // 게시판ID (필수)
  nttSj: string; // 게시글 제목
  nttCn: string; // 게시글 내용
  noticeAt: string; // 공지여부 (Y/N)
  ntcrStartDt: string; // 게시기간 시작일
  ntcrEndDt: string; // 게시기간 종료일
  sttusCode: string; // 상태코드 (A/D)
  atchFileId?: string; // 기존 첨부파일 그룹 ID (수정 시 새 파일 추가할 때 필수)
  password?: string; // 비밀글 비밀번호 (변경 시에만, 게시판 SECRET_YN=Y일 때)
  secretAt?: string; // 비밀글 여부 (Y/N, 비밀번호 입력 시 Y)
  articleFiles?: File[]; // 새로 추가할 첨부파일 (선택)
  uniqId?: string; // 사용자 고유ID (선택, 세션에서 가져옴)
  name?: string; // 사용자 이름 (선택, 세션에서 가져옴)
  nttData1?: string; // 지정별 (아카이브)
  nttData2?: string; // 지정일 (아카이브)
  nttData3?: string; // 연대/시대 (아카이브)
  nttData4?: string; // 소재지 (아카이브)
  nttData5?: string; // 자료출처 (아카이브)
  nttData6?: string; // 소개 (아카이브)
  nttImgFileId?: string; // 대표 이미지 파일ID
  archiveImageFiles?: File[];
  archiveImageFileSeqs?: number[];
  archiveImageFileReplaceSeqs?: number[];
  archiveImageOrder?: ArchiveImageOrderEntry[];
  archiveImageFile?: File;
}

// 게시글 수정 응답 타입
export interface ArticleUpdateResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string;
  data?: number;
  [key: string]: any;
}

// 게시글 상세 조회 요청 파라미터
export interface ArticleDetailParams {
  nttId: string; // 게시글ID (필수)
  bbsId: string; // 게시판ID (필수)
}

// 게시글 상세 응답의 첨부파일 한 건 (fileId/seq는 문자열로 전달해 JS 정수 오차 방지)
export interface ArticleFileItem {
  /** 파일 그룹 ID(ARTFILE.FILE_ID). 그룹 내 여러 행이 같은 fileId를 가질 수 있으며, 행 구분은 seq */
  fileId: string;
  seq: string;
  orgfNm?: string;
  saveNm?: string;
  filePath?: string;
  fileExt?: string;
  fileSize?: number;
  [key: string]: any;
}

// 게시글 상세 조회 응답 타입
export interface ArticleDetailResponse {
  result?: string; // "00": 성공, "01": 실패
  detail?: Article; // 게시글 상세 정보
  fileList?: ArticleFileItem[]; // atchFileId로 조회한 첨부파일 목록
  /** NTT_IMG_FILE_ID 그룹의 이미지 파일 목록(다중 아카이브 이미지) */
  nttImgFileList?: ArticleFileItem[];
  [key: string]: any;
}

// 게시글 삭제 요청 파라미터
export interface ArticleDeleteParams {
  nttId: string; // 게시글ID (필수)
  bbsId: string; // 게시판ID (필수)
  uniqId?: string; // 사용자 고유ID (선택, 세션에서 가져옴)
}

// 게시글 삭제 응답 타입
export interface ArticleDeleteResponse {
  result?: string; // "00": 성공, "01": 실패
  data?: number; // 삭제된 행 수
  message?: string;
  [key: string]: any;
}

// 게시글 첨부파일 1건 삭제 요청 파라미터 (fileId/seq는 문자열로 전달해 JS 정수 오차 방지)
export interface ArticleDeleteFileParams {
  fileId: string; // 파일 그룹 ID
  seq: string; // 파일 순번
  bbsId: string; // 게시판ID (남은 파일 0건일 때 ARTBBSM.ATCH_FILE_ID NULL 처리용)
  nttId: string; // 게시글ID (동일)
}

// 게시글 첨부파일 삭제 응답 타입
export interface ArticleDeleteFileResponse {
  result?: string; // "00": 성공, "01": 실패
  message?: string;
  [key: string]: any;
}

// 게시글 서비스 클래스
export class ArticleService {
  /**
   * 게시글 목록 조회
   */
  static async getArticleList(
    params: ArticleListParams,
  ): Promise<ArticleListResponse> {
    try {
      const response = await apiClient.post<ArticleListResponse>(
        API_ENDPOINTS.ARTICLE.LIST,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 목록 조회 실패",
      );
    }
  }

  /**
   * 게시글 엑셀 목록 조회 (페이징 파라미터 제외)
   */
  static async getArticleExcel(
    params: Omit<ArticleListParams, "length" | "start">,
  ): Promise<ArticleListResponse> {
    try {
      const response = await apiClient.post<ArticleListResponse>(
        API_ENDPOINTS.ARTICLE.EXCEL_LIST,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 엑셀 목록 조회 실패",
      );
    }
  }

  /**
   * 게시글 상세 조회
   */
  static async getArticleDetail(
    params: ArticleDetailParams,
  ): Promise<ArticleDetailResponse> {
    try {
      const response = await apiClient.post<ArticleDetailResponse>(
        API_ENDPOINTS.ARTICLE.DETAIL,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 상세 조회 실패",
      );
    }
  }

  /**
   * 게시글 첨부파일 1건 삭제 (fileId, seq). 남은 파일이 없으면 ARTBBSM.ATCH_FILE_ID NULL 처리.
   */
  static async deleteArticleFile(
    params: ArticleDeleteFileParams,
  ): Promise<ArticleDeleteFileResponse> {
    try {
      const response = await apiClient.post<ArticleDeleteFileResponse>(
        API_ENDPOINTS.ARTICLE.DELETE_FILE,
        {
          fileId: params.fileId,
          seq: params.seq,
          bbsId: params.bbsId,
          nttId: params.nttId,
        },
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "첨부파일 삭제 실패",
      );
    }
  }

  /**
   * 게시글 조회수 증가
   */
  static async updateViewCount(
    params: ArticleDetailParams,
  ): Promise<{ result?: string; data?: number; [key: string]: any }> {
    try {
      const response = await apiClient.post<{
        result?: string;
        data?: number;
        [key: string]: any;
      }>(API_ENDPOINTS.ARTICLE.UPDATE_VIEW_COUNT, params);
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "조회수 증가 실패",
      );
    }
  }

  /**
   * 게시글 등록
   */
  static async createArticle(
    params: ArticleRegisterParams,
  ): Promise<ArticleRegisterResponse> {
    try {
      // FormData 생성 (파일 업로드를 위해)
      const formData = new FormData();

      // 기본 파라미터 추가
      formData.append("bbsId", params.bbsId);
      formData.append("nttSj", params.nttSj);
      formData.append("nttCn", params.nttCn);
      formData.append("boardInfo1", params.nttCn); // 백엔드에서 boardInfo1로 받음
      formData.append("noticeAt", params.noticeAt);
      formData.append("ntcrStartDt", params.ntcrStartDt);
      formData.append("ntcrEndDt", params.ntcrEndDt);
      formData.append("sttusCode", params.sttusCode);

      // 선택 파라미터 추가
      if (params.answerAt) {
        formData.append("answerAt", params.answerAt);
      }
      if (params.password !== undefined && params.password !== "") {
        formData.append("password", params.password);
      }
      if (params.secretAt) {
        formData.append("secretAt", params.secretAt);
      }

      // 사용자 정보 추가 (세션에서 가져온 값)
      if (params.uniqId) {
        formData.append("uniqId", params.uniqId);
      }
      if (params.name) {
        formData.append("name", params.name);
      }
      if (params.nttData1 !== undefined) formData.append("nttData1", params.nttData1);
      if (params.nttData2 !== undefined) formData.append("nttData2", params.nttData2);
      if (params.nttData3 !== undefined) formData.append("nttData3", params.nttData3);
      if (params.nttData4 !== undefined) formData.append("nttData4", params.nttData4);
      if (params.nttData5 !== undefined) formData.append("nttData5", params.nttData5);
      if (params.nttData6 !== undefined) formData.append("nttData6", params.nttData6);
      if (params.archiveImageFiles && params.archiveImageFiles.length > 0) {
        params.archiveImageFiles.forEach((file) => {
          formData.append("archiveImageFiles", file);
        });
        const seqs =
          params.archiveImageFileSeqs ??
          params.archiveImageFiles.map((_, i) => i);
        formData.append("archiveImageFileSeqs", JSON.stringify(seqs));
        if (
          params.archiveImageFileReplaceSeqs &&
          params.archiveImageFileReplaceSeqs.length ===
            params.archiveImageFiles.length
        ) {
          formData.append(
            "archiveImageFileReplaceSeqs",
            JSON.stringify(params.archiveImageFileReplaceSeqs),
          );
        }
      } else if (params.archiveImageFile) {
        formData.append("archiveImageFile", params.archiveImageFile);
      }
      if (params.archiveImageOrder !== undefined) {
        formData.append(
          "archiveImageOrder",
          JSON.stringify(params.archiveImageOrder),
        );
      }

      // 파일 추가 (여러 파일 지원)
      if (params.articleFiles && params.articleFiles.length > 0) {
        params.articleFiles.forEach((file) => {
          formData.append("articleFiles", file);
        });
      }

      const response = await apiClient.post<ArticleRegisterResponse>(
        API_ENDPOINTS.ARTICLE.REGISTER,
        formData,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 등록 실패",
      );
    }
  }

  /**
   * 게시글 답글 등록
   * answerAt="Y"이고 nttId(부모 게시글 ID)를 전달하면 답글로 처리됨
   */
  static async createArticleReply(
    formData: FormData,
  ): Promise<ArticleRegisterResponse> {
    try {
      const response = await apiClient.post<ArticleRegisterResponse>(
        API_ENDPOINTS.ARTICLE.REGISTER,
        formData,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 답글 등록 실패",
      );
    }
  }

  /**
   * 게시글 수정
   */
  static async updateArticle(
    params: ArticleUpdateParams,
  ): Promise<ArticleUpdateResponse> {
    try {
      // FormData 생성 (파일 업로드를 위해)
      const formData = new FormData();

      // 기본 파라미터 추가
      formData.append("nttId", params.nttId);
      formData.append("bbsId", params.bbsId);
      formData.append("nttSj", params.nttSj);
      formData.append("nttCn", params.nttCn);
      formData.append("boardInfo1", params.nttCn); // 백엔드에서 boardInfo1로 받음
      formData.append("noticeAt", params.noticeAt);
      formData.append("ntcrStartDt", params.ntcrStartDt);
      formData.append("ntcrEndDt", params.ntcrEndDt);
      formData.append("sttusCode", params.sttusCode);

      // 기존 첨부파일 그룹 ID (백엔드에서 새 파일을 기존 그룹에 append할 때 사용, 없으면 빈 문자열)
      formData.append("atchFileId", params.atchFileId ?? "");

      if (params.password !== undefined && params.password !== "") {
        formData.append("password", params.password);
      }
      if (params.secretAt) {
        formData.append("secretAt", params.secretAt);
      }

      // 사용자 정보 추가 (세션에서 가져온 값)
      if (params.uniqId) {
        formData.append("uniqId", params.uniqId);
      }
      if (params.name) {
        formData.append("name", params.name);
      }
      if (params.nttData1 !== undefined) formData.append("nttData1", params.nttData1);
      if (params.nttData2 !== undefined) formData.append("nttData2", params.nttData2);
      if (params.nttData3 !== undefined) formData.append("nttData3", params.nttData3);
      if (params.nttData4 !== undefined) formData.append("nttData4", params.nttData4);
      if (params.nttData5 !== undefined) formData.append("nttData5", params.nttData5);
      if (params.nttData6 !== undefined) formData.append("nttData6", params.nttData6);
      if (params.nttImgFileId !== undefined)
        formData.append("nttImgFileId", params.nttImgFileId);
      if (params.archiveImageFiles && params.archiveImageFiles.length > 0) {
        params.archiveImageFiles.forEach((file) => {
          formData.append("archiveImageFiles", file);
        });
        const seqs =
          params.archiveImageFileSeqs ??
          params.archiveImageFiles.map((_, i) => i);
        formData.append("archiveImageFileSeqs", JSON.stringify(seqs));
        if (
          params.archiveImageFileReplaceSeqs &&
          params.archiveImageFileReplaceSeqs.length ===
            params.archiveImageFiles.length
        ) {
          formData.append(
            "archiveImageFileReplaceSeqs",
            JSON.stringify(params.archiveImageFileReplaceSeqs),
          );
        }
      } else if (params.archiveImageFile) {
        formData.append("archiveImageFile", params.archiveImageFile);
      }
      if (params.archiveImageOrder !== undefined) {
        formData.append(
          "archiveImageOrder",
          JSON.stringify(params.archiveImageOrder),
        );
      }

      // 새로 추가할 파일 (여러 파일 지원)
      if (params.articleFiles && params.articleFiles.length > 0) {
        params.articleFiles.forEach((file) => {
          formData.append("articleFiles", file);
        });
      }

      const response = await apiClient.post<ArticleUpdateResponse>(
        API_ENDPOINTS.ARTICLE.UPDATE,
        formData,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 수정 실패",
      );
    }
  }

  /**
   * 게시글 삭제
   */
  static async deleteArticle(
    params: ArticleDeleteParams,
  ): Promise<ArticleDeleteResponse> {
    try {
      const response = await apiClient.post<ArticleDeleteResponse>(
        API_ENDPOINTS.ARTICLE.DELETE,
        params,
      );
      return response;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        error instanceof Error ? error.message : "게시글 삭제 실패",
      );
    }
  }
}
