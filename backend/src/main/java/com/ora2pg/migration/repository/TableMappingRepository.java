package com.ora2pg.migration.repository;

import com.ora2pg.migration.entity.TableMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface TableMappingRepository extends JpaRepository<TableMappingEntity, String> {
    @Modifying
    @Transactional
    @Query("UPDATE TableMappingEntity t SET t.status = :status WHERE t.id = :id")
    void updateStatus(@Param("id") String id, @Param("status") String status);
}

