/**
 * 역할 기반 접근 제어 유틸리티
 */

export type UserRole = 'ROLE_ADMIN' | 'ROLE_USER' | 'ROLE_MANAGER';

/**
 * 현재 사용자의 역할 가져오기
 */
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;

  try {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.role || null;
    }
  } catch (error) {
    console.error('Failed to get user role:', error);
  }
  return null;
}

/**
 * 사용자가 특정 역할을 가지고 있는지 확인
 */
export function hasRole(requiredRole: UserRole): boolean {
  const userRole = getUserRole();
  if (!userRole) return false;

  return userRole === requiredRole;
}

/**
 * 사용자가 여러 역할 중 하나라도 가지고 있는지 확인
 */
export function hasAnyRole(requiredRoles: UserRole[]): boolean {
  const userRole = getUserRole();
  if (!userRole) return false;

  return requiredRoles.includes(userRole);
}

/**
 * /adminWeb 경로 접근 권한 확인
 */
export function canAccessAdminPages(): boolean {
  return hasRole('ROLE_ADMIN');
}

/**
 * 페이지별 필요 역할 매핑
 */
export const PAGE_ROLES: Record<string, UserRole[]> = {
  '/adminWeb': ['ROLE_ADMIN'],
  '/adminWeb/member': ['ROLE_ADMIN'],
  '/adminWeb/code': ['ROLE_ADMIN'],
  '/adminWeb/menu': ['ROLE_ADMIN'],
  '/adminWeb/statistics': ['ROLE_ADMIN'],
};

/**
 * 특정 경로에 접근 가능한지 확인
 */
export function canAccessPath(path: string): boolean {
  // /adminWeb으로 시작하는 모든 경로는 ROLE_ADMIN 필요
  if (path.startsWith('/adminWeb')) {
    return hasRole('ROLE_ADMIN');
  }

  // 페이지별 역할 매핑 확인
  for (const [pagePath, roles] of Object.entries(PAGE_ROLES)) {
    if (path.startsWith(pagePath)) {
      return hasAnyRole(roles);
    }
  }

  // 기본적으로 접근 허용
  return true;
}
