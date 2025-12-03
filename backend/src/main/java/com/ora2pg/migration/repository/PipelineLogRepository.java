package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.PipelineLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineLogRepository extends JpaRepository<PipelineLogEntity, String> {
    List<PipelineLogEntity> findByPipelineIdOrderByTimestampDesc(String pipelineId);
    List<PipelineLogEntity> findByExecutionIdOrderByTimestampAsc(String executionId);
}

