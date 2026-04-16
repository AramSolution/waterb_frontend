"use client";

import { LayoutWrapper } from "@/widgets/userWeb/layout";

/** source/gunsan/schedule.html 본문과 동일 구조·클래스 (이미지: public/images/userWeb/) */
export default function UserWebSchedulePage() {
  return (
    <LayoutWrapper headerType="portal">
      <div className="portalTxtBox">
        <div className="txt1">
          초등부터 고등까지, 꿈을 잇는 맞춤형 교육 복지 로드맵
        </div>
        <div className="txt2">
          한눈에 파악하는 <b>생애주기별 교육 지원</b>
        </div>
      </div>
      <div className="roadmapContainer">
        <div className="scheduleImg">
          <img src="/images/userWeb/img_schedule_top.png" alt="" />
        </div>
        <div className="roadmapWrapper">
          <div className="roadmapHeader">
            <div className="headerTitle">사업명</div>
            <div className="headerGrades">
              <span>초1</span>
              <span>초2</span>
              <span>초3</span>
              <span>초4</span>
              <span>초5</span>
              <span>초6</span>
              <span className="middleGrade">중1</span>
              <span className="middleGrade">중2</span>
              <span className="middleGrade">중3</span>
              <span className="highGrade">고1</span>
              <span className="highGrade">고2</span>
              <span className="highGrade">고3</span>
            </div>
          </div>
          <div className="roadmapBody">
            <div className="roadmapRow">
              <div className="projectName">· 우리아이 꿈탐험 지원사업</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "1 / 2" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 군산학 어린이 교실</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "3 / 4" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 1:1 원어민 화상영어</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "3 / 7" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">
                · 방학중 건강도시락 지원
                <br />
                · 늘봄 배움터
                <br />· 초등학교 특성화 프로그램 지원
              </div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "1 / 7" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 원어민 보조교사</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "1 / 7" }} />
                <div className="bar barMiddle" style={{ gridColumn: "7 / 10" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 마중물스터디</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "5 / 7" }} />
                <div className="bar barMiddle" style={{ gridColumn: "7 / 10" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 공공형 진로진학 컨설팅</div>
              <div className="projectTimeline">
                <div className="bar barElem" style={{ gridColumn: "4 / 7" }} />
                <div className="bar barMiddle" style={{ gridColumn: "7 / 10" }} />
                <div className="bar barHigh" style={{ gridColumn: "10 / 13" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 찾아가는 중학생 진로체험</div>
              <div className="projectTimeline">
                <div
                  className="bar barMiddle"
                  style={{ gridColumn: "7 / 8" }}
                />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 자기신청장학금</div>
              <div className="projectTimeline">
                <div
                  className="bar barMiddle"
                  style={{ gridColumn: "8 / 9" }}
                />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">
                · 농촌학교 통학비 지원
                <br />· 찾아가는 지역인물 도서관
              </div>
              <div className="projectTimeline">
                <div
                  className="bar barMiddle"
                  style={{ gridColumn: "7 / 10" }}
                />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">
                · 공부의명수
                <br />· 청소년 인생등대
                <br />· 희망스터디
                <br />· 예체능 지역인재 장학금
                <br />· 과학문화융합 교육과정 동아리
                <br />· 플라즈마스쿨
                <br />· 방과후 맞춤형 프로그램
              </div>
              <div className="projectTimeline">
                <div
                  className="bar barMiddle"
                  style={{ gridColumn: "7 / 10" }}
                />
                <div className="bar barHigh" style={{ gridColumn: "10 / 13" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 으뜸성장 장학금</div>
              <div className="projectTimeline">
                <div
                  className="bar barMiddle"
                  style={{ gridColumn: "9 / 10" }}
                />
                <div className="bar barHigh" style={{ gridColumn: "11 / 12" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">· 글로벌 문화탐방</div>
              <div className="projectTimeline">
                <div className="bar barHigh" style={{ gridColumn: "10 / 12" }} />
              </div>
            </div>
            <div className="roadmapRow">
              <div className="projectName">
                · 과학문화융합 교육과정 운영
                <br />
                · 고교창의적 역량강화
                <br />· 청소년 인문학 아카데미
              </div>
              <div className="projectTimeline">
                <div className="bar barHigh" style={{ gridColumn: "10 / 13" }} />
              </div>
            </div>
          </div>
          <div className="roadmapLegend">
            <div className="legendItem">
              <span className="dot dotElem" /> 초등
            </div>
            <div className="legendItem">
              <span className="dot dotMiddle" /> 중등
            </div>
            <div className="legendItem">
              <span className="dot dotHigh" /> 고등
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
