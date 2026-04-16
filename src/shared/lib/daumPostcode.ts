/**
 * 다음(카카오) 우편번호 API - 스크립트 동적 로드 후 팝업 오픈
 * @see https://postcode.map.daum.net/guide
 */

const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

export interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressEnglish: string;
  addressType: "R" | "J";
  userSelectedType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
  apartment: string;
  [key: string]: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * 다음 우편번호 팝업을 열고, 주소 선택 시 onComplete 콜백 호출
 */
export function openDaumPostcode(
  onComplete: (data: DaumPostcodeData) => void,
): void {
  loadScript(DAUM_POSTCODE_SCRIPT_URL)
    .then(() => {
      if (!window.daum?.Postcode) {
        console.error("Daum Postcode API is not available.");
        return;
      }
      const postcode = new window.daum.Postcode({
        oncomplete(data: DaumPostcodeData) {
          onComplete(data);
        },
      });
      postcode.open();
    })
    .catch((err) => {
      console.error("Daum Postcode script load error:", err);
    });
}
