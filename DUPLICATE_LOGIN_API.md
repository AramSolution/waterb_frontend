# 중복 로그인 방지 API 가이드

## 개요
프론트엔드에서 중복 로그인을 감지하고 처리하기 위해 백엔드 API가 제공해야 하는 기능입니다.

## 백엔드 요구사항

### 1. 로그인 API 수정

#### 요청 (POST /auth/login-jwt)
```json
{
  "id": "admin",
  "password": "password123",
  "userSe": "USR",
  "forceLogin": false  // 강제 로그인 여부 (추가)
}
```

#### 응답

##### Case 1: 정상 로그인 (중복 없음)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "admin",
    "username": "admin",
    "name": "관리자",
    "role": "ADMIN"
  }
}
```

##### Case 2: 중복 로그인 감지 (forceLogin = false)
```json
{
  "duplicateLogin": true,
  "existingSessionId": "session_12345_abcdef",
  "message": "이미 다른 곳에서 로그인되어 있습니다."
}
```

##### Case 3: 강제 로그인 (forceLogin = true)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "admin",
    "username": "admin",
    "name": "관리자",
    "role": "ADMIN"
  },
  "previousSessionTerminated": true
}
```

### 2. 세션 관리

백엔드에서 다음 정보를 관리해야 합니다:

#### 세션 테이블 (예시)
```sql
CREATE TABLE user_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  access_token VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- 사용자당 하나의 활성 세션만 유지
CREATE UNIQUE INDEX idx_active_user_session
ON user_sessions(user_id)
WHERE is_active = TRUE;
```

### 3. 로그인 처리 로직

```java
// 의사 코드
public LoginResponse login(LoginRequest request) {
    // 1. 인증 확인
    User user = authenticate(request.getId(), request.getPassword());

    // 2. 중복 로그인 체크
    Session existingSession = sessionRepository.findActiveSessionByUserId(user.getId());

    if (existingSession != null && !request.isForceLogin()) {
        // 중복 로그인 감지
        return LoginResponse.builder()
            .duplicateLogin(true)
            .existingSessionId(existingSession.getSessionId())
            .message("이미 다른 곳에서 로그인되어 있습니다.")
            .build();
    }

    // 3. 강제 로그인인 경우 기존 세션 무효화
    if (request.isForceLogin() && existingSession != null) {
        sessionRepository.deactivateSession(existingSession.getSessionId());
        // WebSocket 또는 SSE를 통해 기존 클라이언트에 알림
        notifySessionTermination(existingSession.getSessionId());
    }

    // 4. 새 세션 생성
    String accessToken = generateAccessToken(user);
    String sessionId = generateSessionId();

    Session newSession = Session.builder()
        .sessionId(sessionId)
        .userId(user.getId())
        .accessToken(accessToken)
        .isActive(true)
        .build();

    sessionRepository.save(newSession);

    return LoginResponse.builder()
        .accessToken(accessToken)
        .user(user)
        .previousSessionTerminated(request.isForceLogin())
        .build();
}
```

### 4. 세션 무효화 알림 (WebSocket/SSE)

다른 브라우저의 세션을 강제 종료하기 위해 실시간 알림이 필요합니다.

#### WebSocket 예시
```java
@MessageMapping("/session/notify")
public void notifySessionTermination(String sessionId) {
    messagingTemplate.convertAndSend(
        "/topic/session/" + sessionId,
        new SessionTerminationMessage("FORCE_LOGOUT")
    );
}
```

#### 프론트엔드 WebSocket 연결
```typescript
const socket = new WebSocket('ws://localhost:8080/session');

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'FORCE_LOGOUT') {
    // 강제 로그아웃 처리
    handleForceLogout();
  }
};
```

### 5. 로그아웃 API

```java
public void logout(String sessionId) {
    sessionRepository.deactivateSession(sessionId);
}
```

## 프론트엔드 동작 흐름

1. **첫 번째 로그인 (A 브라우저)**
   - forceLogin: false → 정상 로그인
   - 세션 생성 및 토큰 발급

2. **두 번째 로그인 시도 (B 브라우저)**
   - forceLogin: false → duplicateLogin: true 응답
   - 프론트엔드에서 다이얼로그 표시

3. **사용자가 "강제 로그인" 선택**
   - forceLogin: true로 재요청
   - 백엔드에서 기존 세션 무효화
   - WebSocket으로 A 브라우저에 알림

4. **A 브라우저에서 강제 로그아웃 다이얼로그 표시**
   - "다른 위치에서 로그인하여 세션이 종료되었습니다"
   - 확인 클릭 시 로그인 페이지로 이동

## 테스트 시나리오

### 시나리오 1: Chrome에서 로그인 후 Firefox에서 로그인
1. Chrome에서 admin/admin123 로그인
2. Firefox에서 동일 계정으로 로그인 시도
3. 중복 로그인 다이얼로그 표시 확인
4. "강제 로그인" 선택
5. Chrome에서 강제 로그아웃 알림 확인

### 시나리오 2: 같은 브라우저 다른 탭
1. 탭1에서 로그인
2. 탭2에서 동일 계정 로그인 시도
3. 중복 로그인 감지 확인
4. 강제 로그인 시 탭1에서 즉시 로그아웃 확인

## 보안 고려사항

1. **세션 하이재킹 방지**
   - IP 주소 변경 감지
   - User-Agent 검증
   - 정기적인 토큰 갱신

2. **무차별 대입 공격 방지**
   - 로그인 시도 횟수 제한
   - 계정 잠금 기능

3. **세션 타임아웃**
   - 활동이 없으면 자동 로그아웃
   - 프론트엔드 타이머와 동기화

## 참고사항

- WebSocket 대신 Server-Sent Events(SSE) 사용 가능
- Redis 등 인메모리 DB로 세션 관리 권장
- 세션 정보는 민감 정보이므로 암호화 저장 권장
