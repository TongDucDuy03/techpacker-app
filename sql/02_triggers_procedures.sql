-- =====================================================
-- Tech Pack Management System - Triggers & Stored Procedures
-- =====================================================

-- =====================================================
-- AUDIT TRAIL TRIGGERS
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all main tables
CREATE TRIGGER update_tech_packs_updated_at 
    BEFORE UPDATE ON tech_packs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bom_updated_at 
    BEFORE UPDATE ON bill_of_materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at 
    BEFORE UPDATE ON measurement_charts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_how_to_measures_updated_at 
    BEFORE UPDATE ON how_to_measures 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colorways_updated_at 
    BEFORE UPDATE ON colorways 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- REVISION HISTORY TRIGGER
-- =====================================================

-- Function to create revision history on tech_pack changes
CREATE OR REPLACE FUNCTION create_revision_history()
RETURNS TRIGGER AS $$
DECLARE
    next_revision INTEGER;
    changed_fields JSONB := '[]'::JSONB;
    field_change JSONB;
BEGIN
    -- Get next revision number
    SELECT COALESCE(MAX(revision_number), 0) + 1 
    INTO next_revision
    FROM revision_histories 
    WHERE tech_pack_id = NEW.tech_pack_id;
    
    -- Build changed fields array for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        -- Check each field for changes
        IF OLD.product_name != NEW.product_name THEN
            field_change := jsonb_build_object(
                'field', 'product_name',
                'previous_value', OLD.product_name,
                'new_value', NEW.product_name
            );
            changed_fields := changed_fields || field_change;
        END IF;
        
        IF OLD.status != NEW.status THEN
            field_change := jsonb_build_object(
                'field', 'status',
                'previous_value', OLD.status,
                'new_value', NEW.status
            );
            changed_fields := changed_fields || field_change;
        END IF;
        
        IF OLD.lifecycle_stage != NEW.lifecycle_stage THEN
            field_change := jsonb_build_object(
                'field', 'lifecycle_stage',
                'previous_value', OLD.lifecycle_stage,
                'new_value', NEW.lifecycle_stage
            );
            changed_fields := changed_fields || field_change;
        END IF;
        
        IF OLD.version != NEW.version THEN
            field_change := jsonb_build_object(
                'field', 'version',
                'previous_value', OLD.version,
                'new_value', NEW.version
            );
            changed_fields := changed_fields || field_change;
        END IF;
    END IF;
    
    -- Insert revision history record
    INSERT INTO revision_histories (
        tech_pack_id,
        revision_number,
        change_type,
        changed_fields,
        user_id,
        user_name,
        user_role,
        approval_required
    )
    SELECT 
        NEW.tech_pack_id,
        next_revision,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'STATUS_CHANGE'
            ELSE 'UPDATE'
        END,
        changed_fields,
        NEW.updated_by,
        u.full_name,
        u.role_name,
        CASE 
            WHEN NEW.status IN ('In Review', 'Approved') THEN TRUE
            ELSE FALSE
        END
    FROM users u
    WHERE u.user_id = NEW.updated_by;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply revision history trigger
CREATE TRIGGER tech_pack_revision_history
    AFTER INSERT OR UPDATE ON tech_packs
    FOR EACH ROW
    EXECUTE FUNCTION create_revision_history();

-- =====================================================
-- STATUS VALIDATION TRIGGER
-- =====================================================

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- For new records, allow any initial status
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Validate status transitions
    IF OLD.status = 'Draft' AND NEW.status NOT IN ('Draft', 'In Review', 'Archived') THEN
        RAISE EXCEPTION 'Invalid status transition from Draft to %', NEW.status;
    END IF;
    
    IF OLD.status = 'In Review' AND NEW.status NOT IN ('In Review', 'Approved', 'Rejected', 'Draft') THEN
        RAISE EXCEPTION 'Invalid status transition from In Review to %', NEW.status;
    END IF;
    
    IF OLD.status = 'Approved' AND NEW.status NOT IN ('Approved', 'Archived') THEN
        RAISE EXCEPTION 'Invalid status transition from Approved to %', NEW.status;
    END IF;
    
    IF OLD.status = 'Rejected' AND NEW.status NOT IN ('Rejected', 'Draft') THEN
        RAISE EXCEPTION 'Invalid status transition from Rejected to %', NEW.status;
    END IF;
    
    IF OLD.status = 'Archived' THEN
        RAISE EXCEPTION 'Cannot change status of archived tech pack';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply status validation trigger
CREATE TRIGGER validate_tech_pack_status
    BEFORE UPDATE ON tech_packs
    FOR EACH ROW
    EXECUTE FUNCTION validate_status_transition();

-- =====================================================
-- VERSION CONTROL TRIGGER
-- =====================================================

-- Function to handle version increments
CREATE OR REPLACE FUNCTION handle_version_increment()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-increment version on significant changes
    IF TG_OP = 'UPDATE' AND (
        OLD.product_name != NEW.product_name OR
        OLD.fabric_description != NEW.fabric_description OR
        OLD.supplier_info != NEW.supplier_info
    ) THEN
        NEW.version := OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version control trigger
CREATE TRIGGER tech_pack_version_control
    BEFORE UPDATE ON tech_packs
    FOR EACH ROW
    EXECUTE FUNCTION handle_version_increment();

-- =====================================================
-- STORED PROCEDURES FOR BUSINESS LOGIC
-- =====================================================

-- Procedure to create a new tech pack with initial BOM
CREATE OR REPLACE FUNCTION create_tech_pack_with_bom(
    p_article_code VARCHAR(50),
    p_product_name VARCHAR(255),
    p_gender VARCHAR(20),
    p_fit_type VARCHAR(50),
    p_product_class VARCHAR(100),
    p_supplier_info JSONB,
    p_fabric_description TEXT,
    p_designer VARCHAR(255),
    p_season VARCHAR(20),
    p_created_by UUID,
    p_initial_bom JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID AS $$
DECLARE
    new_tech_pack_id UUID;
    bom_item JSONB;
BEGIN
    -- Insert tech pack
    INSERT INTO tech_packs (
        article_code, product_name, gender, fit_type, product_class,
        supplier_info, fabric_description, designer, season, created_by, updated_by
    ) VALUES (
        p_article_code, p_product_name, p_gender, p_fit_type, p_product_class,
        p_supplier_info, p_fabric_description, p_designer, p_season, p_created_by, p_created_by
    ) RETURNING tech_pack_id INTO new_tech_pack_id;
    
    -- Insert initial BOM items if provided
    FOR bom_item IN SELECT * FROM jsonb_array_elements(p_initial_bom)
    LOOP
        INSERT INTO bill_of_materials (
            tech_pack_id, part_name, material_name, placement, quantity,
            unit_of_measure, supplier_code, supplier_name, created_by
        ) VALUES (
            new_tech_pack_id,
            bom_item->>'part_name',
            bom_item->>'material_name',
            bom_item->>'placement',
            (bom_item->>'quantity')::DECIMAL,
            bom_item->>'unit_of_measure',
            bom_item->>'supplier_code',
            bom_item->>'supplier_name',
            p_created_by
        );
    END LOOP;
    
    RETURN new_tech_pack_id;
END;
$$ LANGUAGE plpgsql;

-- Procedure to approve tech pack
CREATE OR REPLACE FUNCTION approve_tech_pack(
    p_tech_pack_id UUID,
    p_approved_by UUID,
    p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status VARCHAR(20);
BEGIN
    -- Check current status
    SELECT status INTO current_status
    FROM tech_packs
    WHERE tech_pack_id = p_tech_pack_id;
    
    IF current_status != 'In Review' THEN
        RAISE EXCEPTION 'Tech pack must be in Review status to approve';
    END IF;
    
    -- Update status
    UPDATE tech_packs
    SET status = 'Approved',
        updated_by = p_approved_by
    WHERE tech_pack_id = p_tech_pack_id;
    
    -- Update revision history with approval
    UPDATE revision_histories
    SET approved_by = p_approved_by,
        approval_date = CURRENT_TIMESTAMP
    WHERE tech_pack_id = p_tech_pack_id
    AND approved_by IS NULL
    ORDER BY revision_number DESC
    LIMIT 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Procedure to get complete tech pack data
CREATE OR REPLACE FUNCTION get_complete_tech_pack(p_tech_pack_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'tech_pack', to_jsonb(tp.*),
        'bom', COALESCE(bom.items, '[]'::JSONB),
        'measurements', COALESCE(measurements.charts, '[]'::JSONB),
        'colorways', COALESCE(colorways.items, '[]'::JSONB),
        'revisions', COALESCE(revisions.history, '[]'::JSONB)
    ) INTO result
    FROM tech_packs tp
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(bom.*)) as items
        FROM bill_of_materials bom
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) bom ON tp.tech_pack_id = bom.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(mc.*)) as charts
        FROM measurement_charts mc
        WHERE tech_pack_id = p_tech_pack_id AND is_active = TRUE
        GROUP BY tech_pack_id
    ) measurements ON tp.tech_pack_id = measurements.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(c.*)) as items
        FROM colorways c
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) colorways ON tp.tech_pack_id = colorways.tech_pack_id
    LEFT JOIN (
        SELECT tech_pack_id, jsonb_agg(to_jsonb(rh.*) ORDER BY revision_number DESC) as history
        FROM revision_histories rh
        WHERE tech_pack_id = p_tech_pack_id
        GROUP BY tech_pack_id
    ) revisions ON tp.tech_pack_id = revisions.tech_pack_id
    WHERE tp.tech_pack_id = p_tech_pack_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
