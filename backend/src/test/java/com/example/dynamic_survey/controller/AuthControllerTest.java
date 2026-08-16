package com.example.dynamic_survey.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.example.dynamic_survey.dto.LoginRequest;
import com.example.dynamic_survey.exception.BizException;
import com.example.dynamic_survey.security.JwtUtil;
import com.example.dynamic_survey.security.UserDetailsServiceImpl;
import com.example.dynamic_survey.service.AuthService;
import com.example.dynamic_survey.vo.AppResponse;
import com.example.dynamic_survey.vo.RspCode;

/**
 * AuthController 的 Web 層測試。
 *
 * 為什麼用 @WebMvcTest 而不是 @SpringBootTest：這一層要驗證的是 HTTP 契約——
 * 請求進來有沒有被 @Valid 擋下、例外有沒有被 GlobalExceptionHandler 轉成正確的狀態碼、
 * 回應 JSON 長什麼樣。這些完全不需要資料庫，也不需要真的簽 token。
 * @WebMvcTest 只啟動 Web 層（controller + advice + 訊息轉換），啟動時間是 @SpringBootTest 的零頭。
 *
 * 為什麼 mock 掉 AuthService：它是這一層的「外部世界」。它真正的行為
 * （比對 BCrypt 密碼、簽發 token、寫進 SecurityContext）在 AuthFlowIntegrationTest 用真貨測。
 * 在這裡再測一次只會讓兩個測試在同一件事上重疊，壞掉時也分不出是誰的錯。
 *
 * 為什麼 addFilters = false：關掉 Spring Security 的過濾鏈。
 * @WebMvcTest 不會載入我們自己的 SecurityConfig（它只是宣告 @Bean 的 @Configuration，
 * 不在 @WebMvcTest 的掃描清單裡），留著只會套上 Spring Boot 的預設安全設定，
 * 讓每個請求都變成 401/403——那測到的是預設值，不是我們的設定，毫無價值。
 * 過濾鏈是否正確接上，由整合測試負責。
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    // 下面兩個 mock 不是這層要測的對象，純粹是為了讓容器起得來：
    // @WebMvcTest 的掃描清單包含 jakarta.servlet.Filter，所以 JwtAuthFilter 這個 @Component
    // 會被建立，而它的建構子要 JwtUtil 與 UserDetailsServiceImpl。
    // 上面已用 addFilters = false 停掉過濾鏈，這兩個 mock 在測試過程中不會被呼叫到。
    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
    }

    @Test
    @DisplayName("登入成功回 200 並帶回 token")
    void loginReturnsToken() throws Exception {
        // 用 willReturn(...).given(...) 而非 given(...).willReturn(...)：
        // AuthService 回傳型別是 AppResponse<?>，wildcard 會讓後者推導不出型別而編譯失敗。
        willReturn(AppResponse.success(Map.of("token", "fake-token-for-web-layer-test")))
                .given(authService).authenticateUser(any(LoginRequest.class));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("vincent@example.com", "password123")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.data.token").value("fake-token-for-web-layer-test"));
    }

    @Test
    @DisplayName("帳密錯誤回 401，且訊息不透露是帳號錯還是密碼錯")
    void badCredentialsReturns401WithoutLeakingWhichFieldIsWrong() throws Exception {
        // 這是安全需求，不是介面美化：如果錯誤訊息會區分「查無此帳號」與「密碼錯誤」，
        // 攻擊者就能拿一份 email 清單來枚舉哪些信箱在這個系統有註冊。
        willThrow(new BadCredentialsException("Bad credentials"))
                .given(authService).authenticateUser(any(LoginRequest.class));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("vincent@example.com", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.message").value("帳號或密碼錯誤"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    @DisplayName("email 格式錯誤在進到 service 之前就被擋下，回 400")
    void invalidEmailFormatIsRejectedBeforeService() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("not-an-email", "password123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.message").value("Email 格式不正確"));

        // 驗證失敗時 service 不該被呼叫到——這句話才是「@Valid 有生效」的證據。
        // 只看狀態碼 400 不夠：service 也可能自己丟出 400。
        org.mockito.BDDMockito.then(authService).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("密碼少於六字元回 400")
    void tooShortPasswordIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("vincent@example.com", "123")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("密碼至少需六個字元"));
    }

    @Test
    @DisplayName("註冊時 email 重複回 409")
    void duplicateEmailReturns409() throws Exception {
        // BizException 帶的 RspCode 會直接決定 HTTP 狀態碼，
        // 這條測試守的是「RspCode.DUPLICATE_ERROR(409) → HTTP 409」這個對應沒被改壞。
        willThrow(new BizException(RspCode.DUPLICATE_ERROR, "錯誤！此電子郵件已被使用"))
                .given(authService).registerUser(org.mockito.ArgumentMatchers.any());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"vincent@example.com","password":"password123","name":"Vincent","phone":"0912345678"}
                        """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409))
                .andExpect(jsonPath("$.message").value("錯誤！此電子郵件已被使用"));
    }
}
