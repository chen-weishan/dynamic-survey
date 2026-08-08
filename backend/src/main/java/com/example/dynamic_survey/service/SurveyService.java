package com.example.dynamic_survey.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.example.dynamic_survey.dto.AnswerDTO;
import com.example.dynamic_survey.dto.OptionDTO;
import com.example.dynamic_survey.dto.QuestionDTO;
import com.example.dynamic_survey.dto.ResponseDTO;
import com.example.dynamic_survey.dto.SurveyDTO;
import com.example.dynamic_survey.entity.Option;
import com.example.dynamic_survey.entity.Question;
import com.example.dynamic_survey.entity.ResponseAnswer;
import com.example.dynamic_survey.entity.Survey;
import com.example.dynamic_survey.entity.SurveyResponse;
import com.example.dynamic_survey.entity.User;
import com.example.dynamic_survey.exception.BizException;
import com.example.dynamic_survey.repository.SurveyRepository;
import com.example.dynamic_survey.repository.SurveyResponseRepository;
import com.example.dynamic_survey.repository.UserRepository;
import com.example.dynamic_survey.security.UserDetailsImpl;
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
        dto.setQuestions(s.getQuestions().stream().map(q -> {
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
        survey.getQuestions().clear();
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
            survey.getQuestions().add(question);
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
                                "userEmail", r.getEmail(), "submmitedAt", r.getSubmittedAt())))
                        .collect(Collectors.toList()));
    }

    // 單一作答者的詳細內容
    public AppResponse<?> getResponseDetail(Long responseId) {
        SurveyResponse surveyResponse = responseRepository.findById(responseId)
                .orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
        Map<String, Object> result = new HashMap<>();
        result.put("responseId", surveyResponse.getId());
        result.put("userName", surveyResponse.getName());
        result.put("submmitedAt", surveyResponse.getSubmittedAt());
        result.put("surveyTitle", surveyResponse.getSurvey().getTitle());
        result.put("details", surveyResponse.getAnswers().stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("questionTitle", a.getQuestion().getTitle());
            map.put("type", a.getQuestion().getType());
            map.put("answer", a.getAnswerText());
            return map;
        }).collect(Collectors.toList()));
        return AppResponse.success(result);
    }

    // 統計一份問卷多個回應的填答結果
    public AppResponse<?> getSurveyStats(Long id) {
        Survey survey = surveyRepository.findById(id).orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
        List<SurveyResponse> responses = responseRepository.findBySurveyId(id);
        int totalResponses = responses.size();

        Map<String, Object> status = new HashMap<>();
        status.put("surveyId", survey.getId());
        status.put("surveyTitle", survey.getTitle());
        status.put("totalResponses", totalResponses);

        List<Map<String, Object>> qStatusList = new ArrayList<>();
        for (Question q : survey.getQuestions()) {
            Map<String, Object> qMap = new HashMap<>();
            qMap.put("questionId", q.getId());
            qMap.put("questionTitle", q.getTitle());
            qMap.put("type", q.getType());
            if ("TEXT".equals(String.valueOf(q.getType()))) {
                qMap.put("textAnswers", responses.stream()
                        .flatMap(r -> r.getAnswers().stream())
                        .filter(a -> a.getQuestion().getId().equals(q.getId()))
                        .map(ResponseAnswer::getAnswerText)
                        .filter(Objects::nonNull).collect(Collectors.toList()));
            } else {
                Map<Long, Map<String, Object>> optMap = new HashMap<>();
                for (Option o : q.getOptions()) {
                    Map<String, Object> oData = new HashMap<>();
                    oData.put("optionText", o.getOptionText());
                    oData.put("count", 0);
                    optMap.put(o.getId(), oData);
                }
                responses.stream().flatMap(r -> r.getAnswers().stream())
                        .filter(a -> a.getQuestion().getId().equals(q.getId()))
                        .flatMap(a -> a.getSelectedOption().stream())
                        .forEach(o -> {
                            Map<String, Object> oData = optMap.get(o.getId());
                            if (oData != null)
                                oData.put("count", (int) oData.get("count") + 1);
                        });
                for (Map<String, Object> oData : optMap.values()) {
                    double pct = totalResponses > 0 ? ((int) oData.get("count") * 100.0 / totalResponses) : 0;
                    oData.put("percentage", Math.round(pct * 10.0) / 10.0);
                }
                qMap.put("optionStats", optMap);
            }
            qStatusList.add(qMap);
        }
        status.put("questionStats", qStatusList);
        return AppResponse.success(status);
    }

    // 前台操作
    // 取得進行中的問卷 (首頁用)
    public AppResponse<List<SurveyDTO>> getActiveSurveys() {
        List<Survey> surveys = surveyRepository.findActiveSurveys();
        return AppResponse.success(surveys.stream().map(this::convertToDto).collect(Collectors.toList()));
    }

    // 暫存作答至 Session (含重複作答檢查)
    public AppResponse<?> saveToSession(ResponseDTO submission, HttpSession session) {
        if (responseRepository.existsBySurveyIdAndEmail(submission.surveyId(), submission.email())) {
            throw new BizException(RspCode.DUPLICATE_ERROR, "此 Email 已填寫過本問卷");
        }
        session.setAttribute(SURVEY_SESSION_KEY, submission);
        return AppResponse.success(null);
    }

    // 從 Session 取回暫存資料 (確認頁用)
    public AppResponse<ResponseDTO> getFromSession(HttpSession session) {
        ResponseDTO responseDTO = (ResponseDTO) session.getAttribute(SURVEY_SESSION_KEY);
        if (responseDTO == null)
            throw new BizException(RspCode.NOT_FOUND);
        return AppResponse.success(responseDTO);
    }

    // 從 session 中確認提交
    @Transactional
    public AppResponse<?> commitFromSession(HttpSession sessoin) {
        ResponseDTO responseDTO = (ResponseDTO) sessoin.getAttribute(SURVEY_SESSION_KEY);
        if (responseDTO == null)
            throw new BizException(RspCode.NOT_FOUND);
        AppResponse<?> response = submitResponse(responseDTO.surveyId(), responseDTO);
        sessoin.removeAttribute(SURVEY_SESSION_KEY);
        return response;
    }

    // 寫入作答
    public AppResponse<?> submitResponse(Long surveyId, ResponseDTO responseDTO) {
        Survey survey = surveyRepository.findById(surveyId).orElseThrow(() -> new BizException(RspCode.NOT_FOUND));
        SurveyResponse response = new SurveyResponse();
        response.setSurvey(survey);
        response.setSubmittedAt(LocalDateTime.now());
        response.setName(responseDTO.name());
        response.setPhone(responseDTO.phone());
        response.setEmail(responseDTO.email());
        response.setAge(responseDTO.age());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            UserDetailsImpl userDetailsImpl = (UserDetailsImpl) auth.getPrincipal();
            response.setUser(userRepository.findById(userDetailsImpl.getId()).orElse(null));
        }
        for (AnswerDTO aDto : responseDTO.answers()) {
            ResponseAnswer answer = new ResponseAnswer();
            answer.setSurveyResponse(response);
            Question question = survey.getQuestions().stream()
                    .filter(q -> q.getId().equals(aDto.questionId()))
                    .findFirst().orElse(null);
            if (question == null)
                continue;
            answer.setQuestion(question);
            if (question.getType().equals("TEXT")) {
                answer.setAnswerText(aDto.answerText());
            } else {
                List<Option> selected = question.getOptions().stream()
                        .filter(o -> aDto.optionIds().contains(o.getId()))
                        .collect(Collectors.toList());
                answer.setSelectedOption(selected);
                answer.setAnswerText(selected.stream().map(Option::getOptionText).collect(Collectors.joining(";")));
            }
            response.getAnswers().add(answer);
        }
        responseRepository.save(response);
        return AppResponse.success(null);
    }

    // 個人歷史紀錄
    public AppResponse<?> getUserHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken)
            throw new BizException(RspCode.UNAUTHORIZED);
        UserDetailsImpl userDetailsImpl = (UserDetailsImpl) auth.getPrincipal();
        User user = userRepository.findById(userDetailsImpl.getId()).orElse(null);
        List<SurveyResponse> history = responseRepository.findByUserOrderBySubmittedAtDesc(user);
        return AppResponse.success(history.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("responseId", r.getId());
            map.put("surveyId", r.getSurvey().getId());
            map.put("surveyTitle", r.getSurvey().getTitle());
            map.put("submittedAt", r.getSubmittedAt());
            return map;
        }).collect(Collectors.toList()));
    }
}