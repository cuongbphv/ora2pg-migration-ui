package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.PipelineExecutionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PipelineExecutionRepository extends JpaRepository<PipelineExecutionEntity, String> {
    List<PipelineExecutionEntity> findByPipelineIdOrderByStartTimeDesc(String pipelineId);
    Optional<PipelineExecutionEntity> findByPipelineIdAndStatus(String pipelineId, String status);
}

