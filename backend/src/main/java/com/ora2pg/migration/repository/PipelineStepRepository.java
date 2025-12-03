package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.PipelineStepEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineStepRepository extends JpaRepository<PipelineStepEntity, String> {
    List<PipelineStepEntity> findByPipelineIdOrderByStepOrderAsc(String pipelineId);
}

