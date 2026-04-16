'use client';

import React, { useState, useRef } from 'react';
import { useMenuMakeList } from '../model';
import { MenuMakeService, MenuCreatItem } from '@/entities/adminWeb/menu/api';
import { Modal } from '@/shared/ui/adminWeb';
import { ConfirmDialog } from '@/shared/ui/adminWeb/ConfirmDialog';
import { MenuTree, MenuTreeRef } from './MenuTree';
import { ApiError } from '@/shared/lib';
import '@/shared/styles/admin/search-form.css';

export const MenuMakePageView: React.FC = () => {
  const {
    loading,
    isInitialLoad,
    showSearchForm,
    menuMakeList,
    totalElements,
    error,
    searchCondition,
    searchKeyword,
    setShowSearchForm,
    handleSearch,
    setSearchCondition,
    setSearchKeyword,
  } = useMenuMakeList();

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string>('');
  const [selectedAuthorNm, setSelectedAuthorNm] = useState<string>('');
  const [menuTreeItems, setMenuTreeItems] = useState<MenuCreatItem[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string>('');
  const menuTreeRef = useRef<MenuTreeRef>(null);

  // 메시지 다이얼로그 상태
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');
  const [isSaving, setIsSaving] = useState(false);

  // 메뉴생성 버튼 클릭 핸들러
  const handleMenuCreateClick = async (
    authorCode: string,
    authorNm: string,
  ) => {
    setSelectedAuthorCode(authorCode);
    setSelectedAuthorNm(authorNm);
    setIsModalOpen(true);
    setTreeError('');
    setMenuTreeItems([]);

    // 메뉴 트리 데이터 조회
    try {
      setTreeLoading(true);
      const response = await MenuMakeService.getMenuCreatList({
        authorCode: authorCode,
      });

      // API 응답 구조에 맞게 데이터 추출
      let list: MenuCreatItem[] = [];

      if (Array.isArray(response)) {
        list = response;
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          list = response.data;
        } else if (Array.isArray(response.Array)) {
          list = response.Array;
        } else if (Array.isArray(response.list)) {
          list = response.list;
        } else if (Array.isArray(response.content)) {
          list = response.content;
        }
      }

      setMenuTreeItems(list);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setTreeError('인증에 실패했습니다. 다시 로그인해주세요.');
        } else {
          setTreeError(err.message);
        }
      } else {
        setTreeError('메뉴 생성 내역을 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setTreeLoading(false);
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAuthorCode('');
    setSelectedAuthorNm('');
    setMenuTreeItems([]);
    setTreeError('');
  };

  // 수정 버튼 클릭 핸들러
  const handleUpdateClick = async () => {
    if (!menuTreeRef.current) {
      return;
    }

    const checkedMenuNos = menuTreeRef.current.getCheckedMenuNos();

    // 선택된 메뉴가 없으면 메시지 표시
    if (!checkedMenuNos || checkedMenuNos.length === 0) {
      setMessageDialogTitle('알림');
      setMessageDialogMessage('선택된 메뉴가 없습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }

    // 저장 API 호출
    try {
      setIsSaving(true);
      // menuNo를 명시적으로 문자열 배열로 변환
      const menuNoList = checkedMenuNos.map((no) => String(no));
      const response = await MenuMakeService.insertMenuCreatList({
        authorCode: selectedAuthorCode,
        menuNo: menuNoList,
      });

      if (response.result === '00') {
        setMessageDialogTitle('저장 완료');
        setMessageDialogMessage(
          response.resultMessage || '정상적으로 저장되었습니다.',
        );
        setMessageDialogType('success');
        setShowMessageDialog(true);

        // 저장 후 메뉴 트리 데이터 다시 조회
        const refreshResponse = await MenuMakeService.getMenuCreatList({
          authorCode: selectedAuthorCode,
        });

        let list: MenuCreatItem[] = [];
        if (Array.isArray(refreshResponse)) {
          list = refreshResponse;
        } else if (refreshResponse && typeof refreshResponse === 'object') {
          if (Array.isArray(refreshResponse.data)) {
            list = refreshResponse.data;
          } else if (Array.isArray(refreshResponse.Array)) {
            list = refreshResponse.Array;
          } else if (Array.isArray(refreshResponse.list)) {
            list = refreshResponse.list;
          } else if (Array.isArray(refreshResponse.content)) {
            list = refreshResponse.content;
          }
        }
        setMenuTreeItems(list);
      } else {
        setMessageDialogTitle('저장 실패');
        setMessageDialogMessage(
          response.resultMessage || '저장 중 오류가 발생했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle('저장 실패');
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessageDialogMessage('인증에 실패했습니다. 다시 로그인해주세요.');
        } else {
          setMessageDialogMessage(err.message);
        }
      } else {
        setMessageDialogMessage('저장 중 오류가 발생했습니다.');
      }
      setMessageDialogType('danger');
      setShowMessageDialog(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">메뉴생성관리</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt;{' '}
          <span>메뉴생성관리</span>
        </nav>
      </div>

      {/* 모바일 조회조건 토글 버튼 */}
      <div className="md:hidden mb-2">
        <button
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-[13px]"
          onClick={() => setShowSearchForm(!showSearchForm)}
        >
          {showSearchForm ? '▲ 조회조건 닫기' : '▼ 조회조건 열기'}
        </button>
      </div>

      <div
        className={`bg-white mb-3 rounded-lg shadow search-form-container ${
          showSearchForm ? 'show' : ''
        }`}
      >
        <div className="border border-gray-300">
          <div className="flex flex-wrap">
            <div className="w-full md:w-1/2">
              <div
                className="flex flex-col border-b md:flex-row items-stretch"
                style={{ minHeight: '45px' }}
              >
                <label className="w-full md:w-1/4 bg-gray-100 flex items-center m-0 px-3 py-2 search-form-label border-b border-r border-gray-300">
                  검색구분
                </label>
                <div className="w-full md:w-3/4 flex p-2">
                  <select
                    className="input w-1/3 border border-gray-300 px-3 py-2 mr-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="searchCondition"
                    name="searchCondition"
                    value={searchCondition}
                    onChange={(e) => setSearchCondition(e.target.value)}
                  >
                    <option value="1">권한코드</option>
                    <option value="2">권한명</option>
                    <option value="3">권한설명</option>
                  </select>
                  <input
                    type="text"
                    className="flex-1 border border-gray-300 px-3 py-2 ml-1 rounded-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="검색할 내용을 입력하세요"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-3 gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px]"
          style={{ minWidth: '100px' }}
          onClick={handleSearch}
        >
          🔍 조회
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
          <h5 className="mb-0 text-lg font-semibold">
            메뉴생성관리 목록 (총 {totalElements.toLocaleString()}개)
          </h5>
        </div>
        <div className="p-0">
          {loading && isInitialLoad ? (
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full mb-0" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '19%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-gray-50">
                  <tr className="border-b-2">
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      번호
                    </th>
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      권한코드
                    </th>
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      권한명
                    </th>
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      권한설명
                    </th>
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      권한생성일시
                    </th>
                    <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                      메뉴생성여부
                    </th>
                    <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '30px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '80px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '100px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '150px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '120px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3 border-r">
                        <div
                          className="skeleton"
                          style={{
                            width: '60px',
                            height: '16px',
                            margin: '0 auto',
                          }}
                        ></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <div
                            className="skeleton"
                            style={{
                              width: '80px',
                              height: '28px',
                              borderRadius: '4px',
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 뷰 */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full mb-0" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <thead className="bg-gray-100">
                    <tr className="border-t border-b-2">
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        번호
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        권한코드
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        권한명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        권한설명
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        권한생성일시
                      </th>
                      <th className="px-4 py-3 border-r text-center text-[13px] font-bold text-gray-700">
                        메뉴생성여부
                      </th>
                      <th className="px-4 py-3 text-center text-[13px] font-bold text-gray-700">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {menuMakeList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-gray-500"
                        >
                          {loading
                            ? '데이터를 불러오는 중...'
                            : '조회된 데이터가 없습니다.'}
                        </td>
                      </tr>
                    ) : (
                      menuMakeList.map((item, index) => {
                        const rnum = item.rnum || index + 1;
                        const authorCode = item.authorCode || '';
                        const authorNm = item.authorNm || '';
                        const authorDc = item.authorDc || '';
                        const authorCreatDe = item.authorCreatDe || '';
                        const chkYeoBu = item.chkYeoBu || '';

                        return (
                          <tr
                            key={item.authorCode || index}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {rnum}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                              {authorCode}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                              {authorNm}
                            </td>
                            <td className="px-3 py-2 border-r text-left text-[13px] text-gray-900">
                              {authorDc}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {authorCreatDe}
                            </td>
                            <td className="px-3 py-2 border-r text-center text-[13px] text-gray-900">
                              {chkYeoBu}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                onClick={() =>
                                  handleMenuCreateClick(authorCode, authorNm)
                                }
                              >
                                메뉴생성
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 뷰 */}
              <div className="md:hidden">
                {menuMakeList.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {loading
                      ? '데이터를 불러오는 중...'
                      : '조회된 데이터가 없습니다.'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {menuMakeList.map((item, index) => {
                      const rnum = item.rnum || index + 1;
                      const authorCode = item.authorCode || '';
                      const authorNm = item.authorNm || '';
                      const authorDc = item.authorDc || '';
                      const authorCreatDe = item.authorCreatDe || '';
                      const chkYeoBu = item.chkYeoBu || '';

                      return (
                        <div key={item.authorCode || index} className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 mb-1">
                                {authorNm}
                              </div>
                              <div className="text-sm text-gray-600">
                                권한코드: {authorCode}
                              </div>
                            </div>
                            <button
                              className="px-3 py-1 text-[13px] text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors ml-2"
                              onClick={() =>
                                handleMenuCreateClick(authorCode, authorNm)
                              }
                            >
                              메뉴생성
                            </button>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>권한설명: {authorDc}</div>
                            <div>권한생성일시: {authorCreatDe}</div>
                            <div>메뉴생성여부: {chkYeoBu}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 메뉴 생성 모달 */}
      <Modal
        isOpen={isModalOpen}
        title={`메뉴 생성 - ${selectedAuthorNm} (${selectedAuthorCode})`}
        onClose={handleCloseModal}
        size="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1">
            {treeLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">메뉴 목록을 불러오는 중...</p>
              </div>
            ) : treeError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {treeError}
              </div>
            ) : (
              <MenuTree ref={menuTreeRef} items={menuTreeItems} />
            )}
          </div>
          {/* 하단 버튼 영역 */}
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-[13px] disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleUpdateClick}
              disabled={isSaving || treeLoading}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-[13px]"
              onClick={handleCloseModal}
            >
              닫기
            </button>
          </div>
        </div>
      </Modal>

      {/* 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        type={messageDialogType}
        confirmText="확인"
        onConfirm={() => {
          setShowMessageDialog(false);
          if (messageDialogType === 'success') {
            // 저장 성공 시 모달은 열어둠 (사용자가 직접 닫을 수 있도록)
          }
        }}
        onCancel={() => setShowMessageDialog(false)}
      />
    </>
  );
};
