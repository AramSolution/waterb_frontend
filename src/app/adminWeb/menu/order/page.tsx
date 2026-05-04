'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';
import { ConfirmDialog } from '@/shared/ui/adminWeb';

interface MenuItem {
  id: number;
  name: string;
  order: number;
}

export default function MenuOrderPage() {
  const [menus, setMenus] = useState<MenuItem[]>([
    { id: 1, name: '회원관리', order: 1 },
    { id: 2, name: '코드관리', order: 2 },
    { id: 3, name: '메뉴관리', order: 3 },
  ]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newMenus = [...menus];
    [newMenus[index - 1], newMenus[index]] = [newMenus[index], newMenus[index - 1]];
    setMenus(newMenus);
  };

  const moveDown = (index: number) => {
    if (index === menus.length - 1) return;
    const newMenus = [...menus];
    [newMenus[index], newMenus[index + 1]] = [newMenus[index + 1], newMenus[index]];
    setMenus(newMenus);
  };

  const handleSave = () => {
    console.log('메뉴 순서 저장', menus);
    setShowSuccessDialog(true);
  };

  const handleDialogClose = () => {
    setShowSuccessDialog(false);
  };

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">메뉴순서</h1>
        <nav className="breadcrumb">
          <span>홈</span> / <span>메뉴관리</span> / <span>메뉴순서</span>
        </nav>
      </div>

      <div className="bg-white rounded shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h5 className="m-0 text-lg font-semibold">메뉴 순서 조정</h5>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4">
            <strong>안내:</strong> 위/아래 버튼을 클릭하여 메뉴의 순서를 조정할 수 있습니다.
          </div>

          <div className="mb-4 border border-gray-200 rounded overflow-hidden">
            {menus.map((menu, index) => (
              <div
                key={menu.id}
                className="flex justify-between items-center px-4 py-3 border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50"
              >
                <div>
                  <strong>{index + 1}.</strong> {menu.name}
                </div>
                <div className="inline-flex rounded shadow-sm" role="group">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-l hover:bg-blue-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                  >
                    ▲ 위로
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 border-l-0 rounded-r hover:bg-blue-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    onClick={() => moveDown(index)}
                    disabled={index === menus.length - 1}
                  >
                    ▼ 아래로
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleSave}
            >
              순서 저장
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showSuccessDialog}
        title="저장 완료"
        message="메뉴 순서가 성공적으로 저장되었습니다."
        confirmText="확인"
        type="success"
        onConfirm={handleDialogClose}
        onCancel={handleDialogClose}
      />
    </AdminLayout>
  );
}
