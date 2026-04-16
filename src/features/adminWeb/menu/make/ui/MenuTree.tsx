"use client";

import React, { useState, useImperativeHandle, forwardRef } from "react";
import { MenuCreatItem } from "@/entities/adminWeb/menu/api";

interface MenuTreeProps {
  items: MenuCreatItem[];
  onCheckChange?: (menuNo: string, checked: boolean) => void;
}

export interface MenuTreeRef {
  getCheckedMenuNos: () => string[];
}

interface TreeNode {
  menuNo: string;
  menuNm: string;
  menuOrdr: string;
  upperMenuId: string;
  chkYeoBu: string;
  children: TreeNode[];
  checked: boolean;
}

export const MenuTree = forwardRef<MenuTreeRef, MenuTreeProps>(
  ({ items, onCheckChange }, ref) => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [checkedNodes, setCheckedNodes] = useState<Set<string>>(new Set());

    // 트리 구조로 변환
    const buildTree = (items: MenuCreatItem[]): TreeNode[] => {
      if (items.length === 0) {
        return [];
      }

      const nodeMap = new Map<string, TreeNode>();
      const rootNodes: TreeNode[] = [];

      // 모든 노드 생성
      items.forEach((item, index) => {
        // 대소문자 구분 없이 키 접근 시도
        const menuNo = item.MENU_NO || item.menu_no || item.menuNo || "";
        const menuNm = item.MENU_NM || item.menu_nm || item.menuNm || "";
        const menuOrdr =
          item.MENU_ORDR || item.menu_ordr || item.menuOrdr || "";
        const upperMenuId =
          item.UPPER_MENU_ID || item.upper_menu_id || item.upperMenuId || "";
        const chkYeoBu =
          item.CHK_YEO_BU || item.chk_yeo_bu || item.chkYeoBu || "0";

        const node: TreeNode = {
          menuNo: menuNo,
          menuNm: menuNm,
          menuOrdr: menuOrdr,
          upperMenuId: upperMenuId,
          chkYeoBu: chkYeoBu,
          children: [],
          checked: chkYeoBu === "1" || chkYeoBu === 1,
        };
        nodeMap.set(node.menuNo, node);
      });

      // 트리 구조 구성
      nodeMap.forEach((node) => {
        // upperMenuId가 있고, 빈 문자열이 아니고, "0"이 아니고, nodeMap에 존재하면 자식으로 추가
        if (
          node.upperMenuId &&
          node.upperMenuId !== "" &&
          node.upperMenuId !== "0" &&
          nodeMap.has(node.upperMenuId)
        ) {
          const parent = nodeMap.get(node.upperMenuId);
          if (parent) {
            parent.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      });

      // 자식 노드 정렬
      const sortChildren = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
          const orderA = parseInt(a.menuOrdr) || 0;
          const orderB = parseInt(b.menuOrdr) || 0;
          return orderA - orderB;
        });
        nodes.forEach((node) => {
          if (node.children.length > 0) {
            sortChildren(node.children);
          }
        });
      };

      sortChildren(rootNodes);
      return rootNodes;
    };

    const treeData = React.useMemo(() => buildTree(items), [items]);

    // 초기 체크 상태 설정 및 모든 노드 확장
    React.useEffect(() => {
      const checked = new Set<string>();
      const expanded = new Set<string>();

      const setCheckedRecursive = (nodes: TreeNode[]) => {
        nodes.forEach((node) => {
          if (node.checked) {
            checked.add(node.menuNo);
          }
          // 자식이 있는 노드는 모두 확장
          if (node.children.length > 0) {
            expanded.add(node.menuNo);
            setCheckedRecursive(node.children);
          }
        });
      };

      setCheckedRecursive(treeData);
      setCheckedNodes(checked);
      setExpandedNodes(expanded);
    }, [treeData]);

    const toggleExpand = (menuNo: string) => {
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(menuNo)) {
        newExpanded.delete(menuNo);
      } else {
        newExpanded.add(menuNo);
      }
      setExpandedNodes(newExpanded);
    };

    // 모든 노드를 재귀적으로 수집하는 헬퍼 함수
    const collectAllNodes = (nodes: TreeNode[]): TreeNode[] => {
      const allNodes: TreeNode[] = [];
      const collect = (n: TreeNode) => {
        allNodes.push(n);
        n.children.forEach((child) => collect(child));
      };
      nodes.forEach((node) => collect(node));
      return allNodes;
    };

    const handleCheckChange = (
      menuNo: string,
      checked: boolean,
      node: TreeNode
    ) => {
      const newChecked = new Set(checkedNodes);
      if (checked) {
        newChecked.add(menuNo);
        // 자식 노드도 모두 체크
        const checkChildren = (n: TreeNode) => {
          newChecked.add(n.menuNo);
          n.children.forEach((child) => checkChildren(child));
        };
        node.children.forEach((child) => checkChildren(child));
      } else {
        newChecked.delete(menuNo);
        // 자식 노드도 모두 체크 해제
        const uncheckChildren = (n: TreeNode) => {
          newChecked.delete(n.menuNo);
          n.children.forEach((child) => uncheckChildren(child));
        };
        node.children.forEach((child) => uncheckChildren(child));
      }
      setCheckedNodes(newChecked);
      onCheckChange?.(menuNo, checked);
    };

    // 전체 선택/해제 핸들러
    const handleSelectAll = (checked: boolean) => {
      const allNodes = collectAllNodes(treeData);
      const newChecked = new Set<string>();

      if (checked) {
        // 모든 노드를 체크
        allNodes.forEach((node) => {
          newChecked.add(node.menuNo);
        });
      }
      // checked가 false면 newChecked는 빈 Set이 됨

      setCheckedNodes(newChecked);

      // 각 노드에 대해 onCheckChange 콜백 호출
      allNodes.forEach((node) => {
        onCheckChange?.(node.menuNo, checked);
      });
    };

    const renderTreeNode = (
      node: TreeNode,
      level: number = 0
    ): React.ReactNode => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedNodes.has(node.menuNo);
      const isChecked = checkedNodes.has(node.menuNo);

      return (
        <div key={node.menuNo} className="select-none">
          <div
            className="flex items-center py-1.5 px-2 transition-colors cursor-pointer hover:bg-gray-100"
            style={{ paddingLeft: `${level * 20 + 8}px` }}
          >
            {/* 확장/축소 버튼 */}
            {hasChildren ? (
              <button
                type="button"
                className="mr-1.5 w-5 h-5 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded text-xs font-bold"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.menuNo);
                }}
              >
                {isExpanded ? "−" : "+"}
              </button>
            ) : (
              <span className="mr-1.5 w-5 h-5" />
            )}

            {/* 체크박스 */}
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                handleCheckChange(node.menuNo, e.target.checked, node);
              }}
              onClick={(e) => e.stopPropagation()}
            />

            {/* 메뉴 아이콘 - 기존 스타일과 동일 */}
            <span className="mr-2 flex-shrink-0">
              {hasChildren ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 3H7L8 4H14V13H2V3Z"
                    fill="#FFA500"
                    stroke="#333"
                    strokeWidth="1"
                  />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="2"
                    width="10"
                    height="12"
                    fill="#4285F4"
                    stroke="#333"
                    strokeWidth="1"
                  />
                  <path d="M3 5H13" stroke="#333" strokeWidth="1" />
                </svg>
              )}
            </span>

            {/* 메뉴명 */}
            <span className="text-sm text-gray-700 flex-1 truncate">
              {node.menuNm}
            </span>
          </div>

          {/* 자식 노드 */}
          {hasChildren && isExpanded && (
            <div>
              {node.children.map((child) => renderTreeNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    if (treeData.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          메뉴 데이터가 없습니다.
        </div>
      );
    }

    // 전체 체크박스 상태 계산
    const isAllChecked = React.useMemo(() => {
      if (treeData.length === 0) return false;

      const checkAllNodes = (n: TreeNode): boolean => {
        if (!checkedNodes.has(n.menuNo)) return false;
        return n.children.every((child) => checkAllNodes(child));
      };

      return treeData.every((node) => checkAllNodes(node));
    }, [treeData, checkedNodes]);

    // 부모 컴포넌트에서 선택된 메뉴 번호 목록을 가져올 수 있도록 ref 노출
    useImperativeHandle(ref, () => ({
      getCheckedMenuNos: () => {
        return Array.from(checkedNodes);
      },
    }));

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="p-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
              checked={isAllChecked}
              onChange={(e) => {
                handleSelectAll(e.target.checked);
              }}
            />
            <span className="text-sm font-semibold text-gray-700">
              메뉴목록
            </span>
          </div>
        </div>
        <div className="overflow-y-auto p-2" style={{ maxHeight: "600px" }}>
          {treeData.map((node) => renderTreeNode(node))}
        </div>
      </div>
    );
  }
);
