import { useEffect, RefObject } from 'react';

/**
 * no-korean 클래스를 가진 input 요소에 한글 입력 방지 적용
 * 한글 입력 시도 시 자동으로 영문으로 전환
 */
export const useNoKorean = (ref?: RefObject<HTMLInputElement>) => {
  useEffect(() => {
    const handleComposition = (e: CompositionEvent) => {
      const target = e.target as HTMLInputElement;

      // ref가 있으면 해당 요소만, 없으면 no-korean 클래스를 가진 모든 요소
      const shouldHandle = ref
        ? target === ref.current
        : target.classList.contains('no-korean');

      if (!shouldHandle) return;

      if (e.type === 'compositionstart') {
        // 한글 입력 시작 시 포커스 해제 후 재설정 (IME 초기화)
        e.preventDefault();
        target.blur();
        setTimeout(() => {
          target.focus();
          // 커서를 끝으로 이동
          target.setSelectionRange(target.value.length, target.value.length);
        }, 0);
      } else if (e.type === 'compositionupdate') {
        // 한글 입력 중
        e.preventDefault();
      } else if (e.type === 'compositionend') {
        // 한글 입력 완료 - 한글 제거
        e.preventDefault();
        const value = target.value;
        const filtered = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
        if (value !== filtered) {
          target.value = filtered;
          // React 상태 업데이트를 위한 이벤트 발생
          const inputEvent = new Event('input', { bubbles: true });
          target.dispatchEvent(inputEvent);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;

      const shouldHandle = ref
        ? target === ref.current
        : target.classList.contains('no-korean');

      if (!shouldHandle) return;

      // IME 조합 키 감지 (한글 입력)
      if (e.key === 'Process' || e.keyCode === 229) {
        // 조합 중인 텍스트 제거
        const value = target.value;
        const filtered = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
        if (value !== filtered) {
          target.value = filtered;
          const inputEvent = new Event('input', { bubbles: true });
          target.dispatchEvent(inputEvent);
        }
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;

      const shouldHandle = ref
        ? target === ref.current
        : target.classList.contains('no-korean');

      if (!shouldHandle) return;

      // 입력값에서 한글 실시간 제거
      const value = target.value;
      const filtered = value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '');
      if (value !== filtered) {
        target.value = filtered;
        // 커서 위치 유지
        const cursorPosition = target.selectionStart || 0;
        target.setSelectionRange(cursorPosition, cursorPosition);
      }
    };

    // 이벤트 리스너 등록 (capture phase)
    document.addEventListener('compositionstart', handleComposition, true);
    document.addEventListener('compositionupdate', handleComposition, true);
    document.addEventListener('compositionend', handleComposition, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('input', handleInput, true);

    // 클린업
    return () => {
      document.removeEventListener('compositionstart', handleComposition, true);
      document.removeEventListener('compositionupdate', handleComposition, true);
      document.removeEventListener('compositionend', handleComposition, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('input', handleInput, true);
    };
  }, [ref]);
};
