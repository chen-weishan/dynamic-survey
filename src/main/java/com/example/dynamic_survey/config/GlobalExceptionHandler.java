package com.example.dynamic_survey.config;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.example.dynamic_survey.exception.BizException;
import com.example.dynamic_survey.vo.AppResponse;
import com.example.dynamic_survey.vo.RspCode;

@RestControllerAdvice
public class GlobalExceptionHandler {
    // 攔截 @Valid 驗證失敗，回傳第一筆錯誤訊息
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AppResponse<Map<String, String>>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String field = ((FieldError) error).getField();
            errors.put(field, error.getDefaultMessage());
        });
        String firstMsg = errors.values().stream().findFirst().orElse("參數驗證失敗");
        return ResponseEntity.badRequest().body(AppResponse.error(RspCode.PARAM_ERROR, firstMsg));
    }

    // 帳密錯誤：Spring Security 驗證失敗時丟出
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<AppResponse<?>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(AppResponse.error(RspCode.UNAUTHORIZED, "帳號或密碼錯誤"));
    }

    // 業務例外：HTTP 狀態碼直接取自 RspCode
    @ExceptionHandler(BizException.class)
    public ResponseEntity<AppResponse<?>> handleBizException(BizException ex) {
        return ResponseEntity.status(ex.getRspCode().getCode())
                .body(AppResponse.error(ex.getRspCode(), ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<AppResponse<String>> handleAllException(Exception ex) {
        return ResponseEntity.internalServerError()
                .body(AppResponse.error(RspCode.INTERNAL_SERVER_ERROR, ex.getMessage()));
    }
}
