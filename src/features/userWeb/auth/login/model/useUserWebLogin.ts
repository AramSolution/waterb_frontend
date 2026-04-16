import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService, LoginRequest } from "@/entities/auth/api";
import { ApiError } from "@/shared/lib/apiClient";
import {
  clearRememberLoginId,
  saveRememberLoginId,
} from "@/shared/lib/rememberLoginId";

export interface UseUserWebLoginOptions {
  /** 로그인 성공 후 호출 (예: 모달 닫기) */
  onSuccess?: () => void;
  /** 로그인 성공 후 이동할 경로 (미지정 시 /userWeb/main) */
  redirectPath?: string | null;
}

export function useUserWebLogin(options?: UseUserWebLoginOptions) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const performLogin = async (
    credentials: LoginRequest,
    _forceLogin: boolean = false,
  ) => {
    setError("");
    setLoading(true);
    try {
      await AuthService.login({
        id: credentials.id,
        password: credentials.password,
        remember: credentials.remember,
        userSe: credentials.userSe,
        forceLogin: _forceLogin,
      });

      const credUserSe = credentials.userSe;
      if (credentials.remember) {
        saveRememberLoginId(credUserSe, credentials.id);
      } else {
        clearRememberLoginId(credUserSe);
      }

      setLoading(false);
      options?.onSuccess?.();
      /** redirectPath가 포털(/)이거나 없으면 /userWeb/main으로. 학원(ANR)·멘토(MNR)는 reqGbPosition으로 헤더만 학원/멘토 메뉴로 표시 */
      const explicitPath = options?.redirectPath?.trim();
      const isPortalOrEmpty = !explicitPath || explicitPath === "/userWeb";
      const sessionUserSe = AuthService.getUserSe();
      const path =
        explicitPath && !isPortalOrEmpty
          ? explicitPath
          : sessionUserSe === "ANR"
            ? "/userWeb/main?reqGbPosition=3"
            : sessionUserSe === "MNR"
              ? "/userWeb/main?reqGbPosition=4"
              : "/userWeb/main";
      router.push(path);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("아이디 또는 비밀번호가 올바르지 않습니다.");
        } else if (err.status === 408) {
          setError("요청 시간이 초과되었습니다. 다시 시도해주세요.");
        } else if (err.status === 0) {
          setError("서버에 연결할 수 없습니다. 네트워크를 확인해주세요.");
        } else {
          setError(err.message || "로그인 중 오류가 발생했습니다.");
        }
      } else {
        setError("로그인 중 알 수 없는 오류가 발생했습니다.");
      }
      setLoading(false);
    }
  };

  return {
    error,
    loading,
    performLogin,
    setError,
    setLoading,
  };
}
