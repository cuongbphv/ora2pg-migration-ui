package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.ProjectEntity;
import com.ora2pg.migration.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {
    List<ProjectEntity> findByUser(User user);
    List<ProjectEntity> findByUserId(String userId);
}

