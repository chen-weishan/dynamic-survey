package com.example.dynamic_survey.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;

/**
 * JwtUtil 的純單元測試：不啟動 Spring，直接 new。
 *
 * 為什麼在這一層測：JwtUtil 的建構子雖然標了 @Value，但它就是一個普通建構子，
 * 給兩個參數就能建立實例。簽章、過期、竄改這些行為完全由 jjwt 決定，
 * 跟 Spring 容器、資料庫、HTTP 都無關。啟動 Spring 只會讓這些測試慢上百倍，
 * 卻不會多測到任何東西。
 *
 * 這裡不 mock 任何東西。密碼學行為正是我們要驗證的對象——把 jjwt mock 掉
 * 就變成「測試我自己寫的假物件會不會照我寫的回答」，毫無意義。
 */
class JwtUtilTest {

    /** 測試專用假密鑰，與 application-test.properties 同一把。HS512 需要 >= 512 bits。 */
    private static final String SECRET = Base64.getEncoder()
            .encodeToString("dynamic-survey-test-only-secret-not-for-production-use-0123456789".getBytes());

    /** 另一把密鑰，用來模擬「別人拿自己的密鑰簽了一張 token 來騙我們」。 */
    private static final String OTHER_SECRET = Base64.getEncoder()
            .encodeToString("some-attacker-secret-key-that-is-long-enough-for-hs512-algorithm".getBytes());

    private static final int ONE_HOUR = 3_600_000;

    private Authentication authenticationOf(String email) {
        UserDetailsImpl principal = new UserDetailsImpl(1L, email, "測試使用者", "irrelevant",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    @DisplayName("簽發的 token 可被解析，subject 是使用者 email")
    void generatesTokenCarryingEmailAsSubject() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, ONE_HOUR);

        String token = jwtUtil.generateJwtToken(authenticationOf("vincent@example.com"));

        assertThat(jwtUtil.getUserNameFromJwtToken(token)).isEqualTo("vincent@example.com");
        assertThat(jwtUtil.validateJwtToken(token, "vincent@example.com")).isTrue();
    }

    @Test
    @DisplayName("token 內不得含有密碼")
    void tokenDoesNotLeakPassword() {
        // JWT 的 payload 只是 Base64 編碼，不是加密。任何人拿到 token 都能讀出內容。
        // 這個測試守的是「不要把敏感資料塞進 token」這條線。
        JwtUtil jwtUtil = new JwtUtil(SECRET, ONE_HOUR);
        UserDetailsImpl principal = new UserDetailsImpl(1L, "vincent@example.com", "測試使用者", "my-secret-password",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null,
                principal.getAuthorities());

        String token = jwtUtil.generateJwtToken(authentication);
        String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]));

        assertThat(payload).doesNotContain("my-secret-password");
    }

    @Test
    @DisplayName("token 的 email 與宣稱的身分不符時，驗證不通過")
    void rejectsTokenBelongingToAnotherUser() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, ONE_HOUR);

        String token = jwtUtil.generateJwtToken(authenticationOf("vincent@example.com"));

        assertThat(jwtUtil.validateJwtToken(token, "someone-else@example.com")).isFalse();
    }

    @Test
    @DisplayName("過期的 token 會丟 ExpiredJwtException，不是回傳 false")
    void expiredTokenThrowsInsteadOfReturningFalse() {
        // 負的有效期 = 一簽出來就已過期。這比 Thread.sleep 等一小時可靠得多，
        // 而且測試不會因為機器慢而偶爾失敗。
        JwtUtil expiringImmediately = new JwtUtil(SECRET, -1000);

        String token = expiringImmediately.generateJwtToken(authenticationOf("vincent@example.com"));

        // 注意這裡驗證的是「實際行為」而非「直覺行為」：
        // jjwt 的 parseSignedClaims() 自己就會檢查 exp 並丟例外，
        // 所以 validateJwtToken() 裡那段 !expired 的判斷其實永遠執行不到。
        // 測試如實記錄現況，而不是記錄我們以為的樣子——這樣將來有人改掉這段，測試才會說話。
        assertThatThrownBy(() -> expiringImmediately.validateJwtToken(token, "vincent@example.com"))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    @DisplayName("用別把密鑰簽的 token 會被拒絕")
    void rejectsTokenSignedWithAnotherKey() {
        JwtUtil attacker = new JwtUtil(OTHER_SECRET, ONE_HOUR);
        JwtUtil server = new JwtUtil(SECRET, ONE_HOUR);

        String forged = attacker.generateJwtToken(authenticationOf("vincent@example.com"));

        assertThatThrownBy(() -> server.getUserNameFromJwtToken(forged))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    @DisplayName("payload 被竄改的 token 會被拒絕")
    void rejectsTamperedPayload() {
        // 模擬攻擊者把 payload 的 email 改成別人，簽章段原封不動送回來。
        // 這是 JWT 最核心的保證：改了內容，簽章就對不上。
        JwtUtil jwtUtil = new JwtUtil(SECRET, ONE_HOUR);
        String token = jwtUtil.generateJwtToken(authenticationOf("vincent@example.com"));

        String[] parts = token.split("\\.");
        String originalPayload = new String(Base64.getUrlDecoder().decode(parts[1]));
        String tamperedPayload = originalPayload.replace("vincent@example.com", "admin@example.com");
        String tamperedToken = parts[0] + "."
                + Base64.getUrlEncoder().withoutPadding().encodeToString(tamperedPayload.getBytes())
                + "." + parts[2];

        assertThatThrownBy(() -> jwtUtil.getUserNameFromJwtToken(tamperedToken))
                .isInstanceOf(SignatureException.class);
    }

    @Test
    @DisplayName("完全不是 JWT 格式的字串會被拒絕")
    void rejectsGarbageToken() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, ONE_HOUR);

        assertThatThrownBy(() -> jwtUtil.getUserNameFromJwtToken("not-a-token"))
                .isInstanceOf(io.jsonwebtoken.JwtException.class);
    }
}
