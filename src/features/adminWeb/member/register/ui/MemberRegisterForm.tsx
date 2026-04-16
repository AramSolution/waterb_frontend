"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/shared/ui/adminWeb";
import {
  FormField,
  FormInput,
  FormSelect,
  FormRadioGroup,
} from "@/shared/ui/adminWeb/form";
import { useMemberRegister } from "../model";

export const MemberRegisterForm: React.FC = () => {
  const router = useRouter();
  const {
    authList,
    formData,
    loading,
    error,
    errors,
    showMessageDialog,
    messageDialogTitle,
    messageDialogMessage,
    messageDialogType,
    handleInputChange,
    handleRadioChange,
    handleSubmit,
    handleMessageDialogClose,
  } = useMemberRegister();

  // 권한 목록을 SelectOption 형식으로 변환
  const authOptions = authList.map((auth) => ({
    value: auth.groupId,
    label: auth.groupDc,
  }));

  // 상태 옵션
  const statusOptions = [
    { value: "A", label: "대기" },
    { value: "P", label: "사용" },
    { value: "D", label: "탈퇴" },
  ];

  // 잠금여부 라디오 옵션
  const lockOptions = [
    { value: "Y", label: "예", disabled: true },
    { value: "N", label: "아니오", disabled: false },
  ];

  return (
    <>
      {error && <div className="p-6 text-center text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} noValidate>
        {/* 아이디 + 상태 */}
        <div className="flex flex-wrap">
          <FormField
            label="아이디"
            required
            isFirstRow
            isFirstInRow
            error={errors.userId}
          >
            <FormInput
              type="text"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              error={errors.userId}
              placeholder="아이디를 입력하세요"
              maxLength={60}
            />
          </FormField>
          <FormField label="상태" required isFirstInRow>
            <FormSelect
              name="mberSttus"
              value={formData.mberSttus}
              onChange={handleInputChange}
              options={statusOptions}
              required
            />
          </FormField>
        </div>

        {/* 비밀번호 + 비밀번호 확인 */}
        <div className="flex flex-wrap">
          <FormField
            label="비밀번호"
            required
            error={errors.password}
          >
            <FormInput
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              error={errors.password}
              placeholder="비밀번호를 입력하세요"
              maxLength={200}
            />
          </FormField>
          <FormField
            label="비밀번호 확인"
            required
            isFirstInRow
            forceTopBorder
            error={errors.passwordConfirm}
          >
            <FormInput
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleInputChange}
              error={errors.passwordConfirm}
              placeholder="비밀번호를 다시 입력하세요"
              maxLength={200}
            />
          </FormField>
        </div>

        {/* 회원명 + 사무실번호 */}
        <div className="flex flex-wrap">
          <FormField
            label="회원명"
            required
            error={errors.userNm}
          >
            <FormInput
              type="text"
              name="userNm"
              value={formData.userNm}
              onChange={handleInputChange}
              error={errors.userNm}
              placeholder="회원명을 입력하세요"
              maxLength={50}
            />
          </FormField>
          <FormField
            label="사무실번호"
            isFirstInRow
          >
            <FormInput
              type="tel"
              name="usrTelno"
              value={formData.usrTelno}
              onChange={handleInputChange}
              placeholder="사무실번호를 입력하세요"
              maxLength={20}
            />
          </FormField>
        </div>

        {/* 연락처 + 이메일 */}
        <div className="flex flex-wrap">
          <FormField
            label="연락처"
            required
            error={errors.mbtlnum}
          >
            <FormInput
              type="tel"
              name="mbtlnum"
              value={formData.mbtlnum}
              onChange={handleInputChange}
              error={errors.mbtlnum}
              placeholder="연락처를 입력하세요"
              maxLength={20}
            />
          </FormField>
          <FormField
            label="이메일"
            required
            isFirstInRow
            error={errors.emailAdres}
          >
            <FormInput
              type="email"
              name="emailAdres"
              value={formData.emailAdres}
              onChange={handleInputChange}
              error={errors.emailAdres}
              placeholder="이메일을 입력하세요"
              maxLength={60}
            />
          </FormField>
        </div>

        {/* 권한 + 빈 칸: 이메일 행과 동일 2열 그리드 */}
        <div className="flex flex-wrap">
          <FormField label="권한">
            <FormSelect
              name="groupId"
              value={formData.groupId}
              onChange={handleInputChange}
              options={authOptions}
              loading={loading}
              loadingText="로딩 중..."
              emptyText="권한 목록이 없습니다"
              required
            />
          </FormField>
          <FormField label="">
            <div className="w-full h-full" />
          </FormField>
        </div>

        {/* 가입일 + 탈퇴일 */}
        <div className="flex flex-wrap">
          <FormField label="가입일">
            <FormInput
              type="date"
              name="sbscrbDe"
              value={formData.sbscrbDe}
              onChange={handleInputChange}
              required
            />
          </FormField>
          <FormField label="탈퇴일" isFirstInRow>
            <FormInput
              type="text"
              name="secsnDe"
              value={formData.secsnDe}
              onChange={handleInputChange}
              readOnly
            />
          </FormField>
        </div>

        {/* 잠금여부 + 잠금일자 */}
        <div className="flex flex-wrap">
          <FormField label="잠금여부">
            <FormRadioGroup
              name="lockAt"
              value={formData.lockAt}
              onChange={handleRadioChange}
              options={lockOptions}
            />
          </FormField>
          <FormField label="잠금일자" isFirstInRow>
            <FormInput
              type="text"
              name="lockLastPnttm"
              value={formData.lockLastPnttm}
              onChange={handleInputChange}
              readOnly
            />
          </FormField>
        </div>

        <div className="flex justify-end mt-3 gap-2 px-6 py-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ minWidth: "100px" }}
            disabled={loading}
          >
            {loading ? "등록 중..." : "등록"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            style={{ minWidth: "100px" }}
            onClick={() => router.push("/adminWeb/member/list")}
          >
            닫기
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        confirmText="확인"
        type={messageDialogType}
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
      />
    </>
  );
};
