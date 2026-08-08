package com.example.dynamic_survey.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dynamic_survey.dto.SurveyDTO;
import com.example.dynamic_survey.service.SurveyService;
import com.example.dynamic_survey.vo.AppResponse;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/api/admin/surveys")
@RequiredArgsConstructor
public class AdminSurveyController {
    private final SurveyService surveyService;

    // 後台操作
    // 取得後台列表 (含篩選，並標記是否已有作答)
    @GetMapping
    public AppResponse<?> getSurveys(
            @RequestParam(name = "title", required = false) String title,
            @RequestParam(name = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(name = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return surveyService.getSurveyByAdmin(title, startDate, endDate);
    }

    // 取得單一問卷詳情
    @GetMapping("/{id}")
    public AppResponse<?> getSurveyById(@PathVariable("id") Long id) {
        return surveyService.getSurveyDetails(id);
    }

    // 新增問卷
    @PostMapping("")
    public AppResponse<?> createSurvey(@Valid @RequestBody SurveyDTO surveyDTO) {
        return surveyService.saveSurvey(surveyDTO);
    }

    // 修改問卷
    @PutMapping("/{id}")
    public AppResponse<?> updateSurvey(@PathVariable("id") Long id, @Valid @RequestBody SurveyDTO surveyDTO) {
        surveyDTO.setId(id);
        return surveyService.saveSurvey(surveyDTO);
    }

    // 刪除問卷
    @DeleteMapping("{id}")
    public AppResponse<?> deleteSurvey(@PathVariable("id") Long id) {
        return surveyService.deleteSurvey(id);
    }

    // 編輯流程
    @PostMapping("/session-store")
    public AppResponse<?> storeSurveyInSession(@RequestBody SurveyDTO surveyDTO, HttpSession session) {
        return surveyService.saveAdminSurveyToSession(surveyDTO, session);
    }

    @GetMapping("/session-get")
    public AppResponse<?> getSurveyFromSession(HttpSession session) {
        return surveyService.getAdminSurveyFromSession(session);
    }

    @PostMapping("/confirm-commit")
    public AppResponse<?> confirmSurveyCommit(@Valid @RequestParam(name = "isPublish") boolean isPublish,
            HttpSession session) {
        return surveyService.commitAdminSurveyFromSession(isPublish, session);
    }

    // 查詢單一問卷統計
    @GetMapping("/{id}/stats")
    public AppResponse<?> getSurveyStats(@PathVariable("id") Long id) {
        return surveyService.getSurveyStats(id);
    }

    // 查詢作答明細
    @GetMapping("/{id}/responses")
    public AppResponse<?> getSurveyResponses(@PathVariable("id") Long id) {
        return surveyService.getSurveyResponses(id);
    }

    @GetMapping("/response-detail/{response-id}")
    public AppResponse<?> getResponseDatail(@PathVariable("response-id") Long responseId) {
        return surveyService.getResponseDetail(responseId);
    }
}
