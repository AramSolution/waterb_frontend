/**
 * Kakao Map SDK loader (maps + services)
 * Loads once and resolves after kakao.maps.load().
 */
const KAKAO_MAP_SDK_BASE_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

declare global {
  interface Window {
    kakao?: {
      maps?: {
        load: (callback: () => void) => void;
        services?: unknown;
      };
    };
  }
}

let kakaoMapSdkPromise: Promise<void> | null = null;

export function loadKakaoMapSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao map is only available in browser."));
  }

  if (window.kakao?.maps?.services) {
    return Promise.resolve();
  }

  if (kakaoMapSdkPromise) {
    return kakaoMapSdkPromise;
  }

  kakaoMapSdkPromise = new Promise<void>((resolve, reject) => {
    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim();
    if (!appKey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY is missing."));
      return;
    }

    const src = `${KAKAO_MAP_SDK_BASE_URL}?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;

    const completeLoad = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao map SDK is not available."));
        return;
      }
      window.kakao.maps.load(() => resolve());
    };

    if (document.querySelector(`script[src="${src}"]`)) {
      completeLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = completeLoad;
    script.onerror = () =>
      reject(new Error("Failed to load Kakao map SDK script."));
    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapSdkPromise = null;
    throw error;
  });

  return kakaoMapSdkPromise;
}
