package com.example.dynamic_survey.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.dynamic_survey.dto.ResponseDTO;
import com.example.dynamic_survey.service.SurveyService;
import com.example.dynamic_survey.vo.AppResponse;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/surveys")
@RequiredArgsConstructor
public class SurveyController {
    private final SurveyService surveyService;

    // 查詢開放中問卷
    @GetMapping
    public AppResponse<?> getActiceSurveys() {
        return surveyService.getActiveSurveys();
    }

    // 以 id 查詢一份問卷的細節
    @GetMapping("/{id}/details")
    public AppResponse<?> getSurveyDetails(@PathVariable("id") Long id) {
        return surveyService.getSurveyDetails(id);
    }

    // 三步驟作答流程
    @PostMapping("/session-store")
    public AppResponse<?> storeInSession(@RequestBody ResponseDTO responseDTO, HttpSession session) {
        return surveyService.saveToSession(responseDTO, session);
    }

    @GetMapping("/session-get")
    public AppResponse<?> getFromSession(HttpSession session) {
        return surveyService.getFromSession(session);
    }

    @PostMapping("/confirm")
    public AppResponse<?> confirmSubmit(HttpSession session) {
        return surveyService.commitFromSession(session);
    }

    // 直接提交
    @PostMapping("/{id}/submit")
    public AppResponse<?> submitResponse(@PathVariable("id") Long id, @RequestBody ResponseDTO responseDTO){
        return surveyService.submitResponse(id, responseDTO);
    }

    // 查詢個人紀錄
    @GetMapping("/history")
    public AppResponse<?> getUserHistory(){
        return surveyService.getUserHistory();
    }
}
