package com.example.dynamic_survey.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.example.dynamic_survey.dto.LoginRequest;
import com.example.dynamic_survey.dto.RegisterRequest;
import com.example.dynamic_survey.entity.User;
import com.example.dynamic_survey.exception.BizException;
import com.example.dynamic_survey.repository.UserRepository;
import com.example.dynamic_survey.security.JwtUtil;
import com.example.dynamic_survey.security.UserDetailsImpl;
import com.example.dynamic_survey.vo.AppResponse;
import com.example.dynamic_survey.vo.RspCode;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    public AppResponse<?> registerUser(RegisterRequest signUpRequest) {
        if (userRepository.existsByEmail(signUpRequest.email())) {
            throw new BizException(RspCode.DUPLICATE_ERROR, "錯誤！此電子郵件已被使用");
        }
        User user = new User();
        user.setEmail(signUpRequest.email());
        user.setName(signUpRequest.name());
        user.setPassword(encoder.encode(signUpRequest.password()));
        user.setPhone(signUpRequest.phone());
        user.setRole("ADMIN");
        userRepository.save(user);

        // 註冊完直接幫使用者登入，回傳 Token
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail(signUpRequest.email());
        loginRequest.setPassword(signUpRequest.password());
        return authenticateUser(loginRequest);
    }

    public AppResponse<?> authenticateUser(LoginRequest loginRequest) {
        // 1. 交給 Spring Security 驗證帳密
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));
        // 2. 登記到 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);
        // 3. 簽發 JWT 並回傳
        String jwt = jwtUtil.generateJwtToken(authentication);
        Map<String, String> response = new HashMap<>();
        response.put("token", jwt);
        return AppResponse.success(response);
    }

    public AppResponse<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal().equals("anonymousUser")) {
            throw new BizException(RspCode.UNAUTHORIZED);
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId()).orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
        return AppResponse.success(userToMap(user));
    }

    public AppResponse<?> updateProfile(Map<String, String> updates) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetailsImpl = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetailsImpl.getId())
                .orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
        if (updates.containsKey("name"))
            user.setName(updates.get("name"));
        if (updates.containsKey("phone"))
            user.setPhone(updates.get("phone"));
        if (updates.get("password") != null && !updates.get("password").isEmpty()) {
            user.setPassword(encoder.encode(updates.get("password")));
        }
        userRepository.save(user);
        return AppResponse.success(userToMap(user));
    }

    private Map<String, Object> userToMap(User user) {
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("email", user.getEmail());
        userInfo.put("name", user.getName());
        userInfo.put("phone", user.getPhone());
        userInfo.put("role", user.getRole());
        return userInfo;
    }
}
