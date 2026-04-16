"use client";

import React from "react";
import Link from "next/link";
import { BoardItem } from "@/shared/ui/userWeb";

const IMG = "/images/userWeb";

interface BoardItemEntry {
  subject: string;
  date: string;
  href?: string;
}

interface MainBoardSectionProps {
  noticeItems?: BoardItemEntry[];
  projectItems?: BoardItemEntry[];
}

const EMPTY_ENTRY: BoardItemEntry = { subject: "", date: "" };
const DISPLAY_COUNT = 5;

/** 항상 5칸 유지: 부족분은 빈 항목으로 채움 */
function padToFive(items: BoardItemEntry[]): BoardItemEntry[] {
  const list = [...items];
  while (list.length < DISPLAY_COUNT) {
    list.push(EMPTY_ENTRY);
  }
  return list.slice(0, DISPLAY_COUNT);
}

const MainBoardSection: React.FC<MainBoardSectionProps> = ({
  noticeItems = [],
  projectItems = [],
}) => {
  const notices = padToFive(noticeItems);
  const projects = padToFive(projectItems);

  return (
    <section className="mainBoard">
      <div className="boardSection">
        <div className="innerContainer inner">
          <article className="boardBox">
            <div className="boardHeader">
              <h2 className="boardTitle">공지사항</h2>
              <Link
                href="/userWeb/community?tab=notice"
                className="btnMore"
                title="공지사항 더보기"
              >
                MORE <span className="plus">+</span>
              </Link>
              <div className="charDecor" aria-hidden="true">
                <img src={`${IMG}/img_char_notice.png`} alt="" />
              </div>
            </div>
            <ul className="boardList">
              {notices.map((item, index) => (
                <BoardItem
                  key={`n-${index}`}
                  subject={item.subject}
                  date={item.date}
                  href={
                    item.subject || item.href
                      ? (item.href ?? `/userWeb/community?tab=notice`)
                      : "#"
                  }
                />
              ))}
            </ul>
          </article>
          <article className="boardBox">
            <div className="boardHeader">
              <h2 className="boardTitle">지원사업</h2>
              <Link
                href="/userWeb/community?tab=project"
                className="btnMore"
                title="지원사업 더보기"
              >
                MORE <span className="plus">+</span>
              </Link>
              <div className="charDecor" aria-hidden="true">
                <img src={`${IMG}/img_char_biz.png`} alt="" />
              </div>
            </div>
            <ul className="boardList">
              {projects.map((item, index) => (
                <BoardItem
                  key={`p-${index}`}
                  subject={item.subject}
                  date={item.date}
                  href={
                    item.subject || item.href
                      ? (item.href ?? `/userWeb/community?tab=project`)
                      : "#"
                  }
                />
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
};

export default MainBoardSection;
