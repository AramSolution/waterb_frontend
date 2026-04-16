"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { LayoutWrapper, type LayoutThemeType } from "@/widgets/userWeb/layout";
import {
	TokenUtils,
	openSirenPassBlankWindow,
	tryCloseSirenPassWindow,
	postSirenCreateTokenAndSubmit,
} from "@/shared/lib";
import { EDREAM_CERT_SIREN } from "@/shared/config/api";

const VALID_JOIN_TYPES: LayoutThemeType[] = [
	"student",
	"parent",
	"academy",
	"mentor",
];

function joinTypeFromParam(type: string | null): LayoutThemeType {
	if (type && VALID_JOIN_TYPES.includes(type as LayoutThemeType)) {
		return type as LayoutThemeType;
	}
	return "student";
}

const BADGE_LABEL_BY_THEME: Record<LayoutThemeType, string> = {
	student: "학생",
	parent: "학부모/일반",
	school: "기관",
	academy: "학원",
	mentor: "멘토",
};

/** 본인인증: hidden input 추가 */
function addHiddenInput(formId: string, name: string, value: string) {
	const form = document.getElementById(formId);
	if (!form) return;
	const input = document.createElement("input");
	input.type = "hidden";
	input.name = name;
	input.value = value;
	form.appendChild(input);
}

/** 본인인증: 토큰 요청 후 reqCBAForm 생성 (bizInput과 동일) */
async function fetchCertToken(): Promise<void> {
	const params = new URLSearchParams();
	params.append("srvNo", "017001");
	params.append(
		"retUrl",
		typeof window !== "undefined"
			? `72${window.location.origin}/result/cert`
			: "72https://dev.uaram.co.kr/result/cert",
	);
	const response = await axios.post(
		EDREAM_CERT_SIREN.TOKEN_AUTH,
		params,
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Authorization: TokenUtils.getToken(),
			},
			timeout: 10000,
			withCredentials: true,
		},
	);
	let oldForm = document.getElementById("reqCBAForm");
	if (oldForm) oldForm.remove();
	const newForm = document.createElement("form");
	newForm.id = "reqCBAForm";
	newForm.name = "reqCBAForm";
	newForm.method = "post";
	document.body.appendChild(newForm);
	addHiddenInput("reqCBAForm", "id", response.data.id);
	addHiddenInput("reqCBAForm", "srvNo", response.data.srvNo);
	addHiddenInput("reqCBAForm", "reqNum", response.data.reqNum);
	addHiddenInput("reqCBAForm", "certGb", response.data.certGb);
	addHiddenInput("reqCBAForm", "retUrl", response.data.retUrl);
	addHiddenInput("reqCBAForm", "verSion", response.data.verSion);
	addHiddenInput("reqCBAForm", "certDate", response.data.certDate);
}

/** 타입별 체크박스 체크 아이콘 파일명 */
const CHECKBOX_ICON_BY_THEME: Record<LayoutThemeType, string> = {
	student: "ico_radio_check_on_st.png",
	parent: "ico_radio_check_on_pr.png",
	school: "ico_radio_check_on_st.png",
	academy: "ico_radio_check_on_ac.png",
	mentor: "ico_radio_check_on_mt.png",
};

/** 약관 항목 정의 */
interface TermItem {
	id: string;
	label: string;
	required: boolean;
	content: string;
	/** true면 content를 HTML로 렌더링 (테이블 등) */
	contentAsHtml?: boolean;
}

/** 이용약관 공통 내용 (제1조~제10조) */
const SERVICE_TERMS_CONTENT = `<p><strong>[서비스 이용약관]</strong></p>

<p><strong>제1조 (목적)</strong><br>
  이 약관은 회사가 제공하는 인터넷 서비스(이하 "서비스"라 합니다)의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

<p><strong>제2조 (정의)</strong><br>
  이 약관에서 사용하는 용어의 정의는 다음과 같습니다.<br>
  ○ "서비스"란 회사가 제공하는 모든 온라인 서비스 및 이와 관련된 제반 서비스를 의미합니다.<br>
  ○ "회원"이란 회사와 서비스 이용계약을 체결하고 아이디(ID)를 부여받은 자를 의미합니다.<br>
  ○ "아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합을 의미합니다.<br>
  ○ "비밀번호"란 회원이 부여받은 아이디와 일치되는 회원임을 확인하고 비밀보호를 위해 회원 자신이 정한 문자 또는 숫자의 조합을 의미합니다.<br>
  ○ "게시물"이란 회원이 서비스를 이용함에 있어 서비스 상에 게시한 부호·문자·음성·음향·화상·동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크 등을 의미합니다.</p>

<p><strong>제3조 (약관의 효력 및 변경)</strong><br>
  ① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.<br>
  ② 회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위에서 이 약관을 변경할 수 있으며, 약관이 변경되는 경우 변경 내용과 적용 일자를 명시하여 서비스 화면에 게시하거나 회원에게 통보합니다.<br>
  ③ 회원은 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생 이후에도 서비스를 계속 이용할 경우 약관의 변경 사항에 동의한 것으로 간주됩니다.</p>

<p><strong>제4조 (회원가입)</strong><br>
  ① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.<br>
  ② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.<br>
  &nbsp;&nbsp;○ 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우 (단, 회사의 재가입 승낙을 얻은 경우는 예외)<br>
  &nbsp;&nbsp;○ 등록 내용에 허위, 기재누락, 오기가 있는 경우<br>
  &nbsp;&nbsp;○ 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</p>

<p><strong>제5조 (회원 탈퇴 및 자격 상실)</strong><br>
  ① 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.<br>
  ② 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 사전 통보 없이 회원자격을 제한 및 정지시킬 수 있습니다.<br>
  &nbsp;&nbsp;○ 가입 신청 시 허위 내용을 등록한 경우<br>
  &nbsp;&nbsp;○ 다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우<br>
  &nbsp;&nbsp;○ 서비스를 이용하여 법령 또는 이 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</p>

<p><strong>제6조 (회원에 대한 통지)</strong><br>
  ① 회사가 회원에 대한 통지를 하는 경우 회원이 제공한 이메일 주소로 할 수 있습니다.<br>
  ② 회사는 불특정 다수 회원에 대한 통지의 경우 1주일 이상 서비스 공지사항에 게시함으로써 개별 통지에 갈음할 수 있습니다.</p>

<p><strong>제7조 (서비스의 제공 및 변경)</strong><br>
  ① 회사는 다음과 같은 업무를 수행합니다.<br>
  &nbsp;&nbsp;○ 정보 제공 및 관련 서비스<br>
  &nbsp;&nbsp;○ 기타 회사가 정하는 업무<br>
  ② 회사는 서비스의 내용을 변경할 경우에는 변경 내용과 제공 일자를 명시하여 서비스 화면에 게시하거나 회원에게 통보합니다.</p>

<p><strong>제8조 (서비스의 중단)</strong><br>
  ① 회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.<br>
  ② 회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 회사가 고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.</p>

<p><strong>제9조 (회원의 의무)</strong><br>
  ① 회원은 다음 행위를 하여서는 안 됩니다.<br>
  &nbsp;&nbsp;○ 신청 또는 변경 시 허위 내용의 등록<br>
  &nbsp;&nbsp;○ 타인의 정보 도용<br>
  &nbsp;&nbsp;○ 회사가 게시한 정보의 변경<br>
  &nbsp;&nbsp;○ 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시<br>
  &nbsp;&nbsp;○ 회사와 기타 제3자의 저작권 등 지식재산권에 대한 침해<br>
  &nbsp;&nbsp;○ 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위<br>
  &nbsp;&nbsp;○ 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</p>

<p><strong>제10조 (면책조항)</strong><br>
  ① 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.<br>
  ② 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.<br>
  ③ 회사는 회원이 서비스와 관련하여 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</p>`;

/** 개인정보 수집 동의 약관 내용 (제1조~제8조) */
const PRIVACY_TERMS_CONTENT = `<p><strong>[개인정보취급방침]</strong></p>

<p><strong>제1조 (개인정보의 처리 목적)</strong><br>
  회사(이하 "회사"라 합니다)는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.<br>
  홈페이지 회원 가입 및 관리: 회원 가입 의사 확인, 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지, 고충처리<br>
  ○ 민원사무 처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보<br>
  ○ 재화 또는 서비스 제공: 서비스 제공, 콘텐츠 제공, 맞춤서비스 제공, 본인인증, 요금결제·정산<br>
  ○ 마케팅 및 광고 활용: 신규 서비스 개발, 이벤트 및 광고성 정보 제공, 서비스 유효성 확인</p>

<p><strong>제2조 (수집하는 개인정보의 항목)</strong><br>
  ① 회사는 회원가입, 서비스 제공 등을 위해 아래와 같은 개인정보를 수집합니다.<br>
  &nbsp;&nbsp;○ 필수항목: 성명, 아이디, 비밀번호, 이메일 주소, 휴대폰 번호, 생년월일<br>
  &nbsp;&nbsp;○ 선택항목: 주소, 직업, 관심분야<br>
  &nbsp;&nbsp;○ 자동수집항목: 서비스 이용 기록, 접속 로그, IP 주소, 쿠키, 기기정보<br>
  ② 서비스 이용 과정에서 아래 개인정보 항목이 자동으로 생성되어 수집될 수 있습니다.<br>
  &nbsp;&nbsp;IP주소, 쿠키, 서비스 이용기록, 방문기록</p>

<p><strong>제3조 (개인정보의 처리 및 보유기간)</strong><br>
  ① 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를 처리·보유합니다.<br>
  ② 각각의 개인정보 처리 및 보유기간은 다음과 같습니다.<br>
  &nbsp;&nbsp;○ 홈페이지 회원 가입 및 관리: 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사가 진행 중인 경우 해당 종료 시까지)<br>
  &nbsp;&nbsp;○ 재화 또는 서비스 제공: 재화·서비스 공급 완료 및 요금 결제·정산 완료 시까지<br>
  &nbsp;&nbsp;○ 전자상거래 거래 기록: 5년 (전자상거래 등에서의 소비자 보호에 관한 법률)<br>
  &nbsp;&nbsp;○ 소비자 불만 또는 분쟁처리 기록: 3년<br>
  &nbsp;&nbsp;○ 로그인 기록: 3개월 (통신비밀보호법)</p>

<p><strong>제4조 (개인정보의 제3자 제공)</strong><br>
  ① 회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의 또는 법률의 특별한 규정이 있는 경우에만 제3자에게 제공합니다.<br>
  ② 현재 회사는 개인정보를 제3자에게 제공하지 않습니다. 향후 제공이 필요한 경우 사전에 고지하고 별도의 동의를 받겠습니다.</p>

<p><strong>제5조 (개인정보처리의 위탁)</strong><br>
  ① 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.<br>
  &nbsp;&nbsp;○ 위탁업체: (주)○○○ / 위탁업무: 시스템 운영 및 유지보수 / 보유기간: 위탁계약 종료 시까지<br>
  &nbsp;&nbsp;○ 위탁업체: (주)△△△ / 위탁업무: 문자·이메일 발송 / 보유기간: 위탁계약 종료 시까지<br>
  ② 회사는 위탁계약 체결 시 위탁업무 수행 목적 외 개인정보 처리 금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 문서에 명시합니다.</p>

<p><strong>제6조 (정보주체의 권리·의무 및 행사방법)</strong><br>
  ① 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.<br>
  &nbsp;&nbsp;○ 개인정보 열람 요구<br>
  &nbsp;&nbsp;○ 오류 등이 있을 경우 정정 요구<br>
  &nbsp;&nbsp;○ 삭제 요구<br>
  &nbsp;&nbsp;○ 처리 정지 요구<br>
  ② 제1항에 따른 권리 행사는 회사에 대해 개인정보 보호법 시행령 제41조 제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체없이 조치하겠습니다.</p>

<p><strong>제7조 (개인정보의 파기)</strong><br>
  ① 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.<br>
  ② 파기 방법은 다음과 같습니다.<br>
  &nbsp;&nbsp;○ 전자적 파일 형태: 복구 및 재생이 불가능한 기술적 방법으로 영구 삭제<br>
  &nbsp;&nbsp;○ 종이 문서 형태: 분쇄기로 분쇄하거나 소각</p>

<p><strong>제8조 (개인정보 보호책임자)</strong><br>
  회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.<br>
  ○ 성명: ○○○<br>
  ○ 직책: 개인정보보호담당자<br>
  ○ 연락처: 이메일 privacy@company.com / 전화 02-0000-0000</p>`;

/** 개인정보 제3자 제공 약관 내용 (제1조~제7조, 표 포함) */
const THIRD_PARTY_TERMS_CONTENT = `<p><strong>[개인정보 제3자 제공 약관]</strong></p>

<p><strong>제1조 (목적)</strong><br>
  본 약관은 회사가 회원의 개인정보를 제3자에게 제공하는 경우 그 목적, 제공 항목, 보유 및 이용기간 등을 명확히 하여 정보주체의 권익을 보호함을 목적으로 합니다.</p>

<p><strong>제2조 (제3자 제공 원칙)</strong><br>
  ① 회사는 원칙적으로 정보주체의 개인정보를 수집·이용 목적 이외의 용도로 이용하거나 제3자에게 제공하지 않습니다.<br>
  ② 다음의 경우에는 예외로 합니다.<br>
  &nbsp;&nbsp;○ 정보주체가 사전에 동의한 경우<br>
  &nbsp;&nbsp;○ 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>

<p><strong>제3조 (제3자 제공 현황)</strong><br>
  회사가 개인정보를 제3자에게 제공하는 현황은 다음과 같습니다.</p>

<table class="termsTable">
  <thead>
    <tr>
      <th>제공받는 자</th>
      <th>제공목적</th>
      <th>제공항목</th>
      <th>보유/이용기간</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>예)고객센터</td>
      <td>고객민원처리</td>
      <td>성명, 연락처, 이용내역</td>
      <td>민원처리 완료 후 3년</td>
    </tr>
  </tbody>
</table>

<p><strong>제4조 (동의 거부 권리 및 불이익)</strong><br>
  ① 정보주체는 개인정보의 제3자 제공에 대한 동의를 거부할 권리가 있습니다.<br>
  ② 단, 필수 제공 항목에 대한 동의를 거부하는 경우 서비스 이용이 제한될 수 있습니다.<br>
  ③ 선택적 제3자 제공에 대한 동의를 거부하더라도 기본 서비스 이용에는 불이익이 없습니다.</p>

<p><strong>제5조 (제3자 제공 시 안전조치)</strong><br>
  ① 회사는 개인정보를 제3자에게 제공하는 경우 제공받는 자가 개인정보 보호법을 준수하도록 계약서 등에 안전조치 의무를 명시합니다.<br>
  ② 회사는 제공받는 자가 개인정보를 안전하게 처리하는지 여부를 확인합니다.<br>
  ③ 제공받는 자가 제공 목적 외의 용도로 개인정보를 이용하거나 제3자에게 다시 제공하는 경우 즉시 제공을 중단하고 관련 조치를 취합니다.</p>

<p><strong>제6조 (국외 제3자 제공)</strong><br>
  ① 회사는 현재 국외 제3자에게 개인정보를 제공하지 않습니다.<br>
  ② 향후 국외 제3자 제공이 필요한 경우 개인정보 보호법 제28조의8에 따라 별도의 동의를 받겠습니다.</p>

<p><strong>제7조 (정보주체의 권리)</strong><br>
  ① 정보주체는 제3자 제공과 관련하여 언제든지 동의를 철회할 수 있습니다.<br>
  ② 동의 철회 요청은 아래 개인정보 보호책임자에게 이메일, 전화 등을 통해 신청하실 수 있습니다.<br>
  &nbsp;&nbsp;○ 이메일: privacy@company.com<br>
  &nbsp;&nbsp;○ 전화: 02-0000-0000</p>`;

/** 주민등록번호 수집에 관한 약관 내용 (제1조~제8조) */
const RESIDENT_NUMBER_TERMS_CONTENT = `<p><strong>[주민등록번호 수집에 관한 약관]</strong></p>

<p><strong>제1조 (목적)</strong><br>
  본 약관은 개인정보 보호법 제24조의2에 따라 주민등록번호 수집·이용에 관한 사항을 정보주체에게 명확히 고지하고 동의를 받기 위한 목적으로 작성되었습니다.</p>

<p><strong>제2조 (수집 근거)</strong><br>
  회사는 다음의 법적 근거에 해당하는 경우에 한하여 주민등록번호를 수집합니다.<br>
  1. 법령에서 주민등록번호의 처리를 요구하거나 허용하는 경우<br>
  2. 소득세법, 부가가치세법 등 세금계산서 발급 의무<br>
  3. 전자금융거래법에 따른 실명 확인<br>
  4. 기타 개별 법령에서 명시적으로 허용된 경우<br>
  5. 정보주체 또는 제3자의 급박한 생명·신체·재산의 이익을 위하여 명백히 필요하다고 인정되는 경우</p>

<p><strong>제3조 (수집 항목 및 목적)</strong><br>
  ① 회사가 수집하는 주민등록번호 항목과 목적은 다음과 같습니다.</p>
<table class="termsTable">
  <thead>
    <tr><th>수집 항목</th><th>수집 목적</th><th>법적 근거</th></tr>
  </thead>
  <tbody>
    <tr><td>주민등록번호(앞 6자리 + 성별 구분)</td><td>본인 실명 인증</td><td>전자금융거래법 제26조</td></tr>
    <tr><td>주민등록번호(전체)</td><td>세금계산서 발급, 연말정산</td><td>소득세법 제143조</td></tr>
    <tr><td>주민등록번호(전체)</td><td>공공기관 업무처리</td><td>관련 공공기관 개별 법령</td></tr>
  </tbody>
</table>
<p><strong>제4조 (보유 및 이용기간)</strong><br>
  ① 주민등록번호는 수집 목적이 달성된 후 지체없이 파기합니다. 단, 다음의 경우에는 해당 기간 동안 보유합니다.<br>
  &nbsp;&nbsp;○ 세금계산서 관련: 발급일로부터 5년 (부가가치세법)<br>
  &nbsp;&nbsp;○ 금융거래 관련: 거래 종료 후 5년 (전자금융거래법)<br>
  &nbsp;&nbsp;○ 공공기관 업무: 관련 법령에서 정한 기간</p>

<p><strong>제5조 (주민등록번호의 안전한 처리)</strong><br>
  ① 회사는 주민등록번호를 안전하게 처리하기 위해 다음의 조치를 취합니다.<br>
  &nbsp;&nbsp;○ 암호화 저장: 주민등록번호는 일방향 암호화(해시) 또는 양방향 암호화 방식으로 저장합니다.<br>
  &nbsp;&nbsp;○ 접근 제한: 주민등록번호에 접근 가능한 담당자를 최소화하고, 접근 권한을 엄격히 관리합니다.<br>
  &nbsp;&nbsp;○ 접근 기록: 주민등록번호에 대한 접근 및 처리 기록을 5년간 보관합니다.<br>
  &nbsp;&nbsp;○ 출력·복사 제한: 주민등록번호가 포함된 문서의 출력 및 복사를 제한합니다.<br>
  &nbsp;&nbsp;○ 전송 보안: 주민등록번호를 전송하는 경우 SSL 등의 암호화 프로토콜을 사용합니다.</p>

<p><strong>제6조 (주민등록번호 수집·이용 동의 거부 권리)</strong><br>
  ① 정보주체는 주민등록번호 수집·이용에 대한 동의를 거부할 권리가 있습니다.<br>
  ② 단, 법령에 따라 주민등록번호 수집이 반드시 필요한 서비스의 경우(예: 세금계산서 발급, 금융 실명 확인 등), 동의를 거부하시면 해당 서비스 이용이 불가능합니다.<br>
  ③ 선택 동의 항목에 해당하는 경우, 동의를 거부하여도 기본 서비스 이용에는 불이익이 없습니다.</p>

<p><strong>제7조 (주민등록번호의 파기)</strong><br>
  ① 주민등록번호는 보유기간이 경과하거나 처리 목적이 달성된 경우 지체없이 파기합니다.<br>
  ② 파기 방법은 다음과 같습니다.<br>
  &nbsp;&nbsp;○ 전자적 파일: 복구 불가능한 방법으로 영구 삭제 (단순 삭제 금지)<br>
  &nbsp;&nbsp;○ 출력물: 분쇄기 분쇄 또는 소각 처리</p>

<p><strong>제8조 (위반 시 제재)</strong><br>
  ① 회사는 법적 근거 없이 주민등록번호를 수집·이용하거나 분실·도난·유출·변조·훼손되지 않도록 안전성 확보에 필요한 조치를 취하지 않은 경우, 개인정보 보호법 제24조의2에 따라 과태료 처분 등을 받을 수 있음을 인지하고 있습니다.<br>
  ② 주민등록번호 처리와 관련한 불만 및 피해 구제는 아래 개인정보 보호책임자에게 문의하실 수 있습니다.<br>
  &nbsp;&nbsp;○ 이메일: privacy@company.com<br>
  &nbsp;&nbsp;○ 전화: 02-0000-0000<br>
  &nbsp;&nbsp;○ 행정안전부 개인정보 보호포털: www.privacy.go.kr</p>`;

/** 타입별 약관 항목 (추후 API 연동 가능) */
function getTermsItems(joinType: LayoutThemeType): TermItem[] {

	return [
		{
			id: "termService",
			label: "이용 약관 동의",
			required: true,
			content: SERVICE_TERMS_CONTENT,
			contentAsHtml: true,
		},
		{
			id: "termPrivacy",
			label: "개인정보 수집 동의",
			required: true,
			content: PRIVACY_TERMS_CONTENT,
			contentAsHtml: true,
		},
		{
			id: "termThirdParty",
			label: "개인정보 제3자 제공 동의",
			required: true,
			content: THIRD_PARTY_TERMS_CONTENT,
			contentAsHtml: true,
		},
		{
			id: "termResidentNumber",
			label: "주민등록번호 수집 동의",
			required: true,
			content: RESIDENT_NUMBER_TERMS_CONTENT,
			contentAsHtml: true,
		},
	];
}

/**
 * 회원가입 전 약관 동의 페이지 (join_terms.html 디자인 기반)
 * url parameter (`?type=...`)에 따라 해당하는 약관 내용을 표시합니다.
 */
export default function JoinTermsPage() {
	const searchParams = useSearchParams();
	const router = useRouter();

	const joinType = useMemo(
		() => joinTypeFromParam(searchParams.get("type")),
		[searchParams],
	);

	const termsItems = useMemo(() => getTermsItems(joinType), [joinType]);

	// 개별 약관 체크 상태
	const [checkedTerms, setCheckedTerms] = useState<Record<string, boolean>>({});
	/** 더보기: 한 번에 하나만 펼침 (다른 항목은 자동으로 닫힘) */
	const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
	// 본인인증 진행 중 (팝업 오픈 대기)
	const [isCertifying, setIsCertifying] = useState(false);

	// 전체 체크 여부
	const isAllChecked = termsItems.every((item) => checkedTerms[item.id]);
	// 필수 약관 전부 체크 여부
	const allEssentialChecked = termsItems
		.filter((item) => item.required)
		.every((item) => checkedTerms[item.id]);

	// 전체 약관 동의
	const handleAllAgree = useCallback(
		(checked: boolean) => {
			const newState: Record<string, boolean> = {};
			termsItems.forEach((item) => {
				newState[item.id] = checked;
			});
			setCheckedTerms(newState);
		},
		[termsItems],
	);

	// 개별 약관 체크
	const handleItemCheck = useCallback((id: string, checked: boolean) => {
		setCheckedTerms((prev) => ({ ...prev, [id]: checked }));
	}, []);

	// 더보기 토글: 같은 항목 재클릭 시 닫기, 다른 항목 클릭 시 기존 펼침 닫고 해당 항목만 열기
	const handleToggle = useCallback((id: string) => {
		setExpandedTermId((prev) => (prev === id ? null : id));
	}, []);

	/** 본인인증: 클릭 직후 팝업을 연 뒤 토큰 요청(공통 동작) */
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!allEssentialChecked) {
			alert("필수 약관에 모두 동의하셔야 진행할 수 있습니다.");
			return;
		}
		if (isCertifying) return;

		const passPopup = openSirenPassBlankWindow();
		if (!passPopup || passPopup.closed) {
			alert(
				"본인인증 창이 열리지 않았습니다. 브라우저에서 이 사이트의 팝업을 허용한 뒤 다시 시도해 주세요.",
			);
			return;
		}

		(
			window as Window & {
				__onGuardianCertSuccess?: (data: {
					userName: string;
					celNo: string;
					birYMD: string;
					gender?: string;
					di?: string;
				}) => void;
			}
		).__onGuardianCertSuccess = (data) => {
			(
				window as Window & {
					__onGuardianCertSuccess?: (data: {
						userName: string;
						celNo: string;
						birYMD: string;
						gender?: string;
						di?: string;
					}) => void;
				}
			).__onGuardianCertSuccess = undefined;
			try {
				sessionStorage.setItem(
					"joinCertData",
					JSON.stringify({
						userName: data?.userName ?? "",
						celNo: data?.celNo ?? "",
						birYMD: data?.birYMD ?? "",
						gender: data?.gender ?? "",
						di: data?.di ?? "",
					}),
				);
				sessionStorage.setItem(
					"joinTermsPassed",
					JSON.stringify({
						type: joinType,
						passedAt: Date.now(),
					}),
				);
			} catch {
				// sessionStorage 실패 시 무시
			}
			router.push(`/userWeb/joinAc?type=${joinType}`);
		};

		setIsCertifying(true);
		try {
			await fetchCertToken();
			const formElement = document.getElementsByName("reqCBAForm")[0] as
				| HTMLFormElement
				| undefined;
			if (!formElement) {
				throw new Error("reqCBAForm 없음");
			}
			await postSirenCreateTokenAndSubmit(
				formElement,
				addHiddenInput,
				TokenUtils.getToken(),
			);
		} catch (err) {
			tryCloseSirenPassWindow(passPopup);
			console.error("본인인증 토큰 생성 실패:", err);
			alert("본인인증 준비 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
		} finally {
			setIsCertifying(false);
		}
	};

	/** 체크 아이콘 (checked → 타입별 primary 아이콘) */
	const checkedIconUrl = `/images/userWeb/icon/${CHECKBOX_ICON_BY_THEME[joinType]}`;
	const uncheckedIconUrl = "/images/userWeb/icon/ico_radio_check_off.png";

	/** 체크 상태에 따라 checkLabel::before 아이콘 오버라이드 (CSS에서는 :checked 선택자로 색만 바꾸고, 아이콘은 인라인으로) */
	const getCheckLabelStyle = (
		isChecked: boolean,
	): React.CSSProperties =>
		isChecked
			? ({
					"--check-icon": `url('${checkedIconUrl}')`,
				} as React.CSSProperties)
			: ({
					"--check-icon": `url('${uncheckedIconUrl}')`,
				} as React.CSSProperties);

	return (
		<LayoutWrapper
			headerType="main"
			themeOverride={joinType}
			badgeLabel={BADGE_LABEL_BY_THEME[joinType]}
			headerBadgeLabel={BADGE_LABEL_BY_THEME[joinType]}
			mainClassName="joinBg"
			disableHeaderNav={joinType === "academy" || joinType === "mentor"}
		>
			<section className="inner" style={{ maxWidth: "1200px", margin: "0 auto" }}>
				<div className="mainTitle" style={{ color: "#222" }}>
					회원가입
				</div>

				<div className="mainBg">
					<div className="termsContainer">
						<form id="termsForm" onSubmit={handleSubmit}>
							{/* 전체 약관동의 */}
							<div className={`allCheckWrapper${isAllChecked ? " active" : ""}`}>
								<input
									type="checkbox"
									id="allAgree"
									className="checkInput"
									checked={isAllChecked}
									onChange={(e) => handleAllAgree(e.target.checked)}
								/>
								<label
									htmlFor="allAgree"
									className="checkLabel"
									style={{
										...getCheckLabelStyle(isAllChecked),
									}}
								>
									전체 약관동의
								</label>
							</div>

							<hr className="divider" />

							{/* 개별 약관 리스트 */}
							<ul className="termsList">
								{termsItems.map((item) => {
									const isChecked = !!checkedTerms[item.id];
									const isExpanded = expandedTermId === item.id;

									return (
										<li key={item.id} className="termsItem">
											<div className="termsHeader">
												<div className="checkGroup">
													<input
														type="checkbox"
														id={item.id}
														className={`checkInput${item.required ? " essential" : ""}`}
														checked={isChecked}
														onChange={(e) =>
															handleItemCheck(item.id, e.target.checked)
														}
													/>
													<label
														htmlFor={item.id}
														className="checkLabel"
														style={getCheckLabelStyle(isChecked)}
													>
														<span className={item.required ? "point" : "gray"}>
															{item.required ? "(필수)" : "(선택)"}
														</span>{" "}
														{item.label}
													</label>
												</div>
												<button
													type="button"
													className="toggleBtn"
													aria-expanded={isExpanded}
													aria-controls={`content_${item.id}`}
													onClick={() => handleToggle(item.id)}
												>
													{isExpanded ? "닫기" : "더보기"}
												</button>
											</div>
											{isExpanded && (
												<div id={`content_${item.id}`} className="termsContent">
													<div
														className="innerBox"
														{...(item.contentAsHtml
															? { dangerouslySetInnerHTML: { __html: item.content } }
															: { children: item.content })}
													/>
												</div>
											)}
										</li>
									);
								})}
							</ul>

							{/* 하단 버튼 */}
							<div className="submitWrapper">
								<button
									type="submit"
									className={`submitBtn${allEssentialChecked && !isCertifying ? " active" : ""}`}
									disabled={!allEssentialChecked || isCertifying}
								>
									{isCertifying ? "본인인증 준비 중..." : "본인인증"}
								</button>
							</div>
						</form>
					</div>
				</div>
			</section>
		</LayoutWrapper>
	);
}
