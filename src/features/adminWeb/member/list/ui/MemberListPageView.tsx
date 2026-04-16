'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Pagination } from '@/shared/ui/adminWeb';
import { ConfirmDialog } from '@/shared/ui/adminWeb';
import { OpinionSearchPopup } from '@/entities/adminWeb/member/ui';
import { useMemberList } from '../model';
import '@/shared/styles/admin/mobile-table.css';
import '@/shared/styles/admin/resizable-table.css';
import '@/shared/styles/admin/search-form.css';

export const MemberListPageView: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
    deleteLoading,
    showSearchForm,
    showOpinionSearchPopup,
    opinionSearchValue,
    members,
    totalElements,
    totalPages,
    error,
    sortConfig,
    tableRef,
    pageSize,
    setShowSearchForm,
    setShowOpinionSearchPopup,
    setOpinionSearchValue,
    handlePageChange,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSort,
    handleOpinionSearch,
    handleOpinionSelect,
    handleSearch,
    handleExcelDownload,
    searchCondition,
    searchKeyword,
    joGunMberSta,
    setSearchCondition,
    setSearchKeyword,
    setJoGunMberSta,
  } = useMemberList();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">관리자회원</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt; <span>관리자회원</span>
        </nav>
      </div>

      {/* 모바일 조회조건 토글 버튼 */}
      <div className="md:hidden mb-2">
        <button
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
          onClick={() => setShowSearchForm(!showSearchForm)}
        >
          {showSearchForm ? '▲ 조회조건 닫기' : '▼ 조회조건 열기'}
        </button>
      </div>

      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? 'show' : ''
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  검색구분
                </label>
                <div className="w-full md:w-3/4 flex p-2 md:border-r border-gray-300">
                  <select
                    className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="1">관리자명</option>
                    <option value="2">아이디</option>
                    <option value="3">연락처</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  상태
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2 md:border-b-0 border-gray-300">
                  <select
                    className="flex-1 border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={joGunMberSta}
                    onChange={(e) => setJoGunMberSta(e.target.value)}
                  >
                    <option value="">전체</option>
                    <option value="A">대기</option>
                    <option value="P">사용</option>
                    <option value="D">탈퇴</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3 gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          style={{ minWidth: '100px' }}
          onClick={handleSearch}
        >
          🔍 조회
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
          onClick={() => router.push('/adminWeb/member/list/register')}
          style={{ minWidth: '100px' }}
        >
          ✏️ 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            관리자회원 목록 (총 {totalElements.toLocaleString()}명)
          </h5>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-[13px] bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleExcelDownload}
              disabled={loading}
            >
              {loading ? '⏳ 다운로드 중...' : '📊 엑셀'}
            </button>
          </div>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <>
              {/* 데스크톱 스켈레톤 테이블 */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full mb-0" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        아이디
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        이름
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        이메일
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        연락처
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        가입일
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        탈퇴일
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        잠금여부
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '30px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '72px',
                              height: '22px',
                              margin: '0 auto',
                              borderRadius: '5px',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '80px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '60px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '150px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '100px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '90px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '90px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3 border-r">
                          <div
                            className="skeleton"
                            style={{
                              width: '50px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            <div
                              className="skeleton"
                              style={{
                                width: '45px',
                                height: '28px',
                                borderRadius: '4px',
                              }}
                            ></div>
                            <div
                              className="skeleton"
                              style={{
                                width: '45px',
                                height: '28px',
                                borderRadius: '4px',
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 스켈레톤 카드 */}
              <div className="mobile-card-view md:hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="mobile-card">
                    <div className="mobile-card-header">
                      <div
                        className="skeleton"
                        style={{ width: '80px', height: '20px' }}
                      ></div>
                      <div
                        className="skeleton"
                        style={{
                          width: '60px',
                          height: '24px',
                          borderRadius: '12px',
                        }}
                      ></div>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">아이디</span>
                        <div
                          className="skeleton"
                          style={{ width: '100px', height: '16px' }}
                        ></div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">이름</span>
                        <div
                          className="skeleton"
                          style={{ width: '80px', height: '16px' }}
                        ></div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">이메일</span>
                        <div
                          className="skeleton"
                          style={{ width: '150px', height: '16px' }}
                        ></div>
                      </div>
                      <div className="mobile-card-row">
                        <span className="mobile-card-label">가입일</span>
                        <div
                          className="skeleton"
                          style={{ width: '100px', height: '16px' }}
                        ></div>
                      </div>
                    </div>
                    <div className="mobile-card-footer">
                      <div
                        className="skeleton"
                        style={{
                          width: '60px',
                          height: '32px',
                          borderRadius: '4px',
                        }}
                      ></div>
                      <div
                        className="skeleton"
                        style={{
                          width: '60px',
                          height: '32px',
                          borderRadius: '4px',
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="overflow-x-auto hidden md:block">
                <table
                  ref={tableRef}
                  className="w-full mb-0"
                  style={{ tableLayout: 'fixed' }}
                >
                  <colgroup>
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="border-t border-b-2">
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('number')}
                      >
                        번호
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('mberSttus')}
                      >
                        상태
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('userId')}
                      >
                        아이디
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('userNm')}
                      >
                        이름
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('emailAdres')}
                      >
                        이메일
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('mbtlnum')}
                      >
                        연락처
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('sbscrbDe')}
                      >
                        가입일
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('secsnDe')}
                      >
                        탈퇴일
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('lockAt')}
                      >
                        잠금여부
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? '데이터를 불러오는 중...'
                            : '조회된 데이터가 없습니다.'}
                        </td>
                      </tr>
                    ) : (
                      members.map((member, index) => {
                        const actualNum =
                          member.rnum ||
                          String((currentPage - 1) * pageSize + index + 1);
                        // API 응답 구조에 맞게 필드명 매핑
                        const userId = member.userId || '';
                        const userNm = member.userNm || '';
                        const emailAdres = member.emailAdres || '';
                        const usrTelNo = member.usrTelNo || '';
                        const mbtlnum = member.mbtlnum || '';
                        const sbscrbDe = member.sbscrbDe || ''; // 가입일
                        const secsnDe = member.secsnDe || ''; // 탈퇴일
                        const mberSttus = member.mberSttus || ''; // 상태코드
                        const mberSttusNm = member.mberSttusNm || ''; // 상태명
                        const lockAt = member.lockAt || ''; // 잠금여부

                        // 상태 표시 변환 (상태명이 있으면 사용, 없으면 상태코드로 변환)
                        const getStatusLabel = (
                          statusCode: string,
                          statusName: string,
                        ) => {
                          if (statusName) return statusName;
                          switch (statusCode) {
                            case 'A':
                              return '대기';
                            case 'P':
                              return '사용';
                            case 'D':
                              return '탈퇴';
                            default:
                              return '전체';
                          }
                        };

                        const getStatusClass = (statusCode: string) => {
                          switch (statusCode) {
                            case 'A':
                              return 'bg-yellow-100 text-yellow-800';
                            case 'P':
                              return 'bg-green-100 text-green-800';
                            case 'D':
                              return 'bg-red-100 text-red-800';
                            default:
                              return 'bg-gray-100 text-gray-800';
                          }
                        };

                        // 연락처: mbtlnum 우선, 없으면 usrTelNo
                        const contact = mbtlnum || usrTelNo || '';
                        // 잠금여부 표시
                        const lockStatus = lockAt || '';
                        // 관리자코드 (esntlId) - 상세 조회에 사용
                        const esntlId =
                          member.esntlId || member.id?.toString() || '';

                        return (
                          <tr
                            key={member.id || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                  mberSttus,
                                )}`}
                              >
                                {getStatusLabel(mberSttus, mberSttusNm)}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={userId || undefined}
                              >
                                {userId}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={userNm || undefined}
                              >
                                {userNm}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={emailAdres || undefined}
                              >
                                {emailAdres}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900 overflow-hidden">
                              <span
                                className="block truncate min-w-0"
                                title={contact || undefined}
                              >
                                {contact}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {sbscrbDe}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {secsnDe || '-'}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {lockStatus || '-'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1"
                                onClick={() => {
                                  if (esntlId) {
                                    // 현재 조회 조건과 페이지를 쿼리 파라미터로 전달
                                    const params = new URLSearchParams({
                                      esntlId: esntlId,
                                      searchCondition: searchCondition || '1',
                                      searchKeyword: searchKeyword || '',
                                      joGunMberSta: joGunMberSta || '',
                                      page: currentPage.toString(),
                                    });
                                    router.push(
                                      `/adminWeb/member/list/detail?${params.toString()}`,
                                    );
                                  }
                                }}
                              >
                                상세
                              </button>
                              <button
                                className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => handleDeleteClick(esntlId)}
                                disabled={deleteLoading}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view md:hidden">
                {members.length === 0 ? (
                  <div className="mobile-card">
                    <div className="mobile-card-body">
                      <div className="text-center text-gray-500 py-8">
                        {loading
                          ? '데이터를 불러오는 중...'
                          : '조회된 데이터가 없습니다.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  members.map((member, index) => {
                    const actualNum =
                      member.rnum ||
                      String((currentPage - 1) * pageSize + index + 1);
                    const userId = member.userId || '';
                    const userNm = member.userNm || '';
                    const emailAdres = member.emailAdres || '';
                    const usrTelNo = member.usrTelNo || '';
                    const mbtlnum = member.mbtlnum || '';
                    const sbscrbDe = member.sbscrbDe || ''; // 가입일
                    const secsnDe = member.secsnDe || ''; // 탈퇴일
                    const mberSttus = member.mberSttus || ''; // 상태코드
                    const mberSttusNm = member.mberSttusNm || ''; // 상태명
                    const lockAt = member.lockAt || ''; // 잠금여부

                    const getStatusLabel = (
                      statusCode: string,
                      statusName: string,
                    ) => {
                      if (statusName) return statusName;
                      switch (statusCode) {
                        case 'A':
                          return '대기';
                        case 'P':
                          return '사용';
                        case 'D':
                          return '탈퇴';
                        default:
                          return '전체';
                      }
                    };

                    const getStatusClass = (statusCode: string) => {
                      switch (statusCode) {
                        case 'A':
                          return 'bg-yellow-100 text-yellow-800';
                        case 'P':
                          return 'bg-green-100 text-green-800';
                        case 'D':
                          return 'bg-red-100 text-red-800';
                        default:
                          return 'bg-gray-100 text-gray-800';
                      }
                    };

                    const contact = mbtlnum || usrTelNo || '';
                    const lockStatus = lockAt || '';
                    // 관리자코드 (esntlId) - 상세 조회에 사용
                    const esntlId =
                      member.esntlId || member.id?.toString() || '';

                    return (
                      <div key={member.id || index} className="mobile-card">
                        <div className="mobile-card-header">
                          <div className="flex items-center gap-2">
                            <span className="mobile-card-id">#{actualNum}</span>
                            <span
                              className={`inline-flex items-center justify-center min-w-[72px] px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${getStatusClass(
                                mberSttus,
                              )}`}
                            >
                              {getStatusLabel(mberSttus, mberSttusNm)}
                            </span>
                          </div>
                          <span
                            className="mobile-card-id block truncate min-w-0"
                            title={userNm || undefined}
                          >
                            {userNm}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">아이디</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={userId || undefined}
                            >
                              {userId}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">이메일</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={emailAdres || undefined}
                            >
                              {emailAdres}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">연락처</span>
                            <span
                              className="mobile-card-value block truncate min-w-0"
                              title={contact || undefined}
                            >
                              {contact || '-'}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">가입일</span>
                            <span className="mobile-card-value">
                              {sbscrbDe}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">탈퇴일</span>
                            <span className="mobile-card-value">
                              {secsnDe || '-'}
                            </span>
                          </div>
                          <div className="mobile-card-row">
                            <span className="mobile-card-label">잠금여부</span>
                            <span className="mobile-card-value">
                              {lockStatus || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-card-footer">
                          <button
                            className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                            onClick={() => {
                              if (esntlId) {
                                // 현재 조회 조건과 페이지를 쿼리 파라미터로 전달
                                const params = new URLSearchParams({
                                  esntlId: esntlId,
                                  searchCondition: searchCondition || '1',
                                  searchKeyword: searchKeyword || '',
                                  joGunMberSta: joGunMberSta || '',
                                  page: currentPage.toString(),
                                });
                                router.push(
                                  `/adminWeb/member/list/detail?${params.toString()}`,
                                );
                              }
                            }}
                          >
                            상세
                          </button>
                          <button
                            className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => handleDeleteClick(esntlId)}
                            disabled={deleteLoading}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="회원 탈퇴"
        message={`해당 회원을 탈퇴 처리하시겠습니까?`}
        confirmText={deleteLoading ? '처리 중...' : '탈퇴'}
        cancelText="닫기"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <OpinionSearchPopup
        isOpen={showOpinionSearchPopup}
        onClose={() => setShowOpinionSearchPopup(false)}
        onSelect={handleOpinionSelect}
      />
    </>
  );
};
