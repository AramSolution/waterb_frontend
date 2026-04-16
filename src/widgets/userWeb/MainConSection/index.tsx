"use client";

import React, { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { InfoBannerItem } from "@/shared/ui/userWeb";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const IMG = "/images/userWeb";

/** gunsan과 동일: 모든 슬라이드 링크가 탭 순서에 포함되도록 aria-hidden/tabindex 제거 */
function keepSlidesInTabOrder(container: HTMLElement | null) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.querySelectorAll(".swiper-slide").forEach((slide) => {
      slide.removeAttribute("aria-hidden");
    });
    container.querySelectorAll(".linkItem").forEach((link) => {
      link.removeAttribute("tabindex");
    });
  });
}

/** gunsan과 동일: 링크에 포커스 시 해당 슬라이드로 전환하여 해당 페이지를 보여줌 */
function attachSlideFocusHandler(
  container: HTMLElement | null,
  onSlideFocus: (index: number) => void,
) {
  if (!container) return;
  const handler = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (!target.matches(".linkItem")) return;
    const slideIndex = target
      .closest(".visualItem")
      ?.getAttribute("data-slide-index");
    if (slideIndex != null) {
      const index = parseInt(slideIndex, 10);
      if (!Number.isNaN(index)) onSlideFocus(index);
    }
  };
  container.removeEventListener("focusin", handler as EventListener);
  container.addEventListener("focusin", handler as EventListener);
}

const MainConSection: React.FC = () => {
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);
  const swiperRef = useRef<SwiperType | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAutoplayToggle = () => {
    if (swiperRef.current) {
      if (isAutoplayPaused) {
        swiperRef.current.autoplay?.start();
        setIsAutoplayPaused(false);
      } else {
        swiperRef.current.autoplay?.stop();
        setIsAutoplayPaused(true);
      }
    }
  };

  const bannerItems = [
    {
      type: "intro" as const,
      icon: `${IMG}/icon/ico_banner_intro.png`,
      title: "꿈이음센터 소개",
      desc: "함께 만들어가는 교육, 꿈이음센터를 소개합니다",
      image: `${IMG}/img_banner_intro.png`,
    },
    {
      type: "apply" as const,
      icon: `${IMG}/icon/ico_banner_tutorial.png`,
      title: "교육신청방법",
      desc: "교육 신청 과정을 빠르고 쉽게 안내합니다",
      image: `${IMG}/img_banner_tutorial.png`,
    },
  ];

  return (
    <section className="mainCon">
      <div className="inner">
        <div className="flex-sb">
          <div
            ref={containerRef}
            className="mainSwiper swiper"
            aria-roledescription="carousel"
            aria-label="주요 소식 슬라이드"
          >
            <Swiper
              onSwiper={(swiper) => {
                swiperRef.current = swiper;
                keepSlidesInTabOrder(containerRef.current);
                attachSlideFocusHandler(containerRef.current, (index) => {
                  // 루프 모드에서는 slideToLoop로 실제 슬라이드(0, 1)로 전환해야 화면이 바뀜
                  swiperRef.current?.slideToLoop(index, 600);
                });
              }}
              onSlideChangeTransitionEnd={() => {
                keepSlidesInTabOrder(containerRef.current);
              }}
              modules={[Autoplay, Navigation, Pagination]}
              loop={true}
              speed={600}
              autoplay={{
                delay: 5000,
                disableOnInteraction: false,
              }}
              pagination={{
                el: ".swiperPagination",
                type: "fraction",
                renderFraction: function (currentClass, totalClass) {
                  return (
                    '<span class="' +
                    currentClass +
                    '"></span>' +
                    " / " +
                    '<span class="' +
                    totalClass +
                    '"></span>'
                  );
                },
              }}
              navigation={{
                nextEl: ".btnNext",
                prevEl: ".btnPrev",
              }}
              a11y={{
                prevSlideMessage: "이전 슬라이드",
                nextSlideMessage: "다음 슬라이드",
                firstSlideMessage: "첫 번째 슬라이드입니다",
                lastSlideMessage: "마지막 슬라이드입니다",
              }}
            >
              <SwiperSlide
                className="visualItem"
                role="group"
                aria-roledescription="slide"
                aria-label="1/2"
                data-slide-index="0"
              >
                <a href="#" className="linkItem">
                  <img src={`${IMG}/img_slide_1.png`} alt="" />
                </a>
              </SwiperSlide>
              <SwiperSlide
                className="visualItem"
                role="group"
                aria-roledescription="slide"
                aria-label="2/2"
                data-slide-index="1"
              >
                <a href="#" className="linkItem">
                  <img src={`${IMG}/img_slide_2.png`} alt="" />
                </a>
              </SwiperSlide>
            </Swiper>
            <div className="swiperControlWrap">
              <div className="swiperPagination" aria-live="polite" />
              <div className="swiperButtons">
                <button type="button" className="btnPrev" title="이전 슬라이드">
                  <img src={`${IMG}/icon/ico_swiper_prev.png`} alt="이전" />
                </button>
                <button
                  type="button"
                  className={`btnAutoPlay ${isAutoplayPaused ? "play" : "pause"}`}
                  title={isAutoplayPaused ? "자동재생 시작" : "자동재생 정지"}
                  aria-label={
                    isAutoplayPaused ? "자동재생 시작" : "자동재생 정지"
                  }
                  onClick={handleAutoplayToggle}
                >
                  <img
                    src={
                      isAutoplayPaused
                        ? `${IMG}/icon/ico_play.png`
                        : `${IMG}/icon/ico_pause.png`
                    }
                    alt=""
                    className="icoState"
                    aria-hidden="true"
                  />
                </button>
                <button type="button" className="btnNext" title="다음 슬라이드">
                  <img src={`${IMG}/icon/ico_swiper_next.png`} alt="다음" />
                </button>
              </div>
            </div>
          </div>
          <div className="infoBannerSection">
            <div className="innerContainer">
              {bannerItems.map((item, index) => (
                <InfoBannerItem
                  key={index}
                  type={item.type}
                  icon={item.icon}
                  title={item.title}
                  desc={item.desc}
                  image={item.image}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MainConSection;
