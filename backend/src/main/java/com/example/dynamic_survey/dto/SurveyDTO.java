package com.example.dynamic_survey.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SurveyDTO {
    private Long id;

    @NotBlank(message = "問卷標題不可為空")
    @Size(max = 50, message = "問卷標題不可超過 50 字")
    private String title;

    @Size(max = 300, message = "問卷說明不可超過 300 字")
    private String description;

    @NotNull(message = "問卷開始日期不可為空")
    private LocalDate startDate;
    @NotNull(message = "問卷結束日期不可為空")
    private LocalDate endDate;
    @NotBlank(message = "問卷狀態不可為空")
    private String status; // DRAFT / PUBLISHED

    private boolean hasResponse; // 是否已有人作答 (前端判斷可否刪除)

    @Valid
    @NotNull(message = "問卷題目列表不可為空")
    @Size(min = 1, message = "問卷至少需包含一個題目")
    private List<QuestionDTO> questions;
}
