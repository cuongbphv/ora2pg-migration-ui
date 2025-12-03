package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.DataTypeMappingRuleEntity;
import com.ora2pg.migration.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DataTypeMappingRuleRepository extends JpaRepository<DataTypeMappingRuleEntity, String> {
    List<DataTypeMappingRuleEntity> findByUserOrderByOracleTypeAsc(User user);
    List<DataTypeMappingRuleEntity> findByIsCustomFalseOrderByOracleTypeAsc();
    
    @Query("SELECT r FROM DataTypeMappingRuleEntity r WHERE r.user = :user OR r.isCustom = false ORDER BY r.oracleType ASC")
    List<DataTypeMappingRuleEntity> findByUserOrIsCustomFalseOrderByOracleTypeAsc(@Param("user") User user);
    
    Optional<DataTypeMappingRuleEntity> findByOracleTypeAndUser(String oracleType, User user);
}

