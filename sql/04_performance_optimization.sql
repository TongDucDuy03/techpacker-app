-- =====================================================
-- Tech Pack Management System - Performance Optimization
-- =====================================================

-- =====================================================
-- COMPREHENSIVE INDEXING STRATEGY
-- =====================================================

-- Primary and Foreign Key Indexes (automatically created, but listed for completeness)
-- CREATE UNIQUE INDEX idx_tech_packs_pkey ON tech_packs (tech_pack_id);
-- CREATE UNIQUE INDEX idx_users_pkey ON users (user_id);

-- Business Logic Indexes
CREATE INDEX idx_tech_packs_article_code ON tech_packs (article_code);
CREATE INDEX idx_tech_packs_status_season ON tech_packs (status, season);
CREATE INDEX idx_tech_packs_lifecycle_stage ON tech_packs (lifecycle_stage);
CREATE INDEX idx_tech_packs_created_by ON tech_packs (created_by);
CREATE INDEX idx_tech_packs_updated_at ON tech_packs (updated_at DESC);

-- Full-text search indexes
CREATE INDEX idx_tech_packs_product_name_gin ON tech_packs USING gin(to_tsvector('english', product_name));
CREATE INDEX idx_tech_packs_fabric_description_gin ON tech_packs USING gin(to_tsvector('english', fabric_description));

-- BOM Performance Indexes
CREATE INDEX idx_bom_tech_pack_id ON bill_of_materials (tech_pack_id);
CREATE INDEX idx_bom_part_name ON bill_of_materials (part_name);
CREATE INDEX idx_bom_material_name ON bill_of_materials (material_name);
CREATE INDEX idx_bom_supplier_code ON bill_of_materials (supplier_code);
CREATE INDEX idx_bom_tech_pack_part ON bill_of_materials (tech_pack_id, part_name);

-- Measurement Charts Indexes
CREATE INDEX idx_measurements_tech_pack_id ON measurement_charts (tech_pack_id);
CREATE INDEX idx_measurements_pom_code ON measurement_charts (pom_code);
CREATE INDEX idx_measurements_active ON measurement_charts (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_measurements_approval_status ON measurement_charts (approval_status);

-- How to Measure Indexes
CREATE INDEX idx_how_to_measure_tech_pack_pom ON how_to_measures (tech_pack_id, pom_code);
CREATE INDEX idx_how_to_measure_language ON how_to_measures (language);

-- Colorways Indexes
CREATE INDEX idx_colorways_tech_pack_id ON colorways (tech_pack_id);
CREATE INDEX idx_colorways_code ON colorways (colorway_code);
CREATE INDEX idx_colorways_default ON colorways (is_default) WHERE is_default = TRUE;

-- Revision History Indexes
CREATE INDEX idx_revisions_tech_pack_id ON revision_histories (tech_pack_id);
CREATE INDEX idx_revisions_tech_pack_revision ON revision_histories (tech_pack_id, revision_number DESC);
CREATE INDEX idx_revisions_timestamp ON revision_histories (timestamp DESC);
CREATE INDEX idx_revisions_user_id ON revision_histories (user_id);

-- JSON/JSONB Indexes for complex queries
CREATE INDEX idx_tech_packs_supplier_info_gin ON tech_packs USING gin(supplier_info);
CREATE INDEX idx_bom_sub_materials_gin ON bill_of_materials USING gin(sub_materials);
CREATE INDEX idx_measurements_sizes_gin ON measurement_charts USING gin(sizes);
CREATE INDEX idx_colorways_parts_gin ON colorways USING gin(color_parts);

-- =====================================================
-- PARTITIONING STRATEGY
-- =====================================================

-- Partition tech_packs by season for better performance on large datasets
-- This is especially useful for fashion companies with seasonal collections

-- Create partitioned table for tech_packs (PostgreSQL 10+)
CREATE TABLE tech_packs_partitioned (
    LIKE tech_packs INCLUDING ALL
) PARTITION BY LIST (season);

-- Create partitions for different seasons
CREATE TABLE tech_packs_ss25 PARTITION OF tech_packs_partitioned FOR VALUES IN ('SS25');
CREATE TABLE tech_packs_fw25 PARTITION OF tech_packs_partitioned FOR VALUES IN ('FW25');
CREATE TABLE tech_packs_ss26 PARTITION OF tech_packs_partitioned FOR VALUES IN ('SS26');
CREATE TABLE tech_packs_fw26 PARTITION OF tech_packs_partitioned FOR VALUES IN ('FW26');

-- Default partition for other seasons
CREATE TABLE tech_packs_default PARTITION OF tech_packs_partitioned DEFAULT;

-- Partition revision_histories by date for better archival performance
CREATE TABLE revision_histories_partitioned (
    LIKE revision_histories INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for revision history
CREATE TABLE revision_histories_2024_10 PARTITION OF revision_histories_partitioned 
FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE revision_histories_2024_11 PARTITION OF revision_histories_partitioned 
FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE revision_histories_2024_12 PARTITION OF revision_histories_partitioned 
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- =====================================================
-- MATERIALIZED VIEWS FOR COMPLEX QUERIES
-- =====================================================

-- Materialized view for tech pack summary with counts
CREATE MATERIALIZED VIEW mv_tech_pack_summary AS
SELECT 
    tp.tech_pack_id,
    tp.article_code,
    tp.product_name,
    tp.status,
    tp.season,
    tp.lifecycle_stage,
    tp.created_at,
    tp.updated_at,
    COALESCE(bom_stats.bom_count, 0) as bom_items_count,
    COALESCE(measurement_stats.measurement_count, 0) as measurement_points_count,
    COALESCE(colorway_stats.colorway_count, 0) as colorways_count,
    COALESCE(revision_stats.revision_count, 0) as revision_count,
    CASE 
        WHEN tp.status = 'Approved' AND 
             COALESCE(bom_stats.bom_count, 0) > 0 AND 
             COALESCE(measurement_stats.measurement_count, 0) > 0 AND 
             COALESCE(colorway_stats.colorway_count, 0) > 0 
        THEN TRUE 
        ELSE FALSE 
    END as is_complete
FROM tech_packs tp
LEFT JOIN (
    SELECT tech_pack_id, COUNT(*) as bom_count
    FROM bill_of_materials
    GROUP BY tech_pack_id
) bom_stats ON tp.tech_pack_id = bom_stats.tech_pack_id
LEFT JOIN (
    SELECT tech_pack_id, COUNT(*) as measurement_count
    FROM measurement_charts
    WHERE is_active = TRUE
    GROUP BY tech_pack_id
) measurement_stats ON tp.tech_pack_id = measurement_stats.tech_pack_id
LEFT JOIN (
    SELECT tech_pack_id, COUNT(*) as colorway_count
    FROM colorways
    GROUP BY tech_pack_id
) colorway_stats ON tp.tech_pack_id = colorway_stats.tech_pack_id
LEFT JOIN (
    SELECT tech_pack_id, COUNT(*) as revision_count
    FROM revision_histories
    GROUP BY tech_pack_id
) revision_stats ON tp.tech_pack_id = revision_stats.tech_pack_id;

-- Create index on materialized view
CREATE INDEX idx_mv_tech_pack_summary_status ON mv_tech_pack_summary (status);
CREATE INDEX idx_mv_tech_pack_summary_season ON mv_tech_pack_summary (season);
CREATE INDEX idx_mv_tech_pack_summary_complete ON mv_tech_pack_summary (is_complete);

-- Materialized view for supplier performance metrics
CREATE MATERIALIZED VIEW mv_supplier_metrics AS
SELECT 
    supplier_info->>'supplierId' as supplier_id,
    supplier_info->>'supplierName' as supplier_name,
    COUNT(*) as total_tech_packs,
    COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'In Review' THEN 1 END) as in_review_count,
    COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
    ROUND(
        COUNT(CASE WHEN status = 'Approved' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as approval_rate,
    AVG(EXTRACT(DAY FROM updated_at - created_at)) as avg_development_days
FROM tech_packs
WHERE supplier_info->>'supplierId' IS NOT NULL
GROUP BY supplier_info->>'supplierId', supplier_info->>'supplierName';

-- =====================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_performance_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tech_pack_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_supplier_metrics;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
BEGIN
    ANALYZE tech_packs;
    ANALYZE bill_of_materials;
    ANALYZE measurement_charts;
    ANALYZE how_to_measures;
    ANALYZE colorways;
    ANALYZE revision_histories;
    ANALYZE users;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CACHING STRATEGY CONFIGURATION
-- =====================================================

-- Set up connection pooling parameters (for application level)
-- These are recommendations for connection pool configuration:
/*
Application-level caching recommendations:

1. Redis Cache Configuration:
   - Cache frequently accessed tech pack summaries (TTL: 1 hour)
   - Cache user permissions and roles (TTL: 30 minutes)
   - Cache supplier information (TTL: 4 hours)
   - Cache measurement charts for active tech packs (TTL: 2 hours)

2. Application Cache Keys:
   - techpack:summary:{tech_pack_id}
   - user:permissions:{user_id}
   - supplier:info:{supplier_id}
   - measurements:{tech_pack_id}
   - bom:{tech_pack_id}

3. Cache Invalidation Triggers:
   - Invalidate tech pack cache on any update
   - Invalidate user cache on role changes
   - Invalidate supplier cache on supplier info updates
*/

-- Database-level caching settings
-- Increase shared_buffers for better caching
-- SET shared_buffers = '256MB';  -- Adjust based on available RAM
-- SET effective_cache_size = '1GB';  -- Adjust based on total system RAM
-- SET work_mem = '4MB';  -- For sorting and hash operations

-- =====================================================
-- PERFORMANCE MONITORING VIEWS
-- =====================================================

-- View to monitor slow queries
CREATE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- View to monitor table sizes and growth
CREATE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- View to monitor index usage
CREATE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_scan < 100 THEN 'Rarely used'
        ELSE 'Frequently used'
    END as usage_level
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- =====================================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to perform routine maintenance
CREATE OR REPLACE FUNCTION perform_routine_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Update table statistics
    PERFORM update_table_statistics();
    
    -- Refresh materialized views
    PERFORM refresh_performance_views();
    
    -- Reindex if needed (check for bloat first)
    -- This should be run during maintenance windows
    
    -- Log maintenance completion
    INSERT INTO revision_histories (
        tech_pack_id, 
        revision_number, 
        change_type, 
        changed_fields,
        user_id,
        user_name,
        user_role,
        timestamp
    ) 
    SELECT 
        '00000000-0000-0000-0000-000000000000'::UUID,
        1,
        'MAINTENANCE',
        '[]'::JSONB,
        '00000000-0000-0000-0000-000000000000'::UUID,
        'System',
        'System',
        CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Schedule routine maintenance (requires pg_cron extension)
-- SELECT cron.schedule('routine-maintenance', '0 2 * * *', 'SELECT perform_routine_maintenance();');

-- =====================================================
-- CONNECTION POOLING RECOMMENDATIONS
-- =====================================================

/*
For production deployment, consider:

1. PgBouncer Configuration:
   - pool_mode = transaction
   - max_client_conn = 1000
   - default_pool_size = 20
   - server_lifetime = 3600
   - server_idle_timeout = 600

2. Application Connection Pool:
   - Initial pool size: 5
   - Maximum pool size: 20
   - Connection timeout: 30 seconds
   - Idle timeout: 300 seconds
   - Validation query: SELECT 1

3. Read Replicas:
   - Use read replicas for reporting queries
   - Route read-only queries to replicas
   - Use connection string routing
*/
