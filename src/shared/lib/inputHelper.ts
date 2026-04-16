/**
 * 입력 필드 헬퍼 유틸리티
 */

/**
 * 한글 입력 방지 이벤트 핸들러 등록
 * no-korean 클래스를 가진 input 요소에 자동으로 적용
 */
export const initNoKoreanInputs = () => {
  if (typeof window === 'undefined') return;

  const handleCompositionStart = (e: CompositionEvent) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('no-korean')) {
      e.preventDefault();
      // IME 입력 취소
      target.blur();
      setTimeout(() => target.focus(), 0);
    }
  };

  const handleCompositionUpdate = (e: CompositionEvent) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('no-korean')) {
      e.preventDefault();
    }
  };

  const handleCompositionEnd = (e: CompositionEvent) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('no-korean')) {
      e.preventDefault();
      // 한글이 입력되었다면 제거
      const value = target.value;
      const filtered = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
      if (value !== filtered) {
        target.value = filtered;
        // React의 상태 업데이트를 위해 input 이벤트 발생
        const event = new Event('input', { bubbles: true });
        target.dispatchEvent(event);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLInputElement;
    if (target.classList.contains('no-korean')) {
      // 한글 키 입력 감지 (Process 키)
      if (e.key === 'Process' || e.keyCode === 229) {
        // IME 조합 중
        e.preventDefault();
        return false;
      }
    }
  };

  // 이벤트 리스너 등록
  document.addEventListener('compositionstart', handleCompositionStart, true);
  document.addEventListener('compositionupdate', handleCompositionUpdate, true);
  document.addEventListener('compositionend', handleCompositionEnd, true);
  document.addEventListener('keydown', handleKeyDown, true);

  // 클린업 함수 반환
  return () => {
    document.removeEventListener('compositionstart', handleCompositionStart, true);
    document.removeEventListener('compositionupdate', handleCompositionUpdate, true);
    document.removeEventListener('compositionend', handleCompositionEnd, true);
    document.removeEventListener('keydown', handleKeyDown, true);
  };
};

/**
 * 개별 input 요소에 한글 입력 방지 적용
 */
export const applyNoKoreanInput = (input: HTMLInputElement) => {
  const handleCompositionStart = (e: Event) => {
    e.preventDefault();
    input.blur();
    setTimeout(() => input.focus(), 0);
  };

  const handleCompositionUpdate = (e: Event) => {
    e.preventDefault();
  };

  const handleCompositionEnd = (e: Event) => {
    e.preventDefault();
    const value = input.value;
    const filtered = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
    if (value !== filtered) {
      input.value = filtered;
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Process' || e.keyCode === 229) {
      e.preventDefault();
      return false;
    }
  };

  input.addEventListener('compositionstart', handleCompositionStart);
  input.addEventListener('compositionupdate', handleCompositionUpdate);
  input.addEventListener('compositionend', handleCompositionEnd);
  input.addEventListener('keydown', handleKeyDown);

  // 클린업 함수 반환
  return () => {
    input.removeEventListener('compositionstart', handleCompositionStart);
    input.removeEventListener('compositionupdate', handleCompositionUpdate);
    input.removeEventListener('compositionend', handleCompositionEnd);
    input.removeEventListener('keydown', handleKeyDown);
  };
};
