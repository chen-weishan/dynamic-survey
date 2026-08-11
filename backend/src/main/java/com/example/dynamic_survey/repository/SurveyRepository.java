package com.example.dynamic_survey.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.example.dynamic_survey.entity.Survey;

public interface SurveyRepository extends JpaRepository<Survey, Long> {
    @Query("SELECT s FROM Survey s WHERE s.status = 'PUBLISHED' AND s.startDate <= CURRENT_DATE AND s.endDate >= CURRENT_DATE")
    List<Survey> findActiveSurveys();

    /*
     * 日期條件問的是「這段期間內能不能作答」，也就是問卷開放區間與查詢區間有沒有重疊，
     * 不是「問卷的起訖日整段落在查詢區間裡」。
     *
     * 舊寫法 (s.startDate >= :startDate AND s.endDate <= :endDate) 是後者，
     * 於是一份 6/1 ~ 9/30 的問卷，用 7/1 ~ 7/31 查會查不到——但那段期間它明明開放中。
     *
     * 重疊的判定：問卷結束不早於查詢起點，且問卷開始不晚於查詢終點。
     * 只給其中一邊時，另一邊視為無限遠，條件自然退化成單邊比較：
     * 只給開始日 → 該日之後仍開放的問卷；只給結束日 → 該日之前已開放的問卷。
     */
    @Query("SELECT s FROM Survey s WHERE " +
            "(:title IS NULL OR s.title LIKE %:title%) AND" +
            "(:startDate IS NULL OR s.endDate >= :startDate) AND" +
            "(:endDate IS NULL OR s.startDate <= :endDate)")
    List<Survey> findByFilters(
            @Param("title") String title,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);
}
