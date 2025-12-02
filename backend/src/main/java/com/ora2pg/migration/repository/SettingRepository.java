package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.SettingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SettingRepository extends JpaRepository<SettingEntity, String> {
    List<SettingEntity> findByParamTab(String paramTab);
    Optional<SettingEntity> findByParamKeyAndParamTab(String paramKey, String paramTab);
    void deleteByParamKeyAndParamTab(String paramKey, String paramTab);
}

