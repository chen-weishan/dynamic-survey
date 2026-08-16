package com.example.dynamic_survey;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.example.dynamic_survey.entity.User;
import com.example.dynamic_survey.repository.UserRepository;
import com.example.dynamic_survey.security.JwtUtil;
import com.example.dynamic_survey.security.UserDetailsImpl;
import com.jayway.jsonpath.JsonPath;

/**
 * JWT 認證流程的整合測試：真的啟動整個應用程式，走完整條過濾鏈。
 *
 * 為什麼需要這一層（@WebMvcTest 明明比較快）：前面兩個測試檔各自證明了
 * 「JwtUtil 的簽章驗證是對的」與「Controller 的錯誤碼是對的」，
 * 但兩者都沒證明「這些零件真的被接在一起」。
 * SecurityConfig 少加一行 addFilterBefore，JwtAuthFilter 就完全不會執行，
 * 而上面那兩個測試會全部照樣通過。這種「零件都對、線沒接上」的 bug
 * 只有在真的送一個帶 token 的 HTTP 請求進去時才會現形。
 *
 * 這裡刻意不 mock 任何東西：資料庫用 H2 記憶體版（見 application-test.properties），
 * BCrypt、AuthenticationManager、JwtUtil、過濾鏈全部用真貨。
 * 一旦把 JwtUtil mock 掉，「簽章被竄改要擋下來」就變成測假的。
 *
 * @Transactional 讓每個測試方法結束後自動 rollback，
 * 所以測試之間不會因為前一個測試註冊過的帳號而互相干擾。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthFlowIntegrationTest {

    private static final String EMAIL = "vincent@example.com";
    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @AfterEach
    void clearSecurityContext() {
        // AuthService 登入成功時會寫進 SecurityContextHolder。
        // MockMvc 測試跑在同一條執行緒上，不清掉的話殘留的身分可能讓
        // 「未帶 token 應該 401」這種測試假性通過——那是最糟的一種綠燈。
        SecurityContextHolder.clearContext();
    }

    private String registerAndGetToken() throws Exception {
        String body = mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Vincent","email":"%s","password":"%s","phone":"0912345678"}
                        """.formatted(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return readToken(body);
    }

    private String readToken(String responseBody) {
        return JsonPath.read(responseBody, "$.data.token");
    }

    private String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }

    @Test
    @DisplayName("註冊成功會回傳 token，且資料庫存的是雜湊後的密碼")
    void registerReturnsTokenAndStoresHashedPassword() throws Exception {
        String token = registerAndGetToken();

        assertThat(token).isNotBlank();

        // 這是整份測試裡最該守住的一條：明文存密碼是資安事故，不是風格問題。
        User saved = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(saved.getPassword()).isNotEqualTo(PASSWORD);
        assertThat(saved.getPassword()).startsWith("$2"); // BCrypt 雜湊的固定開頭
    }

    @Test
    @DisplayName("正確帳密登入回 200 並帶回 token")
    void loginWithCorrectCredentialsSucceeds() throws Exception {
        registerAndGetToken();

        String body = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(EMAIL, PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        // token 不只是「非空字串」就好，要真的能被伺服器自己的密鑰解開，
        // 而且 subject 必須是這個使用者。
        JwtUtil jwtUtil = new JwtUtil(jwtSecret, 3_600_000);
        assertThat(jwtUtil.getUserNameFromJwtToken(readToken(body))).isEqualTo(EMAIL);
    }

    @Test
    @DisplayName("密碼錯誤回 401")
    void loginWithWrongPasswordIsRejected() throws Exception {
        registerAndGetToken();

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(EMAIL, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("帳號或密碼錯誤"));
    }

    @Test
    @DisplayName("帳號不存在與密碼錯誤回傳完全相同的訊息，無法用來枚舉帳號")
    void unknownAccountAndWrongPasswordAreIndistinguishable() throws Exception {
        registerAndGetToken();

        String wrongPassword = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(EMAIL, "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String unknownAccount = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("nobody@example.com", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        // 兩者回應完全一致，攻擊者就無法拿一份 email 清單來問「這個信箱有沒有註冊過」。
        assertThat(wrongPassword).isEqualTo(unknownAccount);
    }

    @Test
    @DisplayName("帶合法 token 取得個人資料，回的是本人的資料")
    void validTokenGrantsAccessToProfile() throws Exception {
        String token = registerAndGetToken();

        mockMvc.perform(get("/api/users/profile")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(EMAIL))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                // 回應絕不能把密碼欄位帶出去，即使是雜湊值。
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    @DisplayName("完全不帶 token 取得個人資料回 401")
    void missingTokenIsRejected() throws Exception {
        registerAndGetToken();

        mockMvc.perform(get("/api/users/profile"))
                .andExpect(status().isUnauthorized());

        // 注意這個 401 的來源：SecurityConfig 目前是 anyRequest().permitAll()，
        // 所以擋下請求的不是 Spring Security，而是 AuthService.getCurrentUser()
        // 自己檢查 principal 是不是 "anonymousUser"。
        // 測試通過不代表授權設定是對的，只代表這個端點碰巧有自己擋。
        // 每新增一個端點都得記得手寫這段檢查，漏一個就是未授權存取。
    }

    @Test
    @DisplayName("簽章被竄改的 token 回 401")
    void tamperedTokenIsRejected() throws Exception {
        String token = registerAndGetToken();

        // 只動最後一段（簽章），payload 保持不變——模擬攻擊者複製一張真 token 再亂改。
        String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "AAAAAAAAAAAAAAAAAAAA";

        mockMvc.perform(get("/api/users/profile")
                .header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("過期的 token 回 401")
    void expiredTokenIsRejected() throws Exception {
        registerAndGetToken();

        // 用伺服器同一把密鑰簽一張「出生即過期」的 token：
        // 簽章是對的，只有 exp 過期。這樣才測得到過期檢查本身，
        // 而不是又測一次簽章驗證。
        JwtUtil expiredIssuer = new JwtUtil(jwtSecret, -1000);
        UserDetailsImpl principal = new UserDetailsImpl(1L, EMAIL, "Vincent", "irrelevant",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        Authentication authentication = new UsernamePasswordAuthenticationToken(principal, null,
                principal.getAuthorities());
        String expired = expiredIssuer.generateJwtToken(authentication);

        mockMvc.perform(get("/api/users/profile")
                .header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authorization 標頭只有 Bearer 沒有 token 時回 401，且不會爆 500")
    void bearerWithoutTokenIsRejected() throws Exception {
        registerAndGetToken();

        // 這是前端很容易送出的東西（token 是 null 時字串拼接出 "Bearer "）。
        // 重點不只是 401，而是不能變成 500——伺服器內部錯誤代表沒處理好邊界。
        mockMvc.perform(get("/api/users/profile")
                .header("Authorization", "Bearer "))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("同一個 email 重複註冊回 409")
    void duplicateRegistrationIsRejected() throws Exception {
        registerAndGetToken();

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"Someone Else","email":"%s","password":"another-password","phone":"0987654321"}
                        """.formatted(EMAIL)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("錯誤！此電子郵件已被使用"));
    }

    @Test
    @DisplayName("更新個人資料需要有效 token，且新密碼同樣以雜湊儲存")
    void updateProfileRequiresTokenAndHashesNewPassword() throws Exception {
        String token = registerAndGetToken();

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .put("/api/users/profile")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name":"新名字","password":"new-password-456"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("新名字"));

        User updated = userRepository.findByEmail(EMAIL).orElseThrow();
        assertThat(updated.getPassword()).isNotEqualTo("new-password-456");
        assertThat(updated.getPassword()).startsWith("$2");
    }
}
