"use client";

import { LayoutWrapper } from "@/widgets/userWeb/layout";

export default function UserWebIntroPage() {
  return (
    <LayoutWrapper headerType="portal">
      <div className="portalTxtBox">
        <div className="txt1">함께 만들어가는 열린 교육의 장</div>
        <div className="txt2">
          <b>홈페이지</b>
        </div>
      </div>

      <div className="introContainer">
        <div className="inner">
          <div className="introTop">
            <div className="textWrap">
              <span className="subTitle">Where Dreams Grow</span>
              <div className="mainTitle">꿈을 꾸는 아이들, 꿈을 잇는 군산</div>
              <p className="desc">우리 아이의 성장이 군산의 자부심이 됩니다</p>
            </div>
            <div className="illustWrap">
              <img
                src="/images/img_illust_character.png"
                alt="책을 든 아이들 캐릭터"
              />
            </div>
          </div>
          <div className="introBottom">
            <div className="mainImgWrap">
              <img
                src="/images/img_main_photo.png"
                alt="수업 중인 교사와 아이들"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="serviceContainer">
        <div className="inner">
          <div className="serviceHeader">
            <div className="subTitle">영유아 부터 고등학생까지</div>
            <div className="mainTitle">
              우리 아이들의 모든 순간을 군산시가 함께합니다
            </div>
          </div>
          <div className="serviceGrid">
            <article className="serviceCard">
              <div className="cardIcon">
                <img src="/images/img_collect.png" alt="모으다 아이콘" />
              </div>
              <div className="cardInfo">
                <div className="titleArea">
                  <strong className="cardTitle">모으다</strong>
                  <span className="serviceBadge blue">Collect</span>
                </div>
                <p className="cardDesc">
                  교육, 복지, 체험 등 군산의 모든 정보를 한곳에
                </p>
              </div>
            </article>

            <article className="serviceCard">
              <div className="cardIcon">
                <img src="/images/img_link.png" alt="잇다 아이콘" />
              </div>
              <div className="cardInfo">
                <div className="titleArea">
                  <strong className="cardTitle">잇다</strong>
                  <span className="serviceBadge orange">Link</span>
                </div>
                <p className="cardDesc">시민과 정책을 쉽고 빠르게 연결합니다</p>
              </div>
            </article>

            <article className="serviceCard">
              <div className="cardIcon">
                <img src="/images/img_fill.png" alt="채우다 아이콘" />
              </div>
              <div className="cardInfo">
                <div className="titleArea">
                  <strong className="cardTitle">채우다</strong>
                  <span className="serviceBadge purple">Fill</span>
                </div>
                <p className="cardDesc">
                  아이들의 일상을 풍성한 혜택으로 채웁니다
                </p>
              </div>
            </article>

            <article className="serviceCard">
              <div className="cardIcon">
                <img src="/images/img_grow.png" alt="성장하다 아이콘" />
              </div>
              <div className="cardInfo">
                <div className="titleArea">
                  <strong className="cardTitle">성장하다</strong>
                  <span className="serviceBadge green">Grow</span>
                </div>
                <p className="cardDesc">
                  모두가 함께 성장하는 행복한 교육 도시 군산
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className="symbolContainer">
        <div className="inner">
          <div className="symbolHeader">
            <div className="subTitle">꿈을 향해 오르는 사다리</div>
            <div className="mainTitle">
              빛나는 도전과 사회의 든든한 지지가 만나 내일의 별을 만듭니다
            </div>
          </div>
          <div className="symbolWrap">
            <img src="/images/img_symbol.png" alt="심볼" />
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}

