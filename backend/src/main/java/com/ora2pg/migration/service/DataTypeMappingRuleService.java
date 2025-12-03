package com.ora2pg.migration.service;

import com.ora2pg.migration.entity.DataTypeMappingRuleEntity;
import com.ora2pg.migration.entity.User;
import com.ora2pg.migration.model.DataTypeMappingRule;
import com.ora2pg.migration.repository.DataTypeMappingRuleRepository;
import com.ora2pg.migration.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataTypeMappingRuleService {
    
    private final DataTypeMappingRuleRepository repository;
    private final UserRepository userRepository;
    
    private User getCurrentUser() {
        org.springframework.security.core.Authentication auth = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new RuntimeException("User not authenticated");
        }
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    /**
     * Get all mapping rules for the current user (custom + system defaults)
     */
    public List<DataTypeMappingRule> getAllRules() {
        User user = getCurrentUser();
        List<DataTypeMappingRuleEntity> entities = repository.findByUserOrIsCustomFalseOrderByOracleTypeAsc(user);
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }
    
    /**
     * Get only custom rules for the current user
     */
    public List<DataTypeMappingRule> getCustomRules() {
        User user = getCurrentUser();
        List<DataTypeMappingRuleEntity> entities = repository.findByUserOrderByOracleTypeAsc(user);
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }
    
    /**
     * Get system default rules
     */
    public List<DataTypeMappingRule> getDefaultRules() {
        List<DataTypeMappingRuleEntity> entities = repository.findByIsCustomFalseOrderByOracleTypeAsc();
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }
    
    /**
     * Create a new custom mapping rule
     */
    @Transactional
    public DataTypeMappingRule createRule(DataTypeMappingRule rule) {
        User user = getCurrentUser();
        
        // Check if rule already exists for this user
        repository.findByOracleTypeAndUser(rule.getOracleType(), user)
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Mapping rule already exists for Oracle type: " + rule.getOracleType());
                });
        
        DataTypeMappingRuleEntity entity = toEntity(rule, user);
        entity.setIsCustom(true);
        entity = repository.save(entity);
        return toModel(entity);
    }
    
    /**
     * Update an existing custom mapping rule
     */
    @Transactional
    public DataTypeMappingRule updateRule(String id, DataTypeMappingRule rule) {
        User user = getCurrentUser();
        DataTypeMappingRuleEntity entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Mapping rule not found: " + id));
        
        // Only allow updating custom rules
        if (!entity.getIsCustom() || !entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Cannot update system default rule or rule owned by another user");
        }
        
        // Check if oracle type changed and conflicts with existing rule
        if (!entity.getOracleType().equals(rule.getOracleType())) {
            repository.findByOracleTypeAndUser(rule.getOracleType(), user)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(id)) {
                            throw new IllegalArgumentException("Mapping rule already exists for Oracle type: " + rule.getOracleType());
                        }
                    });
        }
        
        entity.setOracleType(rule.getOracleType());
        entity.setPostgresType(rule.getPostgresType());
        entity.setDescription(rule.getDescription());
        entity.setTransformationHint(rule.getTransformationHint());
        
        entity = repository.save(entity);
        return toModel(entity);
    }
    
    /**
     * Delete a custom mapping rule
     */
    @Transactional
    public void deleteRule(String id) {
        User user = getCurrentUser();
        DataTypeMappingRuleEntity entity = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Mapping rule not found: " + id));
        
        // Only allow deleting custom rules
        if (!entity.getIsCustom() || !entity.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Cannot delete system default rule or rule owned by another user");
        }
        
        repository.delete(entity);
    }
    
    private DataTypeMappingRule toModel(DataTypeMappingRuleEntity entity) {
        DataTypeMappingRule rule = new DataTypeMappingRule();
        rule.setId(entity.getId());
        rule.setOracleType(entity.getOracleType());
        rule.setPostgresType(entity.getPostgresType());
        rule.setDescription(entity.getDescription());
        rule.setTransformationHint(entity.getTransformationHint());
        rule.setIsCustom(entity.getIsCustom());
        return rule;
    }
    
    private DataTypeMappingRuleEntity toEntity(DataTypeMappingRule rule, User user) {
        DataTypeMappingRuleEntity entity = new DataTypeMappingRuleEntity();
        entity.setOracleType(rule.getOracleType());
        entity.setPostgresType(rule.getPostgresType());
        entity.setDescription(rule.getDescription());
        entity.setTransformationHint(rule.getTransformationHint());
        entity.setUser(user);
        entity.setIsCustom(true);
        return entity;
    }
}

