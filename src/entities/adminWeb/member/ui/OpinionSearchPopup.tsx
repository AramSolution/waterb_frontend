'use client';

import React, { useState, useRef } from 'react';
import { LayerPopup } from '@/shared/ui/adminWeb';
import { useResizableColumns } from '@/shared/hooks';
import '@/shared/styles/admin/resizable-table.css';
import '@/shared/styles/admin/mobile-table.css';

interface OpinionSearchPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: any) => void;
}

export function OpinionSearchPopup({ isOpen, onClose, onSelect }: OpinionSearchPopupProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const tableRef = useRef<HTMLTableElement>(null);
  const pageSize = 10;

  useResizableColumns(tableRef);

  // 샘플 데이터
  const sampleData = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    farmName: `농장${i + 1}`,
    inspectionNumber: `INS-2025-${String(i + 1).padStart(4, '0')}`,
    inspectionDate: `2025-12-${String(Math.max(1, 20 - (i % 20))).padStart(2, '0')}`,
    content: `소견서 내용 ${i + 1} - 검사 결과 정상 범위 내에 있으며, 추가 조치 불필요`,
    status: i % 3 === 0 ? '완료' : '진행중'
  }));

  // 필터링된 데이터
  const filteredData = sampleData.filter(item => {
    if (searchKeyword && !item.content.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    if (searchDate && !item.inspectionDate.includes(searchDate)) {
      return false;
    }
    return true;
  });

  // 페이징 처리
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearchKeyword('');
    setSearchDate('');
    setCurrentPage(1);
  };

  const handleSelect = (item: any) => {
    onSelect(item);
    onClose();
  };

  return (
    <LayerPopup isOpen={isOpen} onClose={onClose} title="소견서 내용 검색" width="900px">
      {/* 조회 조건 */}
      <div className="bg-white mb-4 border border-gray-300">
        <div className="flex flex-wrap">
          <div className="w-full md:w-1/2">
            <div className="flex flex-col md:flex-row items-stretch" style={{ minHeight: '45px' }}>
              <label className="w-full md:w-1/3 bg-gray-100 flex items-center px-3 py-2 font-bold border-b border-r border-gray-300 text-[13px]">
                검색어
              </label>
              <div className="w-full md:w-2/3 flex items-center p-2 border-b md:border-b-0 md:border-r border-gray-300">
                <input
                  type="text"
                  className="w-full border border-gray-300 px-3 py-2 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                  placeholder="소견서 내용을 입력하세요"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <div className="flex flex-col md:flex-row items-stretch" style={{ minHeight: '45px' }}>
              <label className="w-full md:w-1/3 bg-gray-100 flex items-center px-3 py-2 font-bold border-b md:border-b-0 border-r border-gray-300 text-[13px]">
                검수일
              </label>
              <div className="w-full md:w-2/3 flex items-center p-2 border-b md:border-b-0 border-gray-300">
                <input
                  type="date"
                  className="w-full border border-gray-300 px-3 py-2 rounded-none text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-[13px]"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          onClick={handleSearch}
        >
          🔍 조회
        </button>
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-[13px]"
          onClick={handleReset}
        >
          초기화
        </button>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white border border-gray-300">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-50">
          <h5 className="mb-0 font-semibold text-[13px]">
            검색 결과 (총 {filteredData.length}건)
          </h5>
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="overflow-x-auto hidden md:block">
          <table ref={tableRef} className="w-full">
            <thead className="bg-gray-100">
              <tr className="border-b-2">
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700" style={{ width: '60px' }}>
                  선택
                </th>
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700" style={{ width: '80px' }}>
                  번호
                </th>
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700" style={{ width: '120px' }}>
                  농장명
                </th>
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700" style={{ width: '140px' }}>
                  검수번호
                </th>
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700" style={{ width: '120px' }}>
                  검수일
                </th>
                <th className="px-3 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                  소견서 내용
                </th>
                <th className="px-3 py-3 text-center text-[13px] font-bold text-gray-700" style={{ width: '100px' }}>
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-r text-center">
                      <button
                        className="px-3 py-1 text-[13px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        onClick={() => handleSelect(item)}
                      >
                        선택
                      </button>
                    </td>
                    <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                      {item.farmName}
                    </td>
                    <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                      {item.inspectionNumber}
                    </td>
                    <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                      {item.inspectionDate}
                    </td>
                    <td className="px-3 py-2 border-r text-[13px] text-gray-900">
                      {item.content}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                          item.status === '완료' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-[13px]">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="mobile-card-view md:hidden">
          {paginatedData.length > 0 ? (
            paginatedData.map((item) => (
              <div key={item.id} className="mobile-card">
                <div className="mobile-card-header">
                  <span className="mobile-card-id">
                    #{item.id} - {item.farmName}
                  </span>
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">검수번호</span>
                    <span className="mobile-card-value">{item.inspectionNumber}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">검수일</span>
                    <span className="mobile-card-value">{item.inspectionDate}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">소견서 내용</span>
                    <span className="mobile-card-value">{item.content}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">상태</span>
                    <span className="mobile-card-value">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-[5px] text-[13px] font-medium ${
                          item.status === '완료' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="mobile-card-footer">
                  <button
                    className="px-4 py-2 text-[13px] bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors w-full"
                    onClick={() => handleSelect(item)}
                  >
                    선택
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 text-[13px]">
              검색 결과가 없습니다.
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="px-2 md:px-4 py-3 border-t border-gray-300 bg-gray-50">
            <div className="flex justify-center items-center gap-1 flex-wrap">
              <button
                className="px-2 md:px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] min-w-[50px] md:min-w-[60px]"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                처음
              </button>
              <button
                className="px-2 md:px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] min-w-[50px] md:min-w-[60px]"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                이전
              </button>

              {/* 페이지 번호 */}
              <div className="flex gap-1">
                {(() => {
                  const pageNumbers = [];
                  const maxVisible = window.innerWidth < 768 ? 5 : 10;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pageNumbers.push(
                      <button
                        key={i}
                        className={`px-2 md:px-3 py-1.5 border rounded text-[13px] min-w-[32px] md:min-w-[36px] transition-colors ${
                          currentPage === i
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white border-gray-300 hover:bg-gray-100'
                        }`}
                        onClick={() => setCurrentPage(i)}
                      >
                        {i}
                      </button>
                    );
                  }
                  return pageNumbers;
                })()}
              </div>

              <button
                className="px-2 md:px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] min-w-[50px] md:min-w-[60px]"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                다음
              </button>
              <button
                className="px-2 md:px-3 py-1.5 border border-gray-300 bg-white rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] min-w-[50px] md:min-w-[60px]"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                마지막
              </button>
            </div>
          </div>
        )}
      </div>
    </LayerPopup>
  );
}
