package com.example.dynamic_survey.vo;

public record AppResponse<T>(int code, String message, T data) {
    public static <T> AppResponse<T> success(T data){
        return new AppResponse<>(RspCode.SUCCESS.getCode(), RspCode.SUCCESS.getMessage(), data);
    }

    public static <T> AppResponse<T> error(RspCode rspCode){
        return new AppResponse<>(rspCode.getCode(), rspCode.getMessage(), null);
    }

    public static <T> AppResponse<T> error(RspCode rspCode,String custumMessage){
        return new AppResponse<>(rspCode.getCode(), custumMessage, null);
    }
}
