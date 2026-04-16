import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthService,
  LoginRequest,
  LoginResponse,
} from "@/entities/auth/api";
import { ApiError } from "@/shared/lib/apiClient";
import { DuplicateLoginManager } from "@/shared/lib/duplicateLoginManager";

export function useLogin() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  const performLogin = async (
    credentials: LoginRequest,
    forceLogin: boolean = false
  ) => {
    try {
      console.log("Login attempt with:", {
        id: credentials.id,
        userSe: credentials.userSe || "USR",
        forceLogin,
      });

      // API 호출하여 로그인
      const response = await AuthService.login({
        id: credentials.id,
        password: credentials.password,
        remember: credentials.remember,
        userSe: credentials.userSe || "USR",
        forceLogin: forceLogin,
      });

      console.log("Login response received:", response);

      console.log("Login response role:", response.role);

      // 백엔드에서 중복 로그인 감지한 경우
      if (!forceLogin && response.duplicateLogin) {
        // 중복 로그인 다이얼로그 표시
        setPendingLoginData({
          id: credentials.id,
          password: credentials.password,
          remember: credentials.remember,
          existingSessionId: response.existingSessionId,
          role: response.role,
        });
        setShowDuplicateDialog(true);
        setLoading(false);
        return;
      }

      // 로그인 성공 - 관리자 페이지로 이동
      setTimeout(() => {
        router.push("/adminWeb");
      }, 100);
    } catch (err) {
      console.error("Login failed:", err);

      // 로그인 실패 처리
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

  const handleDuplicateLoginConfirm = async (credentials: LoginRequest) => {
    setShowDuplicateDialog(false);
    setLoading(true);
    await performLogin(credentials, true);
  };

  const handleDuplicateLoginCancel = () => {
    setShowDuplicateDialog(false);
    setPendingLoginData(null);
    setLoading(false);
  };

  return {
    error,
    loading,
    showDuplicateDialog,
    pendingLoginData,
    performLogin,
    handleDuplicateLoginConfirm,
    handleDuplicateLoginCancel,
    setError,
    setLoading,
  };
}
