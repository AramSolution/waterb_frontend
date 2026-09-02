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
    /** 오수 원인자부담금 관리 목록 — POST JSON, body 생략 가능(전체) */
    FEE_PAYER_LIST: "/api/admin/support/fee-payer/list",
    /** 오수 원인자부담금 미납 목록(대시보드 등) — POST JSON { baseMonth, startIndex, lengthPage } */
    FEE_PAYER_UNPAID_LIST: "/api/admin/support/fee-payer/unpaid-list",
    /** 오수 원인자부담금 관리 목록 엑셀 — POST JSON, body 생략 가능(전체) */
    FEE_PAYER_EXCEL_LIST: "/api/admin/support/fee-payer/excel-list",
    /** 오수 원인자부담금 등록·수정·삭제 저장 — POST JSON `SupportFeePayerRegisterRequest` */
    FEE_PAYER_REGISTER: "/api/admin/support/fee-payer",
    /** 오수 원인자부담금 계산 — POST JSON `SupportFeePayerRegisterRequest` */
    FEE_PAYER_CALCULATE: "/api/admin/support/fee-payer/calculate",
    /** 오수 원인자부담금 상세 — GET `itemId` */
    FEE_PAYER_DETAIL: (itemId: string) =>
      `/api/admin/support/fee-payer/${encodeURIComponent(itemId)}/detail`,
    /** 오수 원인자부담금 납부 상세 — GET `itemId` */
    FEE_PAYER_PAYMENT_DETAIL: (itemId: string) =>
      `/api/admin/support/fee-payer/${encodeURIComponent(itemId)}/payment-detail`,
    /** 오수 원인자부담금 납부내역 저장 — POST */
    FEE_PAYER_PAYMENT_SAVE: "/api/admin/support/fee-payer/payment",
    /** 오수 원인자부담금 납부내역 1건 삭제 — DELETE JSON { itemId, seq, seq2 } */
    FEE_PAYER_PAYMENT_DELETE: "/api/admin/support/fee-payer/payment/delete",
    /** 오수 원인자부담금 목록 삭제 — DELETE JSON { itemId, seq } */
    FEE_PAYER_DELETE: "/api/admin/support/fee-payer/delete",
    /** 배수설비 관리 목록 — POST JSON */
    DRAINAGE_EQUIP_LIST: "/api/admin/support/drainage-equip/list",
    /** 배수설비 관리 목록 엑셀 — POST JSON */
    DRAINAGE_EQUIP_EXCEL_LIST: "/api/admin/support/drainage-equip/excel-list",
    /** 배수설비 상세 — GET itemId */
    DRAINAGE_EQUIP_DETAIL: (itemId: string) =>
      `/api/admin/support/drainage-equip/${encodeURIComponent(itemId)}/detail`,
    /** 배수설비 납부 상세 — GET itemId */
    DRAINAGE_EQUIP_PAYMENT_DETAIL: (itemId: string) =>
      `/api/admin/support/drainage-equip/${encodeURIComponent(itemId)}/payment-detail`,
    /** 배수설비 납부내역 저장 — POST */
    DRAINAGE_EQUIP_PAYMENT_SAVE: "/api/admin/support/drainage-equip/payment",
    /** 배수설비 납부내역 1건 삭제 — DELETE */
    DRAINAGE_EQUIP_PAYMENT_DELETE:
      "/api/admin/support/drainage-equip/payment/delete",
    /** 배수설비 목록 삭제 — DELETE JSON { itemId, seq } */
    DRAINAGE_EQUIP_DELETE: "/api/admin/support/drainage-equip/delete",
    /** 배수설비 등록·수정 — POST */
    DRAINAGE_EQUIP_REGISTER: "/api/admin/support/drainage-equip",
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
  DASHBOARD: {
    PAYMENT_MOM: "/api/admin/dashboard/payment-mom",
  },
};
