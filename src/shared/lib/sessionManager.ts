// 세션 관리 클래스
export class SessionManager {
  private static readonly SESSION_DURATION_KEY = 'sessionDuration';
  private static readonly SESSION_START_KEY = 'sessionStartTime';
  private static readonly SESSION_ID_KEY = 'sessionId';
  private static readonly DEFAULT_DURATION = 30 * 60 * 1000; // 30분 (밀리초)

  /**
   * 고유한 세션 ID 생성
   */
  private static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 현재 세션 ID 가져오기
   */
  static getSessionId(): string | null {
    return sessionStorage.getItem(this.SESSION_ID_KEY);
  }

  /**
   * 세션 ID 설정
   */
  static setSessionId(sessionId: string): void {
    sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);
  }

  /**
   * 세션 시작 시간 설정
   */
  static startSession(durationMinutes?: number): string {
    const now = Date.now();
    const duration = durationMinutes
      ? durationMinutes * 60 * 1000
      : this.DEFAULT_DURATION;

    // 새로운 세션 ID 생성
    const sessionId = this.generateSessionId();

    sessionStorage.setItem(this.SESSION_START_KEY, now.toString());
    sessionStorage.setItem(this.SESSION_DURATION_KEY, duration.toString());
    sessionStorage.setItem(this.SESSION_ID_KEY, sessionId);

    return sessionId;
  }

  /**
   * 세션 유효시간 설정 (분 단위)
   */
  static setSessionDuration(minutes: number): void {
    const duration = minutes * 60 * 1000;
    sessionStorage.setItem(this.SESSION_DURATION_KEY, duration.toString());
  }

  /**
   * 세션 유효시간 가져오기 (분 단위)
   */
  static getSessionDuration(): number {
    const duration = sessionStorage.getItem(this.SESSION_DURATION_KEY);
    return duration
      ? parseInt(duration, 10) / 60 / 1000
      : this.DEFAULT_DURATION / 60 / 1000;
  }

  /**
   * 남은 시간 계산 (밀리초)
   */
  static getRemainingTime(): number {
    const startTime = sessionStorage.getItem(this.SESSION_START_KEY);
    const duration = sessionStorage.getItem(this.SESSION_DURATION_KEY);

    if (!startTime || !duration) {
      return 0;
    }

    const now = Date.now();
    const start = parseInt(startTime, 10);
    const sessionDuration = parseInt(duration, 10);
    const elapsed = now - start;
    const remaining = sessionDuration - elapsed;

    return remaining > 0 ? remaining : 0;
  }

  /**
   * 세션 만료 여부 확인
   */
  static isSessionExpired(): boolean {
    return this.getRemainingTime() <= 0;
  }

  /**
   * 세션 연장 (현재 시간 기준으로 재시작)
   */
  static extendSession(): void {
    const currentDuration = this.getSessionDuration();
    this.startSession(currentDuration);
  }

  /**
   * 세션 연장 - 남은 시간을 59:59로 설정
   */
  static extendSessionTo59m59s(): void {
    const now = Date.now();
    const durationMs = 59 * 60 * 1000 + 59 * 1000; // 59분 59초
    sessionStorage.setItem(this.SESSION_START_KEY, now.toString());
    sessionStorage.setItem(this.SESSION_DURATION_KEY, durationMs.toString());
  }

  /**
   * 세션 연장 - 입력한 분만큼 현재 남은 시간에 더함
   * @param minutes 추가할 분
   */
  static extendSessionByMinutes(minutes: number): void {
    const now = Date.now();
    const currentRemaining = this.getRemainingTime();
    const addMs = Math.max(0, minutes) * 60 * 1000;
    const newDurationMs = currentRemaining + addMs;
    sessionStorage.setItem(this.SESSION_START_KEY, now.toString());
    sessionStorage.setItem(this.SESSION_DURATION_KEY, newDurationMs.toString());
  }

  /**
   * 세션 정보 초기화
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_START_KEY);
    sessionStorage.removeItem(this.SESSION_DURATION_KEY);
    sessionStorage.removeItem(this.SESSION_ID_KEY);
  }

  /**
   * 남은 시간을 포맷된 문자열로 반환 (mm:ss)
   */
  static getFormattedRemainingTime(): string {
    const remaining = this.getRemainingTime();

    if (remaining <= 0) {
      return '00:00';
    }

    const totalSeconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}
