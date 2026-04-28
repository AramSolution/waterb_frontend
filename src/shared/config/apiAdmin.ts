/**
 * 관리자웹 전용 API 엔드포인트
 * 관리자 페이지 수정 시 이 파일만 변경하면 되므로 사용자웹과 충돌을 줄일 수 있음.
 */
export const API_ENDPOINTS = {
  MEMBER: {
    LIST: "/api/memberList",
    ADMIN_LIST: "/api/admin/member/selectAdminUserMemberList.Ajax",
    ADMIN_EXCEL_LIST: "/api/admin/member/selectAdminUserMemberExcelList.Ajax",
    ADMIN_REGISTER_SCREEN: "/api/admin/member/insertAdminUserMemberManage.adm",
    ADMIN_REGISTER: "/api/admin/member/insertAdminUserMember.Ajax",
    ADMIN_DETAIL: "/api/admin/member/selectAdminUserMemberDetail.Ajax",
    ADMIN_UPDATE: "/api/admin/member/updateAdminUserMember.Ajax",
    ADMIN_DELETE: "/api/admin/member/deleteAdminUserMember.Ajax",
    DETAIL: "/api/members/:id",
    CREATE: "/api/members",
    UPDATE: "/api/members/:id",
    DELETE: "/api/members/:id",
  },
  MENU: {
    LIST: "/api/menus",
    DETAIL: "/api/menus/:id",
    CREATE: "/api/menus",
    UPDATE: "/api/menus/:id",
    DELETE: "/api/menus/:id",
    TREE_LIST: "/api/cont/menu/menuTreeManage.Ajax",
    TREE_DETAIL: "/api/cont/menu/selectMenuTreeDetailAjax.Ajax",
    TREE_INSERT: "/api/cont/menu/insertMenuTreeAjax.Ajax",
    TREE_UPDATE: "/api/cont/menu/updateMenuTreeAjax.Ajax",
    TREE_DELETE: "/api/cont/menu/deleteMenuTreeAjax.Ajax",
    MAKE_LIST: "/api/cont/menu/selectMenuMakeAjax.Ajax",
    CREAT_LIST: "/api/cont/menu/selectMenuCreatList.Ajax",
    INSERT_MENU_CREAT_LIST: "/api/cont/menu/insertMenuCreatList.Ajax",
  },
  BOARD: {
    MASTER_MANAGE: "/api/cont/bord/bbsMasterManage.adm",
    LIST: "/api/cont/bord/selectBBSMasterList.Ajax",
    EXCEL_LIST: "/api/cont/bord/selectBBSMasterExcelList.Ajax",
    REGISTER_SCREEN: "/api/cont/bord/insertBbsMasterManage.adm",
    REGISTER: "/api/cont/bord/insertBBSMaster.Ajax",
    DETAIL: "/api/cont/bord/selectBBSMasterDetail.Ajax",
    UPDATE: "/api/cont/bord/updateBBSMaster.Ajax",
    DELETE: "/api/cont/bord/deleteBBSMaster.Ajax",
  },
  ARTICLE: {
    LIST: "/api/cont/bord/selectArticleList.Ajax",
    EXCEL_LIST: "/api/cont/bord/selectArticleList.Ajax",
    DETAIL: "/api/cont/bord/selectArticleDetail.Ajax",
    REGISTER: "/api/cont/bord/insertArticle.Ajax",
    UPDATE: "/api/cont/bord/updateArticle.ajax",
    UPDATE_VIEW_COUNT: "/api/cont/bord/updateViewCount.ajax",
    DELETE: "/api/cont/bord/deleteArticle.ajax",
    DELETE_FILE: "/api/cont/bord/deleteArticleFile.Ajax",
  },
  PROGRAM: {
    LIST: "/api/cont/prog/selectProgramList.Ajax",
    EXCEL_LIST: "/api/cont/prog/selectProgramExcelList.Ajax",
    REGISTER: "/api/cont/prog/insertProgram.Ajax",
    DETAIL_SCREEN: "/api/cont/prog/updateProgramManage.adm",
    UPDATE: "/api/cont/prog/updateProgram.Ajax",
    DELETE: "/api/cont/prog/deleteProgram.Ajax",
  },
  CODE: {
    DETAIL_LIST_BASE: "/api/cont/code",
    CMM_CODE_LIST: "/api/cont/code/selectCmmCodeList.Ajax",
    CMM_CODE_EXCEL_LIST: "/api/cont/code/selectCmmCodeExcelList.Ajax",
    CL_CODE_LIST: "/api/cont/code/selectClCodeList.Ajax",
    CMM_DETAIL_CODE_LIST: "/api/cont/code/selectCmmDetailCodeList.Ajax",
    CMM_DETAIL_CODE_EXCEL_LIST:
      "/api/cont/code/selectCmmDetailCodeExcelList.Ajax",
    INSERT_CMM_CODE: "/api/cont/code/insertCmmCode.Ajax",
    CMM_CODE_DETAIL: "/api/cont/code/selectCmmCodeDetail.Ajax",
    UPDATE_CMM_CODE: "/api/cont/code/updateCmmCode.Ajax",
    DELETE_CMM_CODE: "/api/cont/code/deleteCmmCode.Ajax",
    CODE_ID_LIST: "/api/cont/code/selectCodeIdList.Ajax",
    INSERT_CMM_DETAIL_CODE: "/api/cont/code/insertCmmDetailCode.Ajax",
    CMM_DETAIL_CODE_DETAIL: "/api/cont/code/selectCmmDetailCodeDetail.Ajax",
    UPDATE_CMM_DETAIL_CODE: "/api/cont/code/updateCmmDetailCode.Ajax",
    DELETE_CMM_DETAIL_CODE: "/api/cont/code/deleteCmmDetailCode.Ajax",
  },
  SUPPORT: {
    LIST: "/api/admin/artprom/list",
    EXCEL_LIST: "/api/admin/artprom/excel-list",
    BASE: "/api/admin/artprom",
    REGISTER: "/api/admin/artprom/",
    UPDATE: "/api/admin/artprom/",
    /** 기준년월별 상담일정(달력) GET /api/admin/artprom/{proId}/list01-options?workYm=YYYYMM */
    LIST01_OPTIONS: (proId: string, workYm: string) =>
      `/api/admin/artprom/${encodeURIComponent(proId)}/list01-options?workYm=${encodeURIComponent(workYm)}`,
    /** 사업대상(PRO_TARGET) 단건 GET /api/admin/artprom/{proId}/pro-target */
    PRO_TARGET: (proId: string) =>
      `/api/admin/artprom/${encodeURIComponent(proId)}/pro-target`,
    /** 사업구분(PRO_GB) 단건 GET /api/admin/artprom/{proId}/pro-gb */
    PRO_GB: (proId: string) =>
      `/api/admin/artprom/${encodeURIComponent(proId)}/pro-gb`,
    /** 멘토신청관리 사업명 셀렉트 — GET (REQ_GB 멘토 Y, STTUS A, RUN_STA 02) */
    MENTOR_APPLICATION_BUSINESSES:
      "/api/admin/artprom/mentor-application/businesses",
    DETAIL_LIST: "/api/admin/artappm/list",
    DETAIL_EXCEL_LIST: "/api/admin/artappm/excel-list",
    /** 선정관리용 신청 목록 조회 (페이징 없음) */
    SELECTION_LIST: "/api/admin/artappm/selection-list",
    /** 랜덤 신청자 선정 (f_choicelist) */
    CHOICE_LIST: "/api/admin/artappm/choice-list",
    /** 선정관리 선정여부 일괄 변경 */
    SELECTION_UPDATE: "/api/admin/artappm/selection-update",
    APPLICATION_REGISTER: "/api/admin/artappm/",
    APPLICATION_DETAIL_BASE: "/api/admin/artappm",
    /** 수강확인증 목록 엑셀 (페이징 없음, searchProId/searchProSeq/searchReqEsntlId) */
    STUDY_CERT_EXCEL: "/api/admin/artappm/study-cert-list/excel",
    /** 상담관리(멘토지정) ARTADVI */
    ARTADVI_LIST: "/api/admin/artadvi/list",
    ARTADVI_INSERT: "/api/admin/artadvi/",
    ARTADVI_UPDATE: "/api/admin/artadvi/",
    /** 지원사업 멘토목록(ARTAPMM) */
    MENTOR_LIST: (proId: string) =>
      `/api/admin/artappm/${encodeURIComponent(proId)}/mentors`,
    MENTOR_DELETE: (reqId: string) =>
      `/api/admin/artappm/mentors/${encodeURIComponent(reqId)}`,
    /** 멘토 신청 등록 ARTAPMM — POST multipart: data(JSON), mentorApplicationFiles */
    MENTOR_APPLICATION_REGISTER: (proId: string) =>
      `/api/admin/artappm/${encodeURIComponent(proId)}/mentor-applications`,
    /** 멘토 신청(ARTAPMM) 목록 — POST JSON: searchProId, searchUserNm, start, length */
    MENTOR_APPLICATION_LIST: "/api/admin/artappm/mentor-application-list",
    /** 멘토 신청 중복 여부 — GET ?reqEsntlId=&proSeq= */
    MENTOR_APPLICATION_DUPLICATE_CHECK: (proId: string) =>
      `/api/admin/artappm/${encodeURIComponent(proId)}/mentor-application-duplicate`,
    /** 멘토 신청 단건 상세 — GET */
    MENTOR_APPLICATION_DETAIL: (proId: string, reqId: string) =>
      `/api/admin/artappm/${encodeURIComponent(proId)}/mentor-applications/${encodeURIComponent(reqId)}`,
    /** 멘토 신청 수정 — PUT multipart (등록과 동일) */
    MENTOR_APPLICATION_UPDATE: (proId: string, reqId: string) =>
      `/api/admin/artappm/${encodeURIComponent(proId)}/mentor-applications/${encodeURIComponent(reqId)}`,
    /** 오수 원인자부담금 관리 목록 — POST JSON, body 생략 가능(전체) */
    FEE_PAYER_LIST: "/api/admin/support/fee-payer/list",
    /** 오수 원인자부담금 등록·수정·삭제 저장 — POST JSON `SupportFeePayerRegisterRequest` */
    FEE_PAYER_REGISTER: "/api/admin/support/fee-payer",
    /** 오수 원인자부담금 계산 — POST JSON `SupportFeePayerRegisterRequest` */
    FEE_PAYER_CALCULATE: "/api/admin/support/fee-payer/calculate",
    /** 오수 원인자부담금 상세 — GET `itemId` */
    FEE_PAYER_DETAIL: (itemId: string) =>
      `/api/admin/support/fee-payer/${encodeURIComponent(itemId)}/detail`,
  },
  /** 공부의 명수(ARTPROM proGb 08) — adminWeb ArtappsManageController */
  ARTAPPS: {
    LIST: "/api/admin/artapps/list",
    EXCEL_LIST: "/api/admin/artapps/excel-list",
    /** ARTAPPM INNER JOIN ARTAPPS 신청목록 */
    APPLICATION_LIST: "/api/admin/artapps/application-list",
    BASE: "/api/admin/artapps",
    REGISTER: "/api/admin/artapps/",
    UPDATE: "/api/admin/artapps/",
    /** REQ_ID 단위 ARTAPPS·ARTAPPM 신청 1건 삭제 */
    DELETE_APPLICATIONS_BY_REQ_ID: (reqId: string) =>
      `/api/admin/artapps/applications/by-req-id/${encodeURIComponent(reqId)}`,
    /** REQ_ID 단위 ARTAPPS·ARTAPPM 신청 상태 변경 */
    UPDATE_APPLICATION_STATUS_BY_REQ_ID: (reqId: string, sttusCode: string) =>
      `/api/admin/artapps/applications/by-req-id/${encodeURIComponent(reqId)}/status-code?sttusCode=${encodeURIComponent(sttusCode)}`,
  },
  NEIS: {
    GUNSAN_SCHOOLS: "/api/neis/gunsan-schools",
    CLASS_INFO: "/api/neis/class-info",
  },
  ARMUSER: {
    BASE: "/api/admin/armuser",
    LIST: "/api/admin/armuser/list",
    LIST_EXCEL: "/api/admin/armuser/list/excel",
  },
  ADMIN_ARMCHIL: {
    CHILDREN: "/api/admin/armchil/children",
    CHILDREN_EXCEL: "/api/admin/armchil/children/excel",
    /** 자녀(학생) 기준 학부모 목록: GET /api/admin/armchil/parents?cEsntlId=xxx */
    PARENTS: "/api/admin/armchil/parents",
  },
  ACADEMY: {
    LIST: "/api/admin/armuser/list",
    DELETE: "/api/admin/armuser/delete",
  },
  MEMBER_SELECTION: {
    /** 회원 선정 업무: 선정 버튼 클릭 시 호출 */
    RUN: "/api/admin/artchoi/selection-insert",
    /** 선정 결과 목록 (Y → R → N 정렬) */
    LIST: "/api/admin/artchoi",
  },
  /** 관리자 배너(ARMBANR) — BannerManageController */
  BANNER: {
    LIST: "/api/admin/banner/list",
    /** POST 등록 — `@PostMapping("/")` 와 동일 (끝 슬래시 유지) */
    REGISTER: "/api/admin/banner/",
    /** GET 상세 / DELETE 동일 경로 */
    detail: (banrCd: string) =>
      `/api/admin/banner/${encodeURIComponent(banrCd)}`,
    deleteImage: (banrCd: string) =>
      `/api/admin/banner/${encodeURIComponent(banrCd)}/image`,
    delete: (banrCd: string) =>
      `/api/admin/banner/${encodeURIComponent(banrCd)}`,
  },
  FRANCHISE: {
    // 가맹학원(희망사업 신청) 목록 / 엑셀
    LIST: "/api/admin/artedum/list",
    EXCEL_LIST: "/api/admin/artedum/list/excel",
    /** 가맹학원(희망사업 신청) 등록 */
    REGISTER: "/api/admin/artedum/",
    /** 가맹학원 상세/수정: GET /api/admin/artedum/{eduEsntlId}/{eduGb}, PUT 동일 */
    detailPath: (eduEsntlId: string, eduGb: string) =>
      `/api/admin/artedum/${encodeURIComponent(eduEsntlId)}/${encodeURIComponent(eduGb)}`,
    /** 가맹학원 첨부파일 1건 삭제: DELETE /api/admin/artedum/{eduEsntlId}/{eduGb}/files/{fileId}/{seq} */
    deleteFilePath: (
      eduEsntlId: string,
      eduGb: string,
      fileId: number | string,
      seq: number | string,
    ) =>
      `${API_ENDPOINTS.FRANCHISE.detailPath(eduEsntlId, eduGb)}/files/${encodeURIComponent(String(fileId))}/${encodeURIComponent(String(seq))}`,
    /** 가맹학원 신청과목(ARTEDUD) 1건 삭제: DELETE /api/admin/artedum/{eduEsntlId}/{eduGb}/subjects/{seq} */
    deleteSubjectPath: (
      eduEsntlId: string,
      eduGb: string,
      seq: number | string,
    ) =>
      `${API_ENDPOINTS.FRANCHISE.detailPath(eduEsntlId, eduGb)}/subjects/${encodeURIComponent(String(seq))}`,
    DELETE: "/api/admin/franchise/delete",
  },
};
