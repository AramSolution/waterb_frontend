'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MenuTreeService, MenuItem } from '@/entities/adminWeb/menu/api';
import { ConfirmDialog } from '@/shared/ui/adminWeb';
import '@/shared/styles/admin/mobile-table.css';

interface MenuNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: MenuNode[];
  expanded?: boolean;
  originalData?: MenuItem;
}

/** 트리에서 펼쳐진 노드만 행으로 펼침 (root는 행으로 내리지 않음) */
function flattenVisibleMenuRows(
  nodes: MenuNode[],
  level: number,
): { node: MenuNode; level: number }[] {
  const out: { node: MenuNode; level: number }[] = [];
  for (const node of nodes) {
    if (node.id === 'root') {
      if (node.children?.length) {
        out.push(...flattenVisibleMenuRows(node.children, level));
      }
      continue;
    }
    out.push({ node, level });
    if (node.children?.length && (node.expanded ?? false)) {
      out.push(...flattenVisibleMenuRows(node.children, level + 1));
    }
  }
  return out;
}

function truncateText(text: string, max: number): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export const MenuTreePageView: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);
  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  const visibleMenuRows = useMemo(
    () => flattenVisibleMenuRows(menuTree, 0),
    [menuTree],
  );

  // 다이얼로그 상태
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogTitle, setMessageDialogTitle] = useState('');
  const [messageDialogMessage, setMessageDialogMessage] = useState('');
  const [messageDialogType, setMessageDialogType] = useState<
    'danger' | 'success'
  >('success');

  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // 삭제 확인 다이얼로그 표시 여부

  // 평면 배열을 트리 구조로 변환
  const buildMenuTree = (items: MenuItem[]): MenuNode[] => {
    if (!items || items.length === 0) {
      return [
        {
          id: 'root',
          name: 'root',
          type: 'folder',
          expanded: true,
          children: [],
        },
      ];
    }

    // root 노드 생성
    const root: MenuNode = {
      id: 'root',
      name: 'root',
      type: 'folder',
      expanded: true,
      children: [],
    };

    // 메뉴 아이템을 Map으로 변환 (빠른 조회를 위해)
    const menuMap = new Map<string, MenuNode>();

    // 모든 메뉴를 노드로 변환
    items.forEach((item) => {
      // SQL에서 UPPER_MENU_NO AS UPPER_MENU_ID로 alias되어 있으므로 UPPER_MENU_ID 사용
      const menuNo = item.MENU_NO || (item as any).menuNo || '';
      const upperMenuId =
        (item as any).UPPER_MENU_ID || item.UPPER_MENU_NO || '';

      if (!menuNo) {
        return;
      }

      menuMap.set(menuNo, {
        id: menuNo,
        name: item.MENU_NM || (item as any).menuNm || '',
        type:
          item.PROGRM_FILE_NM || (item as any).progrmFileNm ? 'file' : 'folder',
        expanded: false,
        children: [],
        originalData: item,
      });
    });

    // 트리 구조 생성
    menuMap.forEach((node, menuNo) => {
      const item = items.find(
        (i) => (i.MENU_NO || (i as any).menuNo) === menuNo,
      )!;

      // SQL에서 UPPER_MENU_NO AS UPPER_MENU_ID로 alias되어 있음
      const upperMenuId =
        (item as any).UPPER_MENU_ID ||
        item.UPPER_MENU_NO ||
        (item as any).upperMenuId ||
        '';

      if (!upperMenuId || upperMenuId === '' || !menuMap.has(upperMenuId)) {
        // 상위 메뉴가 없거나 root인 경우
        root.children!.push(node);
      } else {
        // 상위 메뉴가 있는 경우
        const parent = menuMap.get(upperMenuId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(node);
        }
      }
    });

    // 정렬 (MENU_ORDR 기준)
    const sortChildren = (nodes: MenuNode[]) => {
      nodes.sort((a, b) => {
        const aOrder = parseInt(a.originalData?.MENU_ORDR || '0');
        const bOrder = parseInt(b.originalData?.MENU_ORDR || '0');
        return aOrder - bOrder;
      });
      nodes.forEach((node) => {
        if (node.children) {
          sortChildren(node.children);
        }
      });
    };

    if (root.children) {
      sortChildren(root.children);
    }

    return [root];
  };

  // 메뉴 트리 목록 조회
  const fetchMenuTree = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await MenuTreeService.getMenuTreeList();

      if (response.result === '00') {
        // data가 배열인지 확인
        const dataArray = Array.isArray(response.data)
          ? response.data
          : response.data
            ? [response.data]
            : [];

        if (dataArray.length > 0) {
          const tree = buildMenuTree(dataArray);
          setMenuTree(tree);
        } else {
          setError('메뉴 데이터가 없습니다.');
        }
      } else {
        setError(
          `메뉴 목록을 불러오는데 실패했습니다. (result: ${response.result})`,
        );
      }
    } catch (err) {
      setError('메뉴 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuTree();
  }, []);

  const toggleNode = (nodeId: string, nodes: MenuNode[]): MenuNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      if (node.children) {
        return { ...node, children: toggleNode(nodeId, node.children) };
      }
      return node;
    });
  };

  const handleToggle = (nodeId: string) => {
    setMenuTree((prev) => toggleNode(nodeId, prev));
  };

  const handleNodeClick = (node: MenuNode) => {
    if (node.id === 'root') return;
    setSelectedMenu(node.id);
  };

  // 삭제 확인 (실제 삭제 API 호출)
  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);

    if (!selectedMenu || selectedMenu === 'root') {
      return;
    }

    try {
      const node = findNodeById(menuTree, selectedMenu);
      if (!node || !node.originalData) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('메뉴 정보를 찾을 수 없습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        return;
      }

      const originalData = node.originalData;
      const menuNo = originalData.MENU_NO || (originalData as any).menuNo || '';
      if (!menuNo) {
        setMessageDialogTitle('오류');
        setMessageDialogMessage('메뉴 번호를 찾을 수 없습니다.');
        setMessageDialogType('danger');
        setShowMessageDialog(true);
        return;
      }

      const params = {
        menuNo: menuNo,
      };

      const response = await MenuTreeService.deleteMenu(params);

      if (response.result === '00') {
        setMessageDialogTitle('삭제 완료');
        setMessageDialogMessage('메뉴가 삭제되었습니다.');
        setMessageDialogType('success');
        setShowMessageDialog(true);
        await fetchMenuTree();
        setSelectedMenu(null);
      } else {
        setMessageDialogTitle('오류');
        setMessageDialogMessage(
          response.data?.message || '메뉴 삭제에 실패했습니다.',
        );
        setMessageDialogType('danger');
        setShowMessageDialog(true);
      }
    } catch (err) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('메뉴 삭제 중 오류가 발생했습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
    }
  };

  // 삭제 취소
  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  // 노드 찾기 헬퍼 함수
  const findNodeById = (nodes: MenuNode[], id: string): MenuNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleMessageDialogClose = () => {
    setShowMessageDialog(false);
  };

  /** 최상위 메뉴 행의 「추가」— 행 선택(기존 수정과 동일 동작) */
  const handleAddRowClick = (e: React.MouseEvent, node: MenuNode) => {
    e.stopPropagation();
    handleNodeClick(node);
  };

  const handleDeleteRowClick = (e: React.MouseEvent, node: MenuNode) => {
    e.stopPropagation();
    if (node.id === 'root') return;
    if (!node.originalData) {
      setMessageDialogTitle('오류');
      setMessageDialogMessage('메뉴 정보를 찾을 수 없습니다.');
      setMessageDialogType('danger');
      setShowMessageDialog(true);
      return;
    }
    setSelectedMenu(node.id);
    setShowDeleteDialog(true);
  };

  const handleAuthRowClick = (e: React.MouseEvent, node: MenuNode) => {
    e.stopPropagation();
    if (node.id === 'root') return;
    router.push(`/adminWeb/menu/make?menuNo=${encodeURIComponent(node.id)}`);
  };

  const tableHeaderStyle = { backgroundColor: '#4b5a75' } as const;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">메뉴관리 (트리형)</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>시스템</span> &gt; <span>메뉴관리</span>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
        <div className="flex justify-end items-center gap-2 px-4 py-3 border-b border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-[13px] font-medium text-white rounded-sm border-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 bg-[#8ea2b8] hover:bg-[#7a8fa6] focus-visible:ring-[#7a8fa6]"
          >
            메뉴추가
          </button>
          <button
            type="button"
            className="px-4 py-2 text-[13px] font-medium text-white rounded-sm border-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 bg-[#e84c89] hover:bg-[#d43d7a] focus-visible:ring-[#d43d7a]"
          >
            저장
          </button>
        </div>
        <div className="admin-table-horizontal-scroll overflow-x-auto">
          <table
            className="w-full mb-0 border-collapse"
            style={{ tableLayout: 'fixed', minWidth: '1280px' }}
          >
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '96px' }} />
              <col style={{ width: '112px' }} />
            </colgroup>
            <thead>
              <tr style={tableHeaderStyle}>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  메뉴
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  링크
                </th>
                <th className="text-center text-white text-[13px] font-semibold px-1 py-2.5 border-r border-white/20">
                  메뉴No
                </th>
                <th className="text-center text-white text-[13px] font-semibold px-1 py-2.5 border-r border-white/20">
                  상위메뉴
                </th>
                <th className="text-center text-white text-[13px] font-semibold px-1 py-2.5 border-r border-white/20">
                  메뉴순서
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  메뉴명
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  메뉴파일
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  관련이미지경로
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  관련이미지명
                </th>
                <th className="text-left text-white text-[13px] font-semibold px-2 py-2.5 border-r border-white/20">
                  상세설명
                </th>
                <th className="text-center text-white text-[13px] font-semibold px-1 py-2.5">
                  관리
                </th>
                <th className="text-center text-white text-[13px] font-semibold px-1 py-2.5">
                  권한
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-12 text-gray-500 text-[13px] border-b border-gray-200"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-12 text-red-500 text-[13px] border-b border-gray-200"
                  >
                    {error}
                  </td>
                </tr>
              ) : visibleMenuRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="text-center py-12 text-gray-500 text-[13px] border-b border-gray-200"
                  >
                    메뉴가 없습니다.
                  </td>
                </tr>
              ) : (
                visibleMenuRows.map(({ node, level }, idx) => {
                  const isSelected = selectedMenu === node.id;
                  const hasChildren = !!(node.children && node.children.length > 0);
                  const isExpanded = node.expanded ?? false;
                  const d = node.originalData;
                  const link =
                    d?.PROGRM_FILE_NM || (d as { progrmFileNm?: string })?.progrmFileNm || '';
                  const menuNo = d?.MENU_NO || (d as { menuNo?: string })?.menuNo || '';
                  const upperRaw =
                    (d as { UPPER_MENU_ID?: string })?.UPPER_MENU_ID ||
                    d?.UPPER_MENU_NO ||
                    (d as { upperMenuId?: string })?.upperMenuId ||
                    '';
                  const order = d?.MENU_ORDR || (d as { menuOrdr?: string })?.menuOrdr || '';
                  const nm = d?.MENU_NM || (d as { menuNm?: string })?.menuNm || node.name;
                  const file =
                    d?.PROGRM_FILE_NM || (d as { progrmFileNm?: string })?.progrmFileNm || '';
                  const imgPath =
                    d?.RELATE_IMAGE_PATH ||
                    (d as { relateImagePath?: string })?.relateImagePath ||
                    '';
                  const imgNm =
                    d?.RELATE_IMAGE_NM || (d as { relateImageNm?: string })?.relateImageNm || '';
                  const desc =
                    d?.MENU_DC || (d as { menuDc?: string })?.menuDc || '';
                  const zebra = idx % 2 === 1 ? 'bg-[#f9f9f9]' : 'bg-white';

                  return (
                    <tr
                      key={node.id}
                      className={`border-b border-gray-200 text-[13px] cursor-pointer ${isSelected ? 'bg-blue-50' : zebra}`}
                      onClick={() => handleNodeClick(node)}
                    >
                      <td className="align-middle px-1 py-1.5 border-r border-gray-200">
                        <div
                          className="flex items-center min-h-[28px]"
                          style={{ paddingLeft: `${level * 16 + 4}px` }}
                        >
                          {hasChildren ? (
                            <button
                              type="button"
                              className="mr-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded text-xs font-bold"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggle(node.id);
                              }}
                              aria-label={isExpanded ? '접기' : '펼치기'}
                            >
                              {isExpanded ? '−' : '+'}
                            </button>
                          ) : (
                            <span className="mr-0.5 w-5 h-5 flex-shrink-0 inline-block" />
                          )}
                          <span className="mr-1.5 flex-shrink-0">
                            {node.type === 'folder' ? (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 3H7L8 4H14V13H2V3Z" fill="#FFA500" stroke="#333" strokeWidth="1" />
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="2" width="10" height="12" fill="#4285F4" stroke="#333" strokeWidth="1" />
                                <path d="M3 5H13" stroke="#333" strokeWidth="1" />
                              </svg>
                            )}
                          </span>
                          <span className="truncate text-gray-800" title={nm}>
                            {nm}
                          </span>
                        </div>
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-700 truncate"
                        title={link}
                      >
                        {link || '—'}
                      </td>
                      <td
                        className="align-middle px-1 py-1.5 border-r border-gray-200 text-center text-gray-800 truncate"
                        title={menuNo}
                      >
                        {menuNo || '—'}
                      </td>
                      <td
                        className="align-middle px-1 py-1.5 border-r border-gray-200 text-center text-gray-800 truncate"
                        title={upperRaw}
                      >
                        {upperRaw || '—'}
                      </td>
                      <td
                        className="align-middle px-1 py-1.5 border-r border-gray-200 text-center text-gray-800"
                      >
                        {order || '—'}
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-800 truncate"
                        title={nm}
                      >
                        {nm}
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-700 truncate"
                        title={file}
                      >
                        {file || '—'}
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-700 truncate"
                        title={imgPath}
                      >
                        {imgPath ? truncateText(imgPath, 24) : '—'}
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-700 truncate"
                        title={imgNm}
                      >
                        {imgNm ? truncateText(imgNm, 16) : '—'}
                      </td>
                      <td
                        className="align-middle px-2 py-1.5 border-r border-gray-200 text-gray-600 truncate"
                        title={desc}
                      >
                        {desc ? truncateText(desc, 32) : '—'}
                      </td>
                      <td className="align-middle px-1.5 py-1 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {level === 0 && (
                            <button
                              type="button"
                              className="min-h-[26px] px-2.5 py-0.5 text-[12px] leading-none text-white rounded-sm border-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4373] focus-visible:ring-offset-1 bg-[#3b5998] hover:bg-[#2d4373]"
                              onClick={(e) => handleAddRowClick(e, node)}
                            >
                              추가
                            </button>
                          )}
                          <button
                            type="button"
                            className="min-h-[26px] px-2.5 py-0.5 text-[12px] leading-none text-white rounded-sm border-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b95a3] focus-visible:ring-offset-1 bg-[#aab2bd] hover:bg-[#98a1ad]"
                            onClick={(e) => handleDeleteRowClick(e, node)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                      <td className="align-middle px-1.5 py-1 text-center whitespace-nowrap">
                        <button
                          type="button"
                          className="min-h-[26px] px-2.5 py-0.5 text-[12px] leading-none text-white rounded-sm border-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#245f3a] focus-visible:ring-offset-1 bg-[#2f855a] hover:bg-[#276749]"
                          onClick={(e) => handleAuthRowClick(e, node)}
                        >
                          권한설정
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 메시지 다이얼로그 */}
      <ConfirmDialog
        isOpen={showMessageDialog}
        title={messageDialogTitle}
        message={messageDialogMessage}
        confirmText="확인"
        onConfirm={handleMessageDialogClose}
        onCancel={handleMessageDialogClose}
        type={messageDialogType}
      />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="메뉴 삭제"
        message="정말로 이 메뉴를 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
        useDeleteHeader
      />
    </>
  );
};
