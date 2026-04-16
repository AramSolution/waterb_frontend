import { useEffect, useRef } from 'react';

export const useResizableColumns = (tableRef: React.RefObject<HTMLTableElement>) => {
  const isResizingRef = useRef(false);
  const currentColumnRef = useRef<HTMLTableCellElement | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    let handleMouseUp: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isInitialized = false;

    // 테이블이 DOM에 추가될 때까지 대기하는 함수
    const waitForTable = () => {
      if (isInitialized) return; // 이미 초기화되었으면 중단

      const table = tableRef.current;
      if (!table) {
        // 100ms 후에 다시 시도
        timeoutId = setTimeout(waitForTable, 100);
        return;
      }

      // 테이블의 thead가 실제로 렌더링되었는지 확인
      const headers = table.querySelectorAll('thead th');
      if (headers.length === 0) {
        timeoutId = setTimeout(waitForTable, 100);
        return;
      }

      isInitialized = true; // 초기화 완료 플래그 설정
      initializeTable(table);
    };

    const initializeTable = (table: HTMLTableElement) => {

    handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !currentColumnRef.current) return;

      const table = tableRef.current;
      if (!table) return;

      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff);

      // 현재 컬럼의 인덱스 찾기
      const headerIndex = Array.from(table.querySelectorAll('th')).indexOf(currentColumnRef.current);
      if (headerIndex < 0) return;

      // 다음 컬럼 찾기 (마지막 컬럼이 아닌 경우)
      const headers = table.querySelectorAll('th');
      const nextHeader = headers[headerIndex + 1] as HTMLElement;

      if (!nextHeader) {
        // 마지막 컬럼인 경우 테이블 너비를 늘리지 않고 리턴
        return;
      }

      // 다음 컬럼의 현재 너비
      const nextWidth = nextHeader.offsetWidth;
      const widthDiff = newWidth - startWidthRef.current;

      // 다음 컬럼의 새 너비 (최소 50px 보장)
      const newNextWidth = nextWidth - widthDiff;
      if (newNextWidth < 50) {
        // 다음 컬럼이 최소 너비보다 작아지면 조절 중단
        return;
      }

      // 현재 컬럼 너비 설정
      currentColumnRef.current.style.width = `${newWidth}px`;
      currentColumnRef.current.style.minWidth = `${newWidth}px`;
      currentColumnRef.current.style.maxWidth = `${newWidth}px`;

      // 다음 컬럼 너비 설정
      nextHeader.style.width = `${newNextWidth}px`;
      nextHeader.style.minWidth = `${newNextWidth}px`;
      nextHeader.style.maxWidth = `${newNextWidth}px`;

      // colgroup이 있는 경우 해당 col 요소도 업데이트
      const colgroup = table.querySelector('colgroup');
      if (colgroup) {
        const cols = colgroup.querySelectorAll('col');

        // 현재 컬럼의 col 업데이트
        if (cols[headerIndex]) {
          const col = cols[headerIndex] as HTMLElement;
          col.style.width = `${newWidth}px`;
          col.style.minWidth = `${newWidth}px`;
          col.style.maxWidth = `${newWidth}px`;
        }

        // 다음 컬럼의 col 업데이트
        if (cols[headerIndex + 1]) {
          const nextCol = cols[headerIndex + 1] as HTMLElement;
          nextCol.style.width = `${newNextWidth}px`;
          nextCol.style.minWidth = `${newNextWidth}px`;
          nextCol.style.maxWidth = `${newNextWidth}px`;
        }
      }

      // 해당 컬럼들의 모든 td도 업데이트
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');

        // 현재 컬럼 td 업데이트
        if (cells[headerIndex]) {
          const cell = cells[headerIndex] as HTMLElement;
          cell.style.width = `${newWidth}px`;
          cell.style.minWidth = `${newWidth}px`;
          cell.style.maxWidth = `${newWidth}px`;
        }

        // 다음 컬럼 td 업데이트
        if (cells[headerIndex + 1]) {
          const nextCell = cells[headerIndex + 1] as HTMLElement;
          nextCell.style.width = `${newNextWidth}px`;
          nextCell.style.minWidth = `${newNextWidth}px`;
          nextCell.style.maxWidth = `${newNextWidth}px`;
        }
      });

      // startWidthRef 업데이트 (연속적인 조절을 위해)
      startWidthRef.current = newWidth;
      startXRef.current = e.clientX;
    };

    handleMouseUp = () => {
      isResizingRef.current = false;
      currentColumnRef.current = null;
      document.body.classList.remove('resizing');

      // 모든 resizer 배경 초기화
      const table = tableRef.current;
      if (table) {
        const allResizers = table.querySelectorAll('.column-resizer');
        allResizers.forEach((r) => {
          (r as HTMLElement).style.background = 'transparent';
        });
      }
    };

    const initializeResizers = () => {
      // 이미 resizer가 추가된 경우 제거
      const existingResizers = table.querySelectorAll('.column-resizer');
      existingResizers.forEach(r => r.remove());

      const headers = table.querySelectorAll('th');
      if (headers.length === 0) return;

      // colgroup이 있는 경우 현재 width를 col 요소에 동기화
      const colgroup = table.querySelector('colgroup');
      if (colgroup) {
        const cols = colgroup.querySelectorAll('col');
        headers.forEach((header, index) => {
          if (cols[index]) {
            const currentWidth = header.offsetWidth;
            const col = cols[index] as HTMLElement;
            col.style.width = `${currentWidth}px`;
            col.style.minWidth = `${currentWidth}px`;
            col.style.maxWidth = `${currentWidth}px`;
          }
        });
      }

      headers.forEach((header, index) => {
        const resizer = document.createElement('div');
        resizer.className = 'column-resizer';
        resizer.style.cssText = `
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: 8px !important;
          height: 100% !important;
          cursor: col-resize !important;
          user-select: none !important;
          z-index: 10 !important;
          background: transparent !important;
        `;

        // hover 효과
        resizer.addEventListener('mouseenter', () => {
          resizer.style.background = 'rgba(0, 123, 255, 0.3)';
        });
        resizer.addEventListener('mouseleave', () => {
          if (!isResizingRef.current) {
            resizer.style.background = 'transparent';
          }
        });

        resizer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          isResizingRef.current = true;
          currentColumnRef.current = header;
          startXRef.current = e.clientX;
          startWidthRef.current = header.offsetWidth;
          document.body.classList.add('resizing');
          resizer.style.background = 'rgba(0, 123, 255, 0.5)';
        });

        // 헤더를 relative position으로 설정 (중요!)
        const headerElement = header as HTMLElement;
        headerElement.style.position = 'relative';
        header.appendChild(resizer);
      });
    };

      // 초기 resizer 생성
      initializeResizers();

      // MutationObserver로 테이블 내용 변경 감지
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.target === table) {
            // 테이블 내용이 변경되면 resizer 재생성
            initializeResizers();
            break;
          }
        }
      });

      observerRef.current = observer;

      // 테이블과 thead 모두 관찰
      observer.observe(table, {
        childList: true,
        subtree: true,
      });

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    // 테이블 대기 시작
    waitForTable();

    return () => {
      // timeout 정리
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (handleMouseMove) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
      if (handleMouseUp) {
        document.removeEventListener('mouseup', handleMouseUp);
      }

      const table = tableRef.current;
      if (table) {
        const headers = table.querySelectorAll('th');
        headers.forEach((header) => {
          const resizer = header.querySelector('.column-resizer');
          if (resizer) {
            resizer.remove();
          }
        });
      }
    };
  }, [tableRef]);
};
