'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminExcelDownloadButton,
  ConfirmDialog,
  Pagination,
} from '@/shared/ui/adminWeb';
import { OpinionSearchPopup } from '@/entities/adminWeb/member/ui';
import { useMemberList } from '@/features/adminWeb/member/list/model';
import '@/shared/styles/admin/mobile-table.css';
import '@/shared/styles/admin/resizable-table.css';
import '@/shared/styles/admin/table-filter.css';
import '@/shared/styles/admin/search-form.css';

const initialFilters = {
  userId: '',
  userNm: '',
  emailAdres: '',
  sbscrbDe: '',
  mberSttus: '',
};

export const MemberTestPageView: React.FC = () => {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const handleFilterChange = useCallback(
    (key: keyof typeof initialFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const {
    loading,
    isInitialLoad,
    currentPage,
    showDeleteDialog,
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
  } = useMemberList();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">테스트</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt; <span>테스트</span>
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
                  농장구분
                </label>
                <div className="w-full md:w-3/4 flex p-2 md:border-r border-gray-300">
                  <select className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none">
                    <option value="">농장명</option>
                    <option value="farm1">농장1</option>
                    <option value="farm2">농장2</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  의뢰구분
                </label>
                <div className="w-full md:w-3/4 flex p-2 border-gray-300">
                  <select className="w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none">
                    <option value="">검수번호</option>
                    <option value="type1">유형1</option>
                    <option value="type2">유형2</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row border-b items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  검수일/완료일
                </label>
                <div className="w-full md:w-3/4 flex flex-wrap items-center p-2 md:border-r border-gray-300">
                  <select className="w-full sm:w-auto border border-gray-300 px-3 py-2 mr-2 mb-2 sm:mb-0 rounded-none">
                    <option value="">검수일</option>
                    <option value="complete">완료일</option>
                  </select>
                  <input
                    type="date"
                    className="w-full sm:flex-1 border border-gray-300 px-3 py-2 rounded-none text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 sm:mb-0"
                    defaultValue="2024-12-10"
                  />
                  <span className="mx-2">~</span>
                  <input
                    type="date"
                    className="w-full sm:flex-1 border border-gray-300 px-3 py-2 rounded-none text-center focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 sm:mb-0"
                    defaultValue="2025-12-10"
                  />
                  <input
                    className="ml-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    type="checkbox"
                    id="dateCheck"
                    defaultChecked
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row border-b items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  병성 검사 명
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2 border-gray-300">
                  <input
                    type="text"
                    className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row border-b items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  소견서 내용검색
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2 md:border-b-0 md:border-r border-gray-300">
                  <div className="relative w-full">
                    <input
                      type="text"
                      className="w-full border border-gray-300 px-3 py-2 pr-10 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="검색할 내용을 입력하세요"
                      value={opinionSearchValue}
                      onChange={(e) => setOpinionSearchValue(e.target.value)}
                      readOnly
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-3 text-gray-600 hover:text-blue-600 transition-colors"
                      onClick={handleOpinionSearch}
                      title="검색"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col md:flex-row border-b items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b md:border-b-0 border-r border-gray-300">
                  상태
                </label>
                <div className="w-full md:w-3/4 flex items-center p-2 md:border-b-0 border-gray-300">
                  <select className="flex-1 border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">전체</option>
                    <option value="active">활성</option>
                    <option value="inactive">비활성</option>
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
        >
          🔍 조회
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-[13px]"
          onClick={() => router.push('/adminWeb/member/test/register')}
          style={{ minWidth: '100px' }}
        >
          📄 등록
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">회원 목록 (총 1,234명)</h5>
          <div className="flex gap-2">
            {showFilters && (
              <button
                className="px-3 py-1 text-[13px] bg-white text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                onClick={handleClearFilters}
              >
                ✕ 초기화
              </button>
            )}
            <button
              className={`px-3 py-1 text-[13px] rounded transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? '🔽' : '🔼'} 필터
            </button>
            <AdminExcelDownloadButton onClick={() => {}} />
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
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr className="border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        <div
                          className="skeleton"
                          style={{
                            width: '16px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
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
                        가입일
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        상태
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
                              width: '16px',
                              height: '16px',
                              margin: '0 auto',
                            }}
                          ></div>
                        </td>
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
                              height: '22px',
                              margin: '0 auto',
                              borderRadius: '4px',
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
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="border-t border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('number')}
                      >
                        번호
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('id')}
                      >
                        아이디
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        이름
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('email')}
                      >
                        이메일
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('joinDate')}
                      >
                        가입일
                      </th>
                      <th
                        className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700 sortable-header cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        상태
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                    {showFilters && (
                      <tr className="table-filter-row bg-gray-50">
                        <th className="px-4 py-2 border-r"></th>
                        <th className="px-4 py-2 border-r"></th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="아이디 검색"
                            value={filters.userId}
                            onChange={(e) =>
                              handleFilterChange('userId', e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="이름 검색"
                            value={filters.userNm}
                            onChange={(e) =>
                              handleFilterChange('userNm', e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="text"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="이메일 검색"
                            value={filters.emailAdres}
                            onChange={(e) =>
                              handleFilterChange('emailAdres', e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <input
                            type="date"
                            className="table-filter-input w-full px-2 py-1 text-[13px] border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={filters.sbscrbDe}
                            onChange={(e) =>
                              handleFilterChange('sbscrbDe', e.target.value)
                            }
                          />
                        </th>
                        <th className="px-4 py-2 border-r">
                          <select
                            className="table-filter-select w-full px-2 py-1 text-[13px] border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={filters.mberSttus}
                            onChange={(e) =>
                              handleFilterChange('mberSttus', e.target.value)
                            }
                          >
                            <option value="">전체</option>
                            <option value="A">대기</option>
                            <option value="P">사용</option>
                            <option value="D">탈퇴</option>
                          </select>
                        </th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 15 }, (_, i) => i + 1)
                      .filter((num) => {
                        const actualNum = (currentPage - 1) * pageSize + num;
                        const userId = `user${String(actualNum).padStart(
                          3,
                          '0',
                        )}`;
                        const userName = `홍길동 ${actualNum}`;
                        const userEmail = `user${actualNum}@example.com`;
                        const joinDate = `2025-12-${String(
                          Math.max(1, 16 - num),
                        ).padStart(2, '0')}`;
                        const status = num % 3 === 0 ? 'pending' : 'active';

                        if (
                          filters.userId &&
                          !userId
                            .toLowerCase()
                            .includes(filters.userId.toLowerCase())
                        )
                          return false;
                        if (
                          filters.userNm &&
                          !userName
                            .toLowerCase()
                            .includes(filters.userNm.toLowerCase())
                        )
                          return false;
                        if (
                          filters.emailAdres &&
                          !userEmail
                            .toLowerCase()
                            .includes(filters.emailAdres.toLowerCase())
                        )
                          return false;
                        if (
                          filters.sbscrbDe &&
                          !joinDate.includes(filters.sbscrbDe)
                        )
                          return false;
                        if (filters.mberSttus && status !== filters.mberSttus)
                          return false;

                        return true;
                      })
                      .map((num) => {
                        const actualNum = (currentPage - 1) * pageSize + num;
                        return (
                          <tr key={num} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-center border-r">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              user{String(actualNum).padStart(3, '0')}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              홍길동 {actualNum}
                            </td>
                            <td className="px-3 py-2 border-r text-[13px] text-gray-900">
                              user{actualNum}@example.com
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              2025-12-
                              {String(Math.max(1, 16 - num)).padStart(2, '0')}
                            </td>
                            <td className="px-3 py-2 border-r text-center">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                                  num % 3 === 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {num % 3 === 0 ? '대기' : '활성'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors mr-1">
                                저장
                              </button>
                              <button
                                className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                                onClick={() =>
                                  handleDeleteClick(actualNum.toString())
                                }
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="mobile-card-view md:hidden">
                {Array.from({ length: 15 }, (_, i) => i + 1).map((num) => {
                  const actualNum = (currentPage - 1) * pageSize + num;
                  return (
                    <div key={num} className="mobile-card">
                      <div className="mobile-card-header">
                        <span className="mobile-card-id">
                          #{actualNum} - 홍길동 {actualNum}
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mobile-card-checkbox"
                        />
                      </div>
                      <div className="mobile-card-body">
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">아이디</span>
                          <span className="mobile-card-value">
                            user{String(actualNum).padStart(3, '0')}
                          </span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">이메일</span>
                          <span className="mobile-card-value">
                            user{actualNum}@example.com
                          </span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">가입일</span>
                          <span className="mobile-card-value">
                            2025-12-
                            {String(Math.max(1, 16 - num)).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">상태</span>
                          <span className="mobile-card-value">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                num % 3 === 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {num % 3 === 0 ? '대기' : '활성'}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="mobile-card-footer">
                        <button className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">
                          저장
                        </button>
                        <button
                          className="px-3 py-1 text-[13px] text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                          onClick={() =>
                            handleDeleteClick(actualNum.toString())
                          }
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
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
        title="회원 삭제"
        message={`정말로 해당 회원을 삭제하시겠습니까?`}
        confirmText="삭제"
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
