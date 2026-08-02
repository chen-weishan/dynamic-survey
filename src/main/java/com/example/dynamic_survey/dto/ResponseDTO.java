package com.example.dynamic_survey.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

public record ResponseDTO(
        Long surveyId,
        @NotBlank(message = "姓名不可為空") String name,
        @NotBlank(message = "手機不可為空") String phone,
        @NotBlank(message = "Email 不可為空") String email,

        Integer age,
        List<AnswerDTO> answers) {
}
