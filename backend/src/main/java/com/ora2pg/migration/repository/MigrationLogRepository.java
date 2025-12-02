package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.MigrationLogEntity;
import com.ora2pg.migration.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MigrationLogRepository extends JpaRepository<MigrationLogEntity, String> {
    List<MigrationLogEntity> findByProjectOrderByTimestampDesc(ProjectEntity project);
    List<MigrationLogEntity> findByProjectIdOrderByTimestampDesc(String projectId);
    void deleteByProject(ProjectEntity project);
}

