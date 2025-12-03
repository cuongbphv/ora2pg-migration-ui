package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.MigrationProgressEntity;
import com.ora2pg.migration.entity.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MigrationProgressRepository extends JpaRepository<MigrationProgressEntity, String> {
    Optional<MigrationProgressEntity> findByProject(ProjectEntity project);
    Optional<MigrationProgressEntity> findByProjectId(String projectId);
}

