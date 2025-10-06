-- =====================================================
-- Tech Pack Management System - Validation Rules & Business Logic
-- =====================================================

-- =====================================================
-- MEASUREMENT VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate measurement tolerances
CREATE OR REPLACE FUNCTION validate_measurement_tolerance(tolerance_str VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if tolerance follows pattern like "+/- 1.0cm" or "+/- 0.5mm"
    RETURN tolerance_str ~ '^[+]?[-]?\s*[0-9]+\.?[0-9]*\s*(cm|mm|in)$' OR
           tolerance_str ~ '^[+]?[-]?/[+]?[-]?\s*[0-9]+\.?[0-9]*\s*(cm|mm|in)$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate size matrix consistency
CREATE OR REPLACE FUNCTION validate_size_matrix(sizes JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    size_key TEXT;
    size_value NUMERIC;
    prev_value NUMERIC := 0;
    size_order TEXT[] := ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'];
    i INTEGER;
BEGIN
    -- Check that all size values are positive numbers
    FOR size_key IN SELECT jsonb_object_keys(sizes)
    LOOP
        BEGIN
            size_value := (sizes->>size_key)::NUMERIC;
            IF size_value <= 0 THEN
                RETURN FALSE;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RETURN FALSE;
        END;
    END LOOP;
    
    -- Check that sizes follow logical progression (each size should be larger than previous)
    FOR i IN 1..array_length(size_order, 1)
    LOOP
        IF sizes ? size_order[i] THEN
            size_value := (sizes->>size_order[i])::NUMERIC;
            IF prev_value > 0 AND size_value <= prev_value THEN
                RETURN FALSE;
            END IF;
            prev_value := size_value;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to measurement_charts table
ALTER TABLE measurement_charts 
ADD CONSTRAINT check_valid_tolerance 
CHECK (validate_measurement_tolerance(tolerance));

ALTER TABLE measurement_charts 
ADD CONSTRAINT check_valid_sizes 
CHECK (validate_size_matrix(sizes));

-- =====================================================
-- BOM VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate material composition percentages
CREATE OR REPLACE FUNCTION validate_material_composition(composition VARCHAR(500))
RETURNS BOOLEAN AS $$
DECLARE
    total_percentage INTEGER := 0;
    percentage_match TEXT[];
BEGIN
    -- Extract all percentage values using regex
    FOR percentage_match IN 
        SELECT regexp_matches(composition, '(\d+)%', 'g')
    LOOP
        total_percentage := total_percentage + percentage_match[1]::INTEGER;
    END LOOP;
    
    -- Total should be 100% (allow small tolerance for rounding)
    RETURN total_percentage BETWEEN 98 AND 102;
END;
$$ LANGUAGE plpgsql;

-- Function to validate quantity based on unit of measure
CREATE OR REPLACE FUNCTION validate_quantity_unit(quantity DECIMAL, unit_of_measure VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
    -- For piece-based units, quantity should be whole numbers
    IF unit_of_measure = 'pcs' AND quantity != FLOOR(quantity) THEN
        RETURN FALSE;
    END IF;
    
    -- All quantities must be positive
    IF quantity <= 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Reasonable limits based on unit type
    CASE unit_of_measure
        WHEN 'm' THEN RETURN quantity <= 1000; -- Max 1000 meters
        WHEN 'cm' THEN RETURN quantity <= 100000; -- Max 100000 cm
        WHEN 'kg' THEN RETURN quantity <= 100; -- Max 100 kg
        WHEN 'g' THEN RETURN quantity <= 100000; -- Max 100000 g
        WHEN 'pcs' THEN RETURN quantity <= 10000; -- Max 10000 pieces
        ELSE RETURN TRUE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Add constraints to BOM table
ALTER TABLE bill_of_materials 
ADD CONSTRAINT check_valid_composition 
CHECK (material_composition IS NULL OR validate_material_composition(material_composition));

ALTER TABLE bill_of_materials 
ADD CONSTRAINT check_valid_quantity_unit 
CHECK (validate_quantity_unit(quantity, unit_of_measure));

-- =====================================================
-- COLORWAY VALIDATION FUNCTIONS
-- =====================================================

-- Function to validate Pantone color codes
CREATE OR REPLACE FUNCTION validate_pantone_code(pantone_code VARCHAR(50))
RETURNS BOOLEAN AS $$
BEGIN
    -- Pantone codes follow patterns like "PANTONE 18-1664 TPX" or "11-0601 TCX"
    RETURN pantone_code ~ '^(PANTONE\s+)?[0-9]{2}-[0-9]{4}\s+(TPX|TCX|C|U)$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate RGB hex codes
CREATE OR REPLACE FUNCTION validate_rgb_hex(rgb_hex VARCHAR(7))
RETURNS BOOLEAN AS $$
BEGIN
    -- RGB hex codes should be in format #RRGGBB
    RETURN rgb_hex ~ '^#[0-9A-Fa-f]{6}$';
END;
$$ LANGUAGE plpgsql;

-- Function to validate colorway parts structure
CREATE OR REPLACE FUNCTION validate_colorway_parts(color_parts JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    part JSONB;
    required_fields TEXT[] := ARRAY['partName', 'colorName', 'pantoneCode'];
    field TEXT;
BEGIN
    -- Check that color_parts is an array
    IF jsonb_typeof(color_parts) != 'array' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate each color part
    FOR part IN SELECT * FROM jsonb_array_elements(color_parts)
    LOOP
        -- Check required fields exist
        FOREACH field IN ARRAY required_fields
        LOOP
            IF NOT (part ? field) OR (part->>field) = '' THEN
                RETURN FALSE;
            END IF;
        END LOOP;
        
        -- Validate Pantone code if present
        IF part ? 'pantoneCode' AND NOT validate_pantone_code(part->>'pantoneCode') THEN
            RETURN FALSE;
        END IF;
        
        -- Validate RGB hex if present
        IF part ? 'rgbHex' AND NOT validate_rgb_hex(part->>'rgbHex') THEN
            RETURN FALSE;
        END IF;
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to colorways table
ALTER TABLE colorways 
ADD CONSTRAINT check_valid_color_parts 
CHECK (validate_colorway_parts(color_parts));

-- =====================================================
-- BUSINESS LOGIC CONSTRAINTS
-- =====================================================

-- Ensure only one default colorway per tech pack
CREATE UNIQUE INDEX idx_unique_default_colorway 
ON colorways (tech_pack_id) 
WHERE is_default = TRUE;

-- Ensure active measurement charts don't have duplicates
CREATE UNIQUE INDEX idx_unique_active_measurement 
ON measurement_charts (tech_pack_id, pom_code) 
WHERE is_active = TRUE;

-- =====================================================
-- STATUS TRANSITION VALIDATION TABLE
-- =====================================================

-- Create a table to define valid status transitions
CREATE TABLE status_transitions (
    from_status VARCHAR(20) NOT NULL,
    to_status VARCHAR(20) NOT NULL,
    required_role VARCHAR(50),
    description TEXT,
    PRIMARY KEY (from_status, to_status)
);

-- Insert valid transitions
INSERT INTO status_transitions (from_status, to_status, required_role, description) VALUES
('Draft', 'In Review', 'Designer', 'Submit for review'),
('Draft', 'Archived', 'Admin', 'Archive draft'),
('In Review', 'Approved', 'Merchandiser', 'Approve tech pack'),
('In Review', 'Rejected', 'Merchandiser', 'Reject tech pack'),
('In Review', 'Draft', 'Designer', 'Return to draft for changes'),
('Approved', 'Archived', 'Admin', 'Archive approved tech pack'),
('Rejected', 'Draft', 'Designer', 'Revise rejected tech pack');

-- Enhanced status validation function using the transitions table
CREATE OR REPLACE FUNCTION validate_status_transition_enhanced(
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    user_role VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    transition_exists BOOLEAN := FALSE;
BEGIN
    -- Check if transition is valid
    SELECT EXISTS(
        SELECT 1 FROM status_transitions 
        WHERE from_status = old_status 
        AND to_status = new_status
        AND (required_role IS NULL OR required_role = user_role)
    ) INTO transition_exists;
    
    RETURN transition_exists;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERSION CONTROL BUSINESS RULES
-- =====================================================

-- Function to determine if changes require version increment
CREATE OR REPLACE FUNCTION requires_version_increment(
    old_record tech_packs,
    new_record tech_packs
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Major changes that require version increment
    RETURN (
        old_record.product_name != new_record.product_name OR
        old_record.fabric_description != new_record.fabric_description OR
        old_record.supplier_info != new_record.supplier_info OR
        old_record.fit_type != new_record.fit_type OR
        old_record.product_class != new_record.product_class
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATA INTEGRITY CHECKS
-- =====================================================

-- Function to validate tech pack completeness before approval
CREATE OR REPLACE FUNCTION validate_tech_pack_completeness(p_tech_pack_id UUID)
RETURNS TABLE(is_complete BOOLEAN, missing_items TEXT[]) AS $$
DECLARE
    missing_list TEXT[] := ARRAY[]::TEXT[];
    bom_count INTEGER;
    measurement_count INTEGER;
    colorway_count INTEGER;
BEGIN
    -- Check BOM exists
    SELECT COUNT(*) INTO bom_count
    FROM bill_of_materials
    WHERE tech_pack_id = p_tech_pack_id;
    
    IF bom_count = 0 THEN
        missing_list := array_append(missing_list, 'Bill of Materials');
    END IF;
    
    -- Check measurements exist
    SELECT COUNT(*) INTO measurement_count
    FROM measurement_charts
    WHERE tech_pack_id = p_tech_pack_id AND is_active = TRUE;
    
    IF measurement_count = 0 THEN
        missing_list := array_append(missing_list, 'Measurement Charts');
    END IF;
    
    -- Check colorways exist
    SELECT COUNT(*) INTO colorway_count
    FROM colorways
    WHERE tech_pack_id = p_tech_pack_id;
    
    IF colorway_count = 0 THEN
        missing_list := array_append(missing_list, 'Colorways');
    END IF;
    
    RETURN QUERY SELECT (array_length(missing_list, 1) IS NULL), missing_list;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUDIT AND COMPLIANCE FUNCTIONS
-- =====================================================

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION check_data_retention_compliance()
RETURNS TABLE(tech_pack_id UUID, article_code VARCHAR(50), days_since_update INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT tp.tech_pack_id, tp.article_code, 
           EXTRACT(DAY FROM CURRENT_TIMESTAMP - tp.updated_at)::INTEGER
    FROM tech_packs tp
    WHERE tp.status = 'Archived'
    AND tp.updated_at < CURRENT_TIMESTAMP - INTERVAL '7 years'
    ORDER BY tp.updated_at;
END;
$$ LANGUAGE plpgsql;
