package com.example.dynamic_survey.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dynamic_survey.service.AuthService;
import com.example.dynamic_survey.vo.AppResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final AuthService authService;

    @GetMapping("/profile")
    public AppResponse<?> getProfile() {
        return authService.getCurrentUser();
    }

    @PutMapping("/profile")
    public AppResponse<?> updateProfile(@RequestBody Map<String, String> updates) {
        return authService.updateProfile(updates);
    }

}
