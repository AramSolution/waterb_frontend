import { SessionManager } from './sessionManager';

// 중복 로그인 이벤트 타입
export type DuplicateLoginEventType = 'force-logout' | 'session-check';

// 중복 로그인 관리 클래스
export class DuplicateLoginManager {
  private static readonly STORAGE_KEY = 'activeSession';
  private static readonly CHECK_INTERVAL = 2000; // 2초마다 체크
  private static checkTimer: NodeJS.Timeout | null = null;
  private static onForceLogoutCallback: (() => void) | null = null;

  /**
   * localStorage에 활성 세션 정보 저장
   */
  static setActiveSession(userId: string, sessionId: string): void {
    const sessionData = {
      userId,
      sessionId,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Failed to set active session:', error);
    }
  }

  /**
   * localStorage에서 활성 세션 정보 가져오기
   */
  static getActiveSession(): { userId: string; sessionId: string; timestamp: number } | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get active session:', error);
      return null;
    }
  }

  /**
   * 활성 세션 정보 제거
   */
  static clearActiveSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear active session:', error);
    }
  }

  /**
   * 현재 세션이 활성 세션인지 확인
   */
  static isCurrentSessionActive(): boolean {
    const currentSessionId = SessionManager.getSessionId();
    const activeSession = this.getActiveSession();

    if (!currentSessionId || !activeSession) {
      return true; // 세션 정보가 없으면 활성으로 간주
    }

    return currentSessionId === activeSession.sessionId;
  }

  /**
   * 중복 로그인 체크 시작
   */
  static startDuplicateLoginCheck(onForceLogout: () => void): void {
    this.onForceLogoutCallback = onForceLogout;

    // 기존 타이머 정리
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    // 주기적으로 세션 체크
    this.checkTimer = setInterval(() => {
      if (!this.isCurrentSessionActive()) {
        console.log('Duplicate login detected - forcing logout');
        this.stopDuplicateLoginCheck();
        if (this.onForceLogoutCallback) {
          this.onForceLogoutCallback();
        }
      }
    }, this.CHECK_INTERVAL);
  }

  /**
   * 중복 로그인 체크 중지
   */
  static stopDuplicateLoginCheck(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.onForceLogoutCallback = null;
  }

  /**
   * 다른 세션 강제 종료
   */
  static forceLogoutOtherSession(userId: string, newSessionId: string): void {
    const activeSession = this.getActiveSession();

    if (activeSession && activeSession.userId === userId) {
      // 새로운 세션으로 교체
      this.setActiveSession(userId, newSessionId);

      // BroadcastChannel을 통해 다른 탭에 알림
      try {
        const channel = new BroadcastChannel('session_channel');
        channel.postMessage({
          type: 'force-logout',
          oldSessionId: activeSession.sessionId,
          newSessionId,
          userId,
        });
        channel.close();
      } catch (error) {
        console.error('BroadcastChannel not supported:', error);
      }
    } else {
      // 활성 세션이 없으면 바로 설정
      this.setActiveSession(userId, newSessionId);
    }
  }

  /**
   * BroadcastChannel 리스너 시작
   */
  static startBroadcastListener(onForceLogout: () => void): BroadcastChannel | null {
    try {
      const channel = new BroadcastChannel('session_channel');

      channel.onmessage = (event) => {
        const { type, oldSessionId, newSessionId } = event.data;

        if (type === 'force-logout') {
          const currentSessionId = SessionManager.getSessionId();

          // 현재 세션이 강제 종료 대상인 경우
          if (currentSessionId === oldSessionId) {
            console.log('Session terminated by new login');
            onForceLogout();
          }
        }
      };

      return channel;
    } catch (error) {
      console.error('BroadcastChannel not supported:', error);
      return null;
    }
  }
}
