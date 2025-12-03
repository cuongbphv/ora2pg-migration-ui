package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.PipelineConnectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineConnectionRepository extends JpaRepository<PipelineConnectionEntity, String> {
    List<PipelineConnectionEntity> findByPipelineId(String pipelineId);
    PipelineConnectionEntity findByPipelineIdAndConnectionType(String pipelineId, String connectionType);
}

