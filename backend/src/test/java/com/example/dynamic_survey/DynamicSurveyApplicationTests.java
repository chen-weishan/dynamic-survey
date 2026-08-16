package com.example.dynamic_survey;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 最基本的一條：Spring 容器起得來，所有 bean 都能被建立與注入。
 * 看似空洞，但少一個 bean、多一個循環依賴、設定檔打錯字，這裡就會紅。
 *
 * 需要 @ActiveProfiles("test")：正式設定的 DB 帳密與 JWT 密鑰由環境變數提供，
 * 沒設就啟動失敗（那是刻意的）。測試改用 application-test.properties 的 H2 與假密鑰。
 */
@SpringBootTest
@ActiveProfiles("test")
class DynamicSurveyApplicationTests {

	@Test
	void contextLoads() {
	}

}
