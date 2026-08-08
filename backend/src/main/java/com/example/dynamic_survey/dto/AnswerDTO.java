package com.example.dynamic_survey.dto;

import java.util.List;

public record AnswerDTO(
        Long questionId,
        List<Long> optionIds,
        String answerText) {
}
