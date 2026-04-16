"use client";

import React from "react";
import Link from "next/link";

interface BoardItemProps {
  subject: string;
  date: string;
  badge?: { type: "complete" | "wait"; text: string };
  href?: string;
}

const BoardItem: React.FC<BoardItemProps> = ({
  subject,
  date,
  badge,
  href = "#",
}) => {
  const content = (
    <>
      {badge && <span className={`badge ${badge.type}`}>{badge.text}</span>}
      <span className="subject">{subject}</span>
      <span className="date">{date}</span>
    </>
  );
  return (
    <li>
      {href && href !== "#" ? (
        <Link href={href} className="boardItem">
          {content}
        </Link>
      ) : (
        <a href={href} className="boardItem">
          {content}
        </a>
      )}
    </li>
  );
};

export default BoardItem;
