package com.example.dynamic_survey.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OptionDTO {
    private Long id;

    @NotBlank(message = "選項內容不可為空")
    private String optionText;

    private int orderIndex;
}
