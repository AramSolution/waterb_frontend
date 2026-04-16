"use client";

import React from "react";

interface InfoBannerItemProps {
  type: "intro" | "apply";
  icon: string;
  title: string;
  desc: string;
  image: string;
  linkTitle?: string;
  href?: string;
}

const InfoBannerItem: React.FC<InfoBannerItemProps> = ({
  type,
  icon,
  title,
  desc,
  image,
  linkTitle = "바로가기",
  href = "#",
}) => {
  return (
    <article className={`infoBannerItem ${type}Banner`}>
      <div className="bannerTextWrap">
        <p className="bannerTitle">
          <img src={icon} alt="" aria-hidden="true" />
          {title}
        </p>
        <p className="bannerDesc">{desc}</p>
        <a href={href} className="btnLink" title={`${title} 바로가기`}>
          {linkTitle}
        </a>
      </div>
      <div className="bannerImageWrap">
        <img src={image} alt="" />
      </div>
    </article>
  );
};

export default InfoBannerItem;
