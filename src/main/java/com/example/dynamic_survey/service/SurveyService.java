package com.example.dynamic_survey.service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.example.dynamic_survey.dto.OptionDTO;
import com.example.dynamic_survey.dto.QuestionDTO;
import com.example.dynamic_survey.dto.SurveyDTO;
import com.example.dynamic_survey.entity.Option;
import com.example.dynamic_survey.entity.Question;
import com.example.dynamic_survey.entity.Survey;
import com.example.dynamic_survey.entity.SurveyResponse;
import com.example.dynamic_survey.exception.BizException;
import com.example.dynamic_survey.repository.SurveyRepository;
import com.example.dynamic_survey.repository.SurveyResponseRepository;
import com.example.dynamic_survey.repository.UserRepository;
import com.example.dynamic_survey.vo.AppResponse;
import com.example.dynamic_survey.vo.RspCode;

import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SurveyService {
    private final SurveyRepository surveyRepository;
    private final UserRepository userRepository;
    private final SurveyResponseRepository responseRepository;

    private static final String ADMIN_EDIT_SESSION_KEY = "TEMP_ADMIN_SURVEY";
    private static final String SURVEY_SESSION_KEY = "TEMP_SURVEY_RESPONSE";

    private SurveyDTO convertToDto(Survey s) {
        SurveyDTO dto = new SurveyDTO();
        dto.setId(s.getId());
        dto.setTitle(s.getTitle());
        dto.setDescription(s.getDescription());
        dto.setStartDate(s.getStartDate());
        dto.setEndDate(s.getEndDate());
        dto.setStatus(s.getStatus());
        dto.setQuestions(s.getQusetions().stream().map(q -> {
            QuestionDTO qDto = new QuestionDTO();
            qDto.setId(q.getId());
            qDto.setTitle(q.getTitle());
            qDto.setType(q.getType());
            qDto.setRequired(q.isRequired());
            qDto.setOrderIndex(q.getOrderIndex());
            qDto.setOptions(q.getOptions().stream().map(o -> {
                OptionDTO oDto = new OptionDTO();
                oDto.setId(o.getId());
                oDto.setOptionText(o.getOptionText());
                oDto.setOrderIndex(o.getOrderIndex());
                return oDto;
            }).collect(Collectors.toList()));
            return qDto;
        }).collect(Collectors.toList()));
        return dto;
    }

    // 儲存問卷
    @Transactional
    public AppResponse<SurveyDTO> saveSurvey(SurveyDTO dto) {
        Survey survey = (dto.getId() == null) ? new Survey()
                : surveyRepository.findById(dto.getId()).orElse(new Survey());
        survey.setTitle(dto.getTitle());
        survey.setDescription(dto.getDescription());
        survey.setStartDate(dto.getStartDate());
        survey.setEndDate(dto.getEndDate());
        survey.setStatus(dto.getStatus());
        survey.getQusetions().clear();
        for (QuestionDTO qDto : dto.getQuestions()) {
            Question question = new Question();
            question.setSurvey(survey);
            question.setTitle(qDto.getTitle());
            question.setType(qDto.getType());
            question.setRequired(qDto.isRequired());
            question.setOrderIndex(qDto.getOrderIndex());
            if (qDto.getOptions() != null) {
                for (OptionDTO oDto : qDto.getOptions()) {
                    Option option = new Option();
                    option.setQuestion(question);
                    option.setOptionText(oDto.getOptionText());
                    option.setOrderIndex(oDto.getOrderIndex());
                    question.getOptions().add(option);
                }
            }
            survey.getQusetions().add(question);
        }
        return AppResponse.success(convertToDto(surveyRepository.save(survey)));
    }

    // 後台列表 (含篩選，並標記是否已有作答)
    public AppResponse<List<SurveyDTO>> getSurveyByAdmin(String title, LocalDate starDate, LocalDate endDate) {
        List<Survey> surveys = surveyRepository.findByFilters(title, starDate, endDate);
        return AppResponse.success(surveys.stream().map(s -> {
            SurveyDTO dto = convertToDto(s);
            dto.setHasResponse(responseRepository.existsBySurveyId(s.getId()));
            return dto;
        }).collect(Collectors.toList()));
    }

    // 取得單一問卷詳情
    public AppResponse<SurveyDTO> getSurveyDetails(Long id) {
        return surveyRepository.findById(id).map(s -> AppResponse.success(convertToDto(s)))
                .orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
    }

    // 刪除問卷
    public AppResponse<?> deleteSurvey(Long id) {
        if (responseRepository.existsBySurveyId(id)) {
            throw new BizException(RspCode.PARAM_ERROR, "此問卷已有作答紀錄，刪除失敗");
        }
        surveyRepository.deleteById(id);
        return AppResponse.success(null);
    }

    // 暫存編輯中的問卷到 session 中
    public AppResponse<?> saveAdminSurveyToSession(SurveyDTO surveyDTO, HttpSession session) {
        session.setAttribute(ADMIN_EDIT_SESSION_KEY, surveyDTO);
        return AppResponse.success(null);
    }

    // 從 session 中取出問卷
    public AppResponse<SurveyDTO> getAdminSurveyFromSession(HttpSession session) {
        SurveyDTO surveyDTO = (SurveyDTO) session.getAttribute(ADMIN_EDIT_SESSION_KEY);
        if (surveyDTO == null)
            throw new BizException(RspCode.NOT_FOUND, "找不到編輯中的資料");
        return AppResponse.success(surveyDTO);
    }

    // 從 session 中提交問卷
    public AppResponse<SurveyDTO> commitAdminSurveyFromSession(boolean isPublish, HttpSession session) {
        SurveyDTO surveyDTO = (SurveyDTO) session.getAttribute(ADMIN_EDIT_SESSION_KEY);
        if (surveyDTO == null)
            throw new BizException(RspCode.NOT_FOUND);
        surveyDTO.setStatus(isPublish ? "PUBLISHED" : "DRAFT");
        AppResponse<SurveyDTO> response = saveSurvey(surveyDTO);
        session.removeAttribute(ADMIN_EDIT_SESSION_KEY);
        return response;
    }

    // 某問卷的所有填寫者名單
    public AppResponse<?> getSurveyResponses(Long id) {
        List<SurveyResponse> responses = responseRepository.findBySurveyIdOrderByIdDesc(id);
        return AppResponse
                .success(responses
                        .stream().map(r -> new HashMap<>(Map.of("responseId", r.getId(), "userName", r.getName(),
                                "userEmail", r.getEmail(), "submmitedAt", r.getSubbmitedAt())))
                        .collect(Collectors.toList()));
    }

    // 單一作答者的詳細內容
    public AppResponse<?> getResponseDetails(Long responseId){
        SurveyResponse surveyResponse = responseRepository.findById(responseId).orElseThrow(()->new BizException(RspCode.NOT_FOUND));
        Map<String, Object> result = new HashMap<>();
        result.put("responseId", surveyResponse.getId());
        result.put("userName",surveyResponse.getName());
        result.put("submmitedAt", surveyResponse.getSubbmitedAt());
        result.put("surveyTitle",surveyResponse.getSurvey().getTitle());
        result.put("details",surveyResponse.getAnswers().stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("questionTitle",a.getQusetion().getTitle());
            map.put("type",a.getQusetion().getType());
            map.put("answer",a.getAnswerText());
            return map;
        }).collect(Collectors.toList()));
        return AppResponse.success(result);
    }
}
