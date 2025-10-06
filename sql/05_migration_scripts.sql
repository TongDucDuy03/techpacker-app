-- =====================================================
-- Tech Pack Management System - Data Migration Scripts
-- =====================================================

-- =====================================================
-- MIGRATION FROM LEGACY PLM SYSTEMS
-- =====================================================

-- Create staging tables for data import
CREATE TABLE staging_legacy_products (
    legacy_id VARCHAR(100),
    product_code VARCHAR(100),
    product_name VARCHAR(500),
    category VARCHAR(200),
    season VARCHAR(50),
    supplier_name VARCHAR(300),
    fabric_info TEXT,
    created_date TIMESTAMP,
    status VARCHAR(50),
    raw_data JSONB
);

-- Migration function from legacy PLM system
CREATE OR REPLACE FUNCTION migrate_from_legacy_plm()
RETURNS TABLE(migrated_count INTEGER, error_count INTEGER, errors TEXT[]) AS $$
DECLARE
    legacy_record RECORD;
    new_tech_pack_id UUID;
    error_list TEXT[] := ARRAY[]::TEXT[];
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
BEGIN
    -- Process each legacy record
    FOR legacy_record IN 
        SELECT * FROM staging_legacy_products 
        WHERE product_code IS NOT NULL
    LOOP
        BEGIN
            -- Insert into tech_packs table
            INSERT INTO tech_packs (
                article_code,
                product_name,
                gender,
                fit_type,
                product_class,
                supplier_info,
                fabric_description,
                designer,
                season,
                lifecycle_stage,
                status,
                created_by,
                updated_by,
                created_at
            ) VALUES (
                legacy_record.product_code,
                legacy_record.product_name,
                COALESCE(legacy_record.raw_data->>'gender', 'Unisex'),
                COALESCE(legacy_record.raw_data->>'fit_type', 'Regular Fit'),
                COALESCE(legacy_record.category, 'General'),
                jsonb_build_object(
                    'supplierId', 'LEG-' || legacy_record.legacy_id,
                    'supplierName', legacy_record.supplier_name
                ),
                COALESCE(legacy_record.fabric_info, 'Legacy fabric - needs update'),
                COALESCE(legacy_record.raw_data->>'designer', 'Legacy Import'),
                legacy_record.season,
                'Development',
                CASE 
                    WHEN legacy_record.status = 'APPROVED' THEN 'Approved'
                    WHEN legacy_record.status = 'PENDING' THEN 'In Review'
                    ELSE 'Draft'
                END,
                '00000000-0000-0000-0000-000000000001'::UUID, -- Migration user
                '00000000-0000-0000-0000-000000000001'::UUID,
                COALESCE(legacy_record.created_date, CURRENT_TIMESTAMP)
            ) RETURNING tech_pack_id INTO new_tech_pack_id;
            
            success_count := success_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                fail_count := fail_count + 1;
                error_list := array_append(error_list, 
                    'Legacy ID: ' || legacy_record.legacy_id || ' - ' || SQLERRM);
        END;
    END LOOP;
    
    RETURN QUERY SELECT success_count, fail_count, error_list;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- WFX FORMAT IMPORT/EXPORT FUNCTIONS
-- =====================================================

-- Function to export tech pack to WFX format
CREATE OR REPLACE FUNCTION export_to_wfx_format(p_tech_pack_id UUID)
RETURNS JSONB AS $$
DECLARE
    wfx_data JSONB;
    tech_pack_data RECORD;
    bom_data JSONB;
    measurement_data JSONB;
    colorway_data JSONB;
BEGIN
    -- Get tech pack data
    SELECT * INTO tech_pack_data
    FROM tech_packs
    WHERE tech_pack_id = p_tech_pack_id;
    
    -- Get BOM data
    SELECT jsonb_agg(
        jsonb_build_object(
            'PartName', part_name,
            'MaterialName', material_name,
            'Placement', placement,
            'Quantity', quantity,
            'UnitOfMeasure', unit_of_measure,
            'SupplierCode', supplier_code,
            'MaterialComposition', material_composition,
            'ColorCode', color_code
        )
    ) INTO bom_data
    FROM bill_of_materials
    WHERE tech_pack_id = p_tech_pack_id;
    
    -- Get measurement data
    SELECT jsonb_agg(
        jsonb_build_object(
            'POMCode', pom_code,
            'POMName', pom_name,
            'Tolerance', tolerance,
            'Sizes', sizes
        )
    ) INTO measurement_data
    FROM measurement_charts
    WHERE tech_pack_id = p_tech_pack_id AND is_active = TRUE;
    
    -- Get colorway data
    SELECT jsonb_agg(
        jsonb_build_object(
            'ColorwayName', colorway_name,
            'ColorwayCode', colorway_code,
            'ColorParts', color_parts
        )
    ) INTO colorway_data
    FROM colorways
    WHERE tech_pack_id = p_tech_pack_id;
    
    -- Build WFX structure
    wfx_data := jsonb_build_object(
        'WFXTechPack', jsonb_build_object(
            'Header', jsonb_build_object(
                'ArticleCode', tech_pack_data.article_code,
                'ProductName', tech_pack_data.product_name,
                'Gender', tech_pack_data.gender,
                'FitType', tech_pack_data.fit_type,
                'ProductClass', tech_pack_data.product_class,
                'Season', tech_pack_data.season,
                'Version', tech_pack_data.version,
                'Status', tech_pack_data.status,
                'Designer', tech_pack_data.designer,
                'FabricDescription', tech_pack_data.fabric_description
            ),
            'SupplierInfo', tech_pack_data.supplier_info,
            'BillOfMaterials', COALESCE(bom_data, '[]'::JSONB),
            'MeasurementCharts', COALESCE(measurement_data, '[]'::JSONB),
            'Colorways', COALESCE(colorway_data, '[]'::JSONB),
            'ExportTimestamp', to_jsonb(CURRENT_TIMESTAMP),
            'ExportVersion', '1.0'
        )
    );
    
    RETURN wfx_data;
END;
$$ LANGUAGE plpgsql;

-- Function to import from WFX format
CREATE OR REPLACE FUNCTION import_from_wfx_format(
    p_wfx_data JSONB,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    new_tech_pack_id UUID;
    header_data JSONB;
    bom_item JSONB;
    measurement_item JSONB;
    colorway_item JSONB;
BEGIN
    header_data := p_wfx_data->'WFXTechPack'->'Header';
    
    -- Insert tech pack
    INSERT INTO tech_packs (
        article_code,
        product_name,
        gender,
        fit_type,
        product_class,
        supplier_info,
        fabric_description,
        designer,
        season,
        lifecycle_stage,
        status,
        created_by,
        updated_by
    ) VALUES (
        header_data->>'ArticleCode',
        header_data->>'ProductName',
        header_data->>'Gender',
        header_data->>'FitType',
        header_data->>'ProductClass',
        p_wfx_data->'WFXTechPack'->'SupplierInfo',
        header_data->>'FabricDescription',
        header_data->>'Designer',
        header_data->>'Season',
        'Development',
        'Draft',
        p_created_by,
        p_created_by
    ) RETURNING tech_pack_id INTO new_tech_pack_id;
    
    -- Import BOM items
    FOR bom_item IN 
        SELECT * FROM jsonb_array_elements(p_wfx_data->'WFXTechPack'->'BillOfMaterials')
    LOOP
        INSERT INTO bill_of_materials (
            tech_pack_id,
            part_name,
            material_name,
            placement,
            quantity,
            unit_of_measure,
            supplier_code,
            material_composition,
            color_code,
            created_by
        ) VALUES (
            new_tech_pack_id,
            bom_item->>'PartName',
            bom_item->>'MaterialName',
            bom_item->>'Placement',
            (bom_item->>'Quantity')::DECIMAL,
            bom_item->>'UnitOfMeasure',
            bom_item->>'SupplierCode',
            bom_item->>'MaterialComposition',
            bom_item->>'ColorCode',
            p_created_by
        );
    END LOOP;
    
    -- Import measurements
    FOR measurement_item IN 
        SELECT * FROM jsonb_array_elements(p_wfx_data->'WFXTechPack'->'MeasurementCharts')
    LOOP
        INSERT INTO measurement_charts (
            tech_pack_id,
            pom_code,
            pom_name,
            tolerance,
            sizes,
            created_by
        ) VALUES (
            new_tech_pack_id,
            measurement_item->>'POMCode',
            measurement_item->>'POMName',
            measurement_item->>'Tolerance',
            measurement_item->'Sizes',
            p_created_by
        );
    END LOOP;
    
    -- Import colorways
    FOR colorway_item IN 
        SELECT * FROM jsonb_array_elements(p_wfx_data->'WFXTechPack'->'Colorways')
    LOOP
        INSERT INTO colorways (
            tech_pack_id,
            colorway_name,
            colorway_code,
            color_parts,
            created_by
        ) VALUES (
            new_tech_pack_id,
            colorway_item->>'ColorwayName',
            colorway_item->>'ColorwayCode',
            colorway_item->'ColorParts',
            p_created_by
        );
    END LOOP;
    
    RETURN new_tech_pack_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA VALIDATION AND CLEANUP
-- =====================================================

-- Function to validate imported data
CREATE OR REPLACE FUNCTION validate_imported_data()
RETURNS TABLE(
    validation_type VARCHAR(50),
    tech_pack_id UUID,
    article_code VARCHAR(50),
    issue_description TEXT
) AS $$
BEGIN
    -- Check for missing BOM
    RETURN QUERY
    SELECT 
        'MISSING_BOM'::VARCHAR(50),
        tp.tech_pack_id,
        tp.article_code,
        'Tech pack has no BOM items'::TEXT
    FROM tech_packs tp
    LEFT JOIN bill_of_materials bom ON tp.tech_pack_id = bom.tech_pack_id
    WHERE bom.tech_pack_id IS NULL;
    
    -- Check for missing measurements
    RETURN QUERY
    SELECT 
        'MISSING_MEASUREMENTS'::VARCHAR(50),
        tp.tech_pack_id,
        tp.article_code,
        'Tech pack has no measurement charts'::TEXT
    FROM tech_packs tp
    LEFT JOIN measurement_charts mc ON tp.tech_pack_id = mc.tech_pack_id
    WHERE mc.tech_pack_id IS NULL;
    
    -- Check for invalid quantities in BOM
    RETURN QUERY
    SELECT 
        'INVALID_QUANTITY'::VARCHAR(50),
        tp.tech_pack_id,
        tp.article_code,
        'BOM item has invalid quantity: ' || bom.part_name
    FROM tech_packs tp
    JOIN bill_of_materials bom ON tp.tech_pack_id = bom.tech_pack_id
    WHERE bom.quantity <= 0;
    
    -- Check for missing colorways
    RETURN QUERY
    SELECT 
        'MISSING_COLORWAYS'::VARCHAR(50),
        tp.tech_pack_id,
        tp.article_code,
        'Tech pack has no colorways defined'::TEXT
    FROM tech_packs tp
    LEFT JOIN colorways c ON tp.tech_pack_id = c.tech_pack_id
    WHERE c.tech_pack_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BULK OPERATIONS
-- =====================================================

-- Function for bulk status updates
CREATE OR REPLACE FUNCTION bulk_update_status(
    p_tech_pack_ids UUID[],
    p_new_status VARCHAR(20),
    p_updated_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE tech_packs
    SET status = p_new_status,
        updated_by = p_updated_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE tech_pack_id = ANY(p_tech_pack_ids)
    AND status != p_new_status; -- Only update if status is different
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function for bulk season migration
CREATE OR REPLACE FUNCTION migrate_season(
    p_old_season VARCHAR(20),
    p_new_season VARCHAR(20),
    p_updated_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE tech_packs
    SET season = p_new_season,
        updated_by = p_updated_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE season = p_old_season;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BACKUP AND RESTORE PROCEDURES
-- =====================================================

-- Function to create tech pack backup
CREATE OR REPLACE FUNCTION backup_tech_pack(p_tech_pack_id UUID)
RETURNS JSONB AS $$
DECLARE
    backup_data JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tech_pack', to_jsonb(tp.*),
        'bom', COALESCE(bom_data.items, '[]'::JSONB),
        'measurements', COALESCE(measurement_data.charts, '[]'::JSONB),
        'how_to_measures', COALESCE(htm_data.instructions, '[]'::JSONB),
        'colorways', COALESCE(colorway_data.items, '[]'::JSONB),
        'revisions', COALESCE(revision_data.history, '[]'::JSONB),
        'backup_timestamp', to_jsonb(CURRENT_TIMESTAMP),
        'backup_version', '1.0'
    ) INTO backup_data
    FROM tech_packs tp
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(bom.*)) as items
        FROM bill_of_materials bom
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) bom_data ON tp.tech_pack_id = bom_data.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(mc.*)) as charts
        FROM measurement_charts mc
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) measurement_data ON tp.tech_pack_id = measurement_data.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(htm.*)) as instructions
        FROM how_to_measures htm
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) htm_data ON tp.tech_pack_id = htm_data.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(c.*)) as items
        FROM colorways c
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) colorway_data ON tp.tech_pack_id = colorway_data.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(rh.*)) as history
        FROM revision_histories rh
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) revision_data ON tp.tech_pack_id = revision_data.tech_pack_id
    WHERE tp.tech_pack_id = p_tech_pack_id;
    
    RETURN backup_data;
END;
$$ LANGUAGE plpgsql;
