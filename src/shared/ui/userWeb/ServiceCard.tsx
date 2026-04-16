"use client";

import React from "react";

interface ServiceCardProps {
  type: "infoGuide" | "inquiryContact" | "quickMenu";
  title?: string;
  desc?: string;
  charImg?: string;
  quickItems?: Array<{
    img: string;
    imgAlt: string;
    linkText: string;
    linkHref?: string;
    isChat?: boolean;
  }>;
  href?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  type,
  title,
  desc,
  charImg,
  quickItems,
  href = "#",
}) => {
  if (type === "quickMenu") {
    return (
      <div className="serviceCard quickMenu">
        <div className="quickHeader">
          <strong className="quickTitle">Quick Menu</strong>
        </div>
        <div className="quickContent">
          {quickItems?.map((item, index) => (
            <div key={index} className="quickItem">
              {item.isChat ? (
                <div className="talkIcon">
                  <img src={item.img} alt={item.imgAlt} />
                </div>
              ) : (
                <img src={item.img} alt={item.imgAlt} />
              )}
              <a
                href={item.linkHref || "#"}
                className={item.isChat ? "btnChat" : "btnDirect"}
                {...(/^https?:\/\//i.test(item.linkHref || "")
                  ? { target: "_blank" as const, rel: "noopener noreferrer" }
                  : {})}
              >
                {item.linkText}
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <a href={href} className={`serviceCard ${type}`}>
      <div className="cardText">
        <strong className="cardTitle">{title}</strong>
        <p
          className="cardDesc"
          dangerouslySetInnerHTML={{ __html: desc || "" }}
        />
      </div>
      <div className="cardChar">
        <img src={charImg} alt="" aria-hidden="true" />
      </div>
    </a>
  );
};

export default ServiceCard;
