package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.PipelineEntity;
import com.ora2pg.migration.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineRepository extends JpaRepository<PipelineEntity, String> {
    List<PipelineEntity> findByUserOrderByCreatedAtDesc(User user);
}

