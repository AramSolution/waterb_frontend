import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
}) => {
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const handlePageClick = (page: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav>
      <ul className="flex items-center justify-center gap-1 mb-0 text-[13px]">
        {/* 맨 처음 */}
        <li>
          <button
            className={`w-14 h-10 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => handlePageClick(1, e)}
            disabled={currentPage === 1}
            aria-label="First"
          >
            <span aria-hidden="true">처음</span>
          </button>
        </li>

        {/* 이전 */}
        <li>
          <button
            className={`w-14 h-10 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => handlePageClick(currentPage - 1, e)}
            disabled={currentPage === 1}
            aria-label="Previous"
          >
            <span aria-hidden="true">이전</span>
          </button>
        </li>

        {/* 페이지 번호 */}
        {getPageNumbers().map((page) => (
          <li key={page}>
            <button
              className={`w-10 h-10 flex items-center justify-center border border-gray-300 ${
                currentPage === page
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              onClick={(e) => handlePageClick(page, e)}
            >
              {page}
            </button>
          </li>
        ))}

        {/* 다음 */}
        <li>
          <button
            className={`w-14 h-10 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => handlePageClick(currentPage + 1, e)}
            disabled={currentPage === totalPages}
            aria-label="Next"
          >
            <span aria-hidden="true">다음</span>
          </button>
        </li>

        {/* 맨 끝 */}
        <li>
          <button
            className={`w-14 h-10 flex items-center justify-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => handlePageClick(totalPages, e)}
            disabled={currentPage === totalPages}
            aria-label="Last"
          >
            <span aria-hidden="true">끝</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};
