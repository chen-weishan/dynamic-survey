package com.example.dynamic_survey.exception;

import com.example.dynamic_survey.vo.RspCode;

import lombok.Getter;

@Getter
public class BizException extends RuntimeException {

    private final RspCode rspCode;

    public BizException(RspCode rspCode) {
        super(rspCode.getMessage());
        this.rspCode = rspCode;
    }

    public BizException(RspCode rspCode, String customMessage) {
        super(customMessage);
        this.rspCode = rspCode;
    }

}
