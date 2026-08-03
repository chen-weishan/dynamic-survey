package com.example.dynamic_survey.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.example.dynamic_survey.vo.AppResponse;
import com.example.dynamic_survey.vo.RspCode;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AppResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex){
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError)error).getField();
            errors.put(field, error.getDefaultMessage());
        });
        String firstMsg = errors.values().stream().findFirst().orElse("參數驗證失敗");
        return ResponseEntity.badRequest().body(AppResponse.error(RspCode.PARAM_ERROR,firstMsg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AppResponse<String>> handleAllException(Exception ex){
        return ResponseEntity.internalServerError().body(AppResponse.error(RspCode.INTERNAL_SERVER_ERROR,ex.getMessage()));
    }
}
