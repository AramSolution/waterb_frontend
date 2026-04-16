import { useCallback } from 'react';
import {
  removeKorean,
  alphanumericOnly,
  numericOnly,
  alphabetOnly,
} from '@/shared/lib';

export type FilterType = 'no-korean' | 'alphanumeric' | 'numeric' | 'alphabet' | 'none';

/**
 * 입력 필터링 커스텀 훅
 * @param filterType 필터 타입
 * @returns onChange 핸들러
 */
export const useInputFilter = (filterType: FilterType = 'none') => {
  const filterValue = useCallback(
    (value: string): string => {
      switch (filterType) {
        case 'no-korean':
          return removeKorean(value);
        case 'alphanumeric':
          return alphanumericOnly(value);
        case 'numeric':
          return numericOnly(value);
        case 'alphabet':
          return alphabetOnly(value);
        default:
          return value;
      }
    },
    [filterType]
  );

  return { filterValue };
};
