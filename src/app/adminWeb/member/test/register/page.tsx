"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/widgets/adminWeb/layout";
import { FileUpload, ImageUpload } from "@/shared/ui/adminWeb";
import { MemberService } from "@/entities/adminWeb/member/api";
import { AuthGroup } from "@/entities/adminWeb/member/api";
import { ApiError } from "@/shared/lib/apiClient";

export default function MemberTestRegisterPage() {
  const router = useRouter();
  const [authList, setAuthList] = useState<AuthGroup[]>([]);
  const [selectedAuth, setSelectedAuth] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 화면 열릴 때 권한 리스트 조회
  useEffect(() => {
    const fetchAuthList = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await MemberService.getAdminRegisterScreen();

        // authList 추출
        let authGroups: AuthGroup[] = [];

        // 1. 응답이 배열인 경우 (직접 배열로 반환)
        if (Array.isArray(response)) {
          authGroups = response;
        }
        // 2. response.authList가 배열인 경우
        else if (response && typeof response === "object") {
          // 다양한 필드명 시도 (우선순위 순)
          const responseAny = response as any;
          const authListData =
            responseAny.authList ||
            responseAny.data?.authList ||
            responseAny.data ||
            responseAny.Array ||
            responseAny.list ||
            responseAny.content ||
            [];

          if (Array.isArray(authListData)) {
            authGroups = authListData;
          } else if (authListData && typeof authListData === "object") {
            // 객체인 경우 배열로 변환 시도
            // 객체의 값들이 배열인지 확인
            const values = Object.values(authListData);
            const arrayValue = values.find((v) => Array.isArray(v));
            if (arrayValue) {
              authGroups = arrayValue as AuthGroup[];
            }
          }
        }

        setAuthList(authGroups);

        // 첫 번째 항목을 기본값으로 설정
        if (authGroups.length > 0) {
          setSelectedAuth(authGroups[0].groupId);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(
            err.message || "권한 리스트를 불러오는 중 오류가 발생했습니다."
          );
        } else {
          setError("권한 리스트를 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAuthList();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("회원 등록");
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">테스트등록</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>관리자</span> &gt;{" "}
          <span>테스트등록</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="text-lg font-semibold mb-0">회원 정보 입력</h5>
        </div>
        <div className="p-0">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-wrap">
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{ border: "1px solid #dee2e6", padding: "5px" }}
                  >
                    아이디 <span className="text-red-600 ml-1">*</span>
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="text"
                      className="w-full border rounded-none px-3 py-2 mr-1"
                      placeholder="아이디를 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                      required
                    />
                    <button
                      className="px-3 py-1 text-sm border border-gray-400 text-gray-700 hover:bg-gray-100 rounded-none whitespace-nowrap"
                      type="button"
                    >
                      중복확인
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      padding: "5px",
                    }}
                  >
                    비밀번호 <span className="text-red-600 ml-1">*</span>
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="password"
                      className="w-full border rounded-none px-3 py-2"
                      placeholder="비밀번호를 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap">
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    비밀번호 확인 <span className="text-red-600 ml-1">*</span>
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="password"
                      className="w-full border rounded-none px-3 py-2"
                      placeholder="비밀번호를 다시 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    이름 <span className="text-red-600 ml-1">*</span>
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="text"
                      className="w-full border rounded-none px-3 py-2"
                      placeholder="이름을 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap">
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    이메일
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="email"
                      className="w-full border rounded-none px-3 py-2"
                      placeholder="이메일을 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    전화번호
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <input
                      type="tel"
                      className="w-full border rounded-none px-3 py-2"
                      placeholder="전화번호를 입력하세요"
                      style={{ border: "1px solid #e0e0e0" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap">
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    권한
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <select
                      className="w-full border rounded-none px-3 py-2"
                      style={{ border: "1px solid #e0e0e0" }}
                      value={selectedAuth}
                      onChange={(e) => setSelectedAuth(e.target.value)}
                      disabled={loading}
                    >
                      {loading ? (
                        <option value="">로딩 중...</option>
                      ) : authList.length === 0 ? (
                        <option value="">권한 목록이 없습니다</option>
                      ) : (
                        authList.map((auth) => (
                          <option key={auth.groupId} value={auth.groupId}>
                            {auth.groupDc}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 register-form-mobile-row">
                <div
                  className="register-form-mobile-wrapper md:flex md:items-stretch"
                  style={{ minHeight: "45px" }}
                >
                  <label
                    className="w-full md:w-1/4 flex items-center m-0 register-form-label bg-gray-100"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    상태
                  </label>
                  <div
                    className="register-form-mobile-field w-full md:w-3/4 flex items-center"
                    style={{
                      border: "1px solid #dee2e6",
                      borderLeft: "none",
                      borderTop: "none",
                      padding: "5px",
                    }}
                  >
                    <div className="inline-flex items-center mb-0 mr-4">
                      <input
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                        type="radio"
                        name="status"
                        id="statusActive"
                        value="active"
                        defaultChecked
                      />
                      <label
                        className="ml-2 text-[13px]"
                        htmlFor="statusActive"
                      >
                        활성
                      </label>
                    </div>
                    <div className="inline-flex items-center mb-0">
                      <input
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                        type="radio"
                        name="status"
                        id="statusInactive"
                        value="inactive"
                      />
                      <label
                        className="ml-2 text-[13px]"
                        htmlFor="statusInactive"
                      >
                        비활성
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <FileUpload label="파일업로드" name="filename1" widthOpt="full" />
            <ImageUpload
              label="이미지업로드"
              name="filename2"
              widthOpt="full"
            />
          </form>
        </div>
      </div>

      <div className="flex justify-end mt-3 gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          style={{ minWidth: "100px" }}
        >
          등록
        </button>
        <button
          type="button"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          style={{ minWidth: "100px" }}
          onClick={() => router.push("/adminWeb/member/test")}
        >
          취소
        </button>
      </div>
    </AdminLayout>
  );
}

