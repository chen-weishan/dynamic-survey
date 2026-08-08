package com.example.dynamic_survey.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "姓名不可為空")
    String name,
    @NotBlank(message = "Email 不可為空")
    @Email(message = "Email 格式不正確")
    String email,
    @NotBlank(message = "密碼不可為空")
    @Size(min = 6, message = "密碼至少需 6 個字元")
    String password,
    String phone
) {
} 
