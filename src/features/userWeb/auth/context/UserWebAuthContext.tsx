"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  Suspense,
} from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { AuthService } from "@/entities/auth/api";
import type { LoginModalType } from "../login/ui";
import dynamic from "next/dynamic";
import { AlertModal } from "@/shared/ui/userWeb/AlertModal";

/** gunsan처럼 로그인 모달은 포털/메인에서만 쓰므로, 라우트별 로드. bizInfoPr 등에서는 이 청크가 없어 loginModal.css 미로드 */
const UserWebLoginModal = dynamic(
  () => import("../login/ui").then((mod) => mod.UserWebLoginModal),
  { ssr: false },
);

const BIZINFO_PATH = "/userWeb/bizInfo";
const USERWEB_INDEX_PATH = "/userWeb";
const MYPAGE_PR_PATH = "/userWeb/mypagePr";

/** 로그인 사용자 구분(SNR/PNR/ANR/MNR) → 배지 라벨 + 테마. 헤더·본문 전반 색상 통일용 */
const USERSE_TO_BADGE_AND_THEME: Record<
  string,
  { badgeLabel: string; themeType: LoginModalType }
> = {
  SNR: { badgeLabel: "학생", themeType: "student" },
  PNR: { badgeLabel: "학부모/일반", themeType: "parent" },
  ANR: { badgeLabel: "학원", themeType: "academy" },
  MNR: { badgeLabel: "멘토", themeType: "mentor" },
};

export type UserWebThemeType = LoginModalType;

interface UserWebAuthContextValue {
  /** 인증 상태를 한 번이라도 확인했는지 (mypagePr 등에서 리다이렉트/표시 판단용) */
  isAuthReady: boolean;
  isAuthenticated: boolean;
  badgeLabel: string;
  /** 로그인 사용자 기준 테마(SNR→student 붉은, PNR→parent 보라 등). 미로그인 시 URL type으로 배지만 결정, 테마는 없음 */
  themeType: UserWebThemeType | undefined;
  loginModalType: LoginModalType | null;
  handleHeaderLoginClick: () => void;
  handleRequireLogin: (redirectPath?: string) => void;
  /** 마이페이지 미로그인 접근 후 메인으로 리다이렉트된 경우, 로그인 모달 표시(로그인 시 마이페이지로 이동) */
  openLoginRequiredForMypageModal: () => void;

  handleLogout: () => void;
}

const UserWebAuthContext = createContext<UserWebAuthContextValue | null>(null);

export function useUserWebAuth(): UserWebAuthContextValue {
  const ctx = useContext(UserWebAuthContext);
  if (!ctx) {
    throw new Error("useUserWebAuth must be used within UserWebAuthProvider");
  }
  return ctx;
}

export function useUserWebAuthOptional(): UserWebAuthContextValue | null {
  return useContext(UserWebAuthContext);
}

/** useSearchParams를 사용하는 내부 컴포넌트 - 반드시 Suspense 내에서 렌더링 */
function UserWebAuthProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [redirectAfterLogin, setRedirectAfterLogin] = useState<string | null>(
    null,
  );

  /** 마운트 시 + pathname 변경 시 인증 재확인 (OAuth 콜백에서 sessionStorage 설정 후 replace로 main 이동해도 헤더에 로그인 상태 반영) */
  useEffect(() => {
    setIsAuthenticated(AuthService.isAuthenticated());
    setIsAuthReady(true);
  }, [pathname]);

  /** 포털 루트(/userWeb) 진입 시 자동 로그아웃 → 학생/학부모 등 영역에서 나와 포털로 오면 비로그인으로 시작 */
  useEffect(() => {
    if (pathname !== USERWEB_INDEX_PATH) return;
    AuthService.logout();
    setIsAuthenticated(false);
  }, [pathname]);

  /** URL 쿼리로 진입 유형 판단 (미로그인 시 로그인 모달 타입용). main 등에서 badge/테마는 페이지가 LayoutWrapper에 직접 전달 */
  const typeParam = searchParams.get("type");
  const reqGbPositionParam = searchParams.get("reqGbPosition");
  const reqGbPosition =
    reqGbPositionParam != null ? parseInt(reqGbPositionParam, 10) : null;
  const validReqGbPosition =
    reqGbPosition != null && reqGbPosition >= 1 && reqGbPosition <= 4
      ? reqGbPosition
      : null;
  const entryType: LoginModalType =
    typeParam === "parent" || validReqGbPosition === 2
      ? "parent"
      : typeParam === "academy" || validReqGbPosition === 3
        ? "academy"
        : typeParam === "mentor" || validReqGbPosition === 4
          ? "mentor"
          : "student";
  const loginModalType: LoginModalType | null = entryType;

  const userSe = AuthService.getUserSe();
  const fromUserSe = userSe ? USERSE_TO_BADGE_AND_THEME[userSe] : null;
  const badgeLabelByEntry: Record<LoginModalType, string> = {
    student: "학생",
    parent: "학부모/일반",
    academy: "학원",
    mentor: "멘토",
  };
  const badgeLabel =
    isAuthenticated && fromUserSe
      ? fromUserSe.badgeLabel
      : badgeLabelByEntry[entryType];
  const themeType: UserWebThemeType | undefined =
    isAuthenticated && fromUserSe ? fromUserSe.themeType : undefined;

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  const handleHeaderLoginClick = useCallback(() => {
    if (entryType === "academy") {
      setRedirectAfterLogin("/userWeb/main?reqGbPosition=3");
    } else if (entryType === "mentor") {
      setRedirectAfterLogin("/userWeb/main?reqGbPosition=4");
    } else {
      // 학생/학부모 로그인은 현재 페이지의 쿼리를 보존해야
      // /userWeb/main?reqGbPosition=1 같은 상태바(학생 main.html) UI가 유지됩니다.
      const q = searchParams.toString();
      const pathWithQuery = q ? `${pathname}?${q}` : pathname;
      setRedirectAfterLogin(pathWithQuery || null);
    }
    openLoginModal();
  }, [openLoginModal, pathname, entryType, searchParams]);

  const handleRequireLogin = useCallback(
    (redirectPath?: string) => {
      setRedirectAfterLogin(redirectPath ?? null);
      openLoginModal();
    },
    [openLoginModal],
  );

  /** MY PAGE 미로그인 클릭 시: "로그인 후 이용해주세요" 모달 표시, 확인 시 /userWeb 이동 */
  const [showMypageLoginRequiredModal, setShowMypageLoginRequiredModal] =
    useState(false);
  const openLoginRequiredForMypageModal = useCallback(() => {
    setShowMypageLoginRequiredModal(true);
  }, []);
  const closeMypageLoginRequiredModal = useCallback(() => {
    setShowMypageLoginRequiredModal(false);
    if (
      pathname?.startsWith("/userWeb/terms") ||
      pathname?.startsWith("/userWeb/joinAc")
    ) {
      return;
    }
    router.push(USERWEB_INDEX_PATH);
  }, [router, pathname]);

  const handleLoginSuccess = useCallback(() => {
    closeLoginModal();
    setIsAuthenticated(true);
  }, [closeLoginModal]);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    router.push(USERWEB_INDEX_PATH);
  }, [router]);

  const value: UserWebAuthContextValue = {
    isAuthReady,
    isAuthenticated,
    badgeLabel,
    themeType,
    loginModalType,
    handleHeaderLoginClick,
    handleRequireLogin,
    openLoginRequiredForMypageModal,
    handleLogout,
  };

  return (
    <UserWebAuthContext.Provider value={value}>
      {children}
      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <UserWebLoginModal
            isOpen={isLoginModalOpen}
            onClose={closeLoginModal}
            loginModalType={loginModalType}
            onSuccess={handleLoginSuccess}
            redirectPath={redirectAfterLogin}
          />
        </Suspense>
      )}
      <AlertModal
        isOpen={showMypageLoginRequiredModal}
        title="안내"
        message="로그인 후 이용해주세요."
        confirmText="확인"
        onConfirm={closeMypageLoginRequiredModal}
      />
    </UserWebAuthContext.Provider>
  );
}

/** useSearchParams 사용으로 인해 Suspense 경계가 필요한 Provider를 래핑 */
export function UserWebAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<>{children}</>}>
      <UserWebAuthProviderInner>{children}</UserWebAuthProviderInner>
    </Suspense>
  );
}
