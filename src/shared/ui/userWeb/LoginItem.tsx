"use client";

import React from "react";

interface LoginItemProps {
  type: "student" | "parent" | "school" | "academy" | "mentor";
  label: string;
  img: string;
  onClick?: (
    e: React.MouseEvent,
    type: "student" | "parent" | "school" | "academy" | "mentor",
  ) => void;
}

const LoginItem: React.FC<LoginItemProps> = ({ type, label, img, onClick }) => {
  return (
    <li>
      <a href="#" className="loginItem" onClick={(e) => onClick?.(e, type)}>
        <span className="imgProfile">
          <img src={img} alt={label} />
        </span>
        <span className="txtLabel">{label}</span>
        <span className="icoNext"></span>
      </a>
    </li>
  );
};

export default LoginItem;
