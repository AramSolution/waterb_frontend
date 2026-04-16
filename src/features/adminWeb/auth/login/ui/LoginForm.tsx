'use client';

import React, { useState } from 'react';
import { useLogin } from '../model';
import { DuplicateLoginDialog } from '@/shared/ui/adminWeb';
import type { LoginRequest } from '@/entities/auth/api';

export function LoginForm() {
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    remember: false,
  });

  const {
    error,
    loading,
    showDuplicateDialog,
    pendingLoginData,
    performLogin,
    handleDuplicateLoginConfirm,
    handleDuplicateLoginCancel,
    setError,
    setLoading,
  } = useLogin();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 입력값 검증
    if (!formData.id || !formData.password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      setLoading(false);
      return;
    }

    const credentials: LoginRequest = {
      id: formData.id,
      password: formData.password,
      remember: formData.remember,
      userSe: "USR",
    };

    await performLogin(credentials, false);
  };

  const handleDuplicateConfirm = async () => {
    if (pendingLoginData) {
      const credentials: LoginRequest = {
        id: pendingLoginData.id,
        password: pendingLoginData.password,
        remember: pendingLoginData.remember,
        userSe: "USR",
      };
      await handleDuplicateLoginConfirm(credentials);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="w-full max-w-md">
        {/* 로그인 카드 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4 shadow-md">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">관리자 시스템</h1>
            <p className="text-blue-50 text-sm">Admin Management System</p>
          </div>

          {/* 폼 영역 */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* 아이디 입력 */}
              <div>
                <label htmlFor="id" className="block text-sm font-semibold text-gray-700 mb-2">
                  아이디
                </label>
                <input
                  type="text"
                  id="id"
                  name="id"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.id}
                  onChange={handleChange}
                  placeholder="아이디를 입력하세요"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              {/* 비밀번호 입력 */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              {/* 로그인 상태 유지 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  name="remember"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                  checked={formData.remember}
                  onChange={handleChange}
                  disabled={loading}
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-700 cursor-pointer select-none">
                  로그인 상태 유지
                </label>
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transform transition duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>
          </div>

          {/* 푸터 */}
          {/*<div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
            <p className="text-xs text-gray-500">
              테스트 계정: <span className="font-semibold text-gray-700">admin</span> / <span className="font-semibold text-gray-700">admin123</span>
            </p>
          </div>*/}
        </div>

        {/* 하단 텍스트 */}
        <p className="text-center text-gray-600 text-sm mt-6">
          © 2025 (주)아람솔루션. All rights reserved.
        </p>
      </div>

      {/* 중복 로그인 다이얼로그 */}
      <DuplicateLoginDialog
        isOpen={showDuplicateDialog}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateLoginCancel}
      />
    </div>
  );
}
