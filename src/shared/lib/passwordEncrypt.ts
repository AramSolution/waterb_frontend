/**
 * 백엔드와 동일한 방식으로 비밀번호를 암호화하는 유틸리티
 * 백엔드: EgovFileScrty.encryptPassword(password, id)
 * 
 * 암호화 방식:
 * 1. SHA-256 해시 알고리즘 사용
 * 2. 사용자 ID를 salt로 사용 (md.update(id.getBytes()))
 * 3. 비밀번호를 해시 (md.digest(password.getBytes()))
 * 4. Base64 인코딩
 */

/**
 * 비밀번호를 암호화합니다 (백엔드와 동일한 방식)
 * @param password 원본 비밀번호
 * @param userId 사용자 ID (salt로 사용)
 * @returns Base64로 인코딩된 암호화된 비밀번호
 */
export async function encryptPassword(
  password: string,
  userId: string
): Promise<string> {
  if (!password || !userId) {
    return "";
  }

  try {
    // 백엔드 로직 재현:
    // MessageDigest md = MessageDigest.getInstance("SHA-256");
    // md.reset();
    // md.update(id.getBytes());  // ID를 먼저 해시 상태에 추가
    // hashValue = md.digest(password.getBytes());  // 비밀번호를 해시하고 최종 해시값 반환
    
    // Web Crypto API는 한 번에 모든 데이터를 해시하므로,
    // ID와 비밀번호를 순서대로 결합하여 해시
    const encoder = new TextEncoder();
    const idBytes = encoder.encode(userId);
    const passwordBytes = encoder.encode(password);

    // ID + 비밀번호 순서로 결합
    const combinedData = new Uint8Array(idBytes.length + passwordBytes.length);
    combinedData.set(idBytes, 0);
    combinedData.set(passwordBytes, idBytes.length);

    // SHA-256 해시
    const hashBuffer = await crypto.subtle.digest("SHA-256", combinedData);

    // Base64 인코딩
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64String = btoa(
      String.fromCharCode.apply(null, hashArray as any)
    );

    return base64String;
  } catch (error) {
    console.error("Password encryption error:", error);
    throw error;
  }
}
