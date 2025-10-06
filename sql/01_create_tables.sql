-- =====================================================
-- Tech Pack Management System - SQL DDL Statements
-- Compatible with PostgreSQL 14+ and SQL Server 2019+
-- =====================================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE (for audit trail and access control)
-- =====================================================
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_name VARCHAR(50) NOT NULL CHECK (role_name IN ('Admin', 'Designer', 'Merchandiser', 'Production', 'Supplier', 'Viewer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. TECH_PACKS TABLE (Main entity)
-- =====================================================
CREATE TABLE tech_packs (
    tech_pack_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Unisex', 'Kids')),
    fit_type VARCHAR(50) NOT NULL CHECK (fit_type IN ('Slim Fit', 'Regular Fit', 'Loose Fit', 'Oversized')),
    product_class VARCHAR(100) NOT NULL,
    
    -- Supplier Information (JSON for flexibility)
    supplier_info JSONB NOT NULL,
    
    fabric_description TEXT NOT NULL,
    designer VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    season VARCHAR(20) NOT NULL,
    lifecycle_stage VARCHAR(50) NOT NULL CHECK (lifecycle_stage IN ('Concept', 'Design', 'Development', 'Pre-production', 'Production', 'Shipped')),
    status VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'In Review', 'Approved', 'Rejected', 'Archived')),
    
    -- Optional fields
    brand_name VARCHAR(255),
    collection VARCHAR(255),
    target_market VARCHAR(255),
    price_point VARCHAR(20) CHECK (price_point IN ('Value', 'Mid-range', 'Premium', 'Luxury')),
    
    -- Media and documentation (JSON arrays)
    product_images JSONB DEFAULT '[]',
    technical_drawings JSONB DEFAULT '[]',
    notes TEXT,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT unique_article_version UNIQUE (article_code, version)
);

-- =====================================================
-- 3. BILL_OF_MATERIALS TABLE
-- =====================================================
CREATE TABLE bill_of_materials (
    bom_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_pack_id UUID NOT NULL REFERENCES tech_packs(tech_pack_id) ON DELETE CASCADE,
    
    -- Core BOM fields
    part_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    placement VARCHAR(500),
    size_info VARCHAR(100),
    quantity DECIMAL(10,4) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(20) NOT NULL CHECK (unit_of_measure IN ('m', 'cm', 'mm', 'pcs', 'kg', 'g', 'yards', 'inches')),
    
    -- Supplier information
    supplier_code VARCHAR(100) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    
    -- Additional specifications
    color_code VARCHAR(50),
    image_url TEXT,
    specifications TEXT,
    material_composition VARCHAR(500),
    weight VARCHAR(50),
    width VARCHAR(50),
    shrinkage VARCHAR(50),
    care_instructions TEXT,
    testing_requirements TEXT,
    comments TEXT,
    
    -- Sub-materials (JSON for nested structure)
    sub_materials JSONB DEFAULT '[]',
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT unique_tech_pack_part UNIQUE (tech_pack_id, part_name, material_name)
);

-- =====================================================
-- 4. MEASUREMENT_CHARTS TABLE
-- =====================================================
CREATE TABLE measurement_charts (
    measurement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_pack_id UUID NOT NULL REFERENCES tech_packs(tech_pack_id) ON DELETE CASCADE,
    
    -- POM (Point of Measure) information
    pom_code VARCHAR(50) NOT NULL,
    pom_name VARCHAR(255) NOT NULL,
    tolerance VARCHAR(50) NOT NULL,
    measurement_method TEXT,
    notes TEXT,
    
    -- Version control
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Size matrix (JSON for flexibility with different size ranges)
    sizes JSONB NOT NULL DEFAULT '{}',
    
    -- Approval workflow
    approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES users(user_id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT unique_tech_pack_pom UNIQUE (tech_pack_id, pom_code, version)
);

-- =====================================================
-- 5. HOW_TO_MEASURES TABLE
-- =====================================================
CREATE TABLE how_to_measures (
    how_to_measure_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_pack_id UUID NOT NULL REFERENCES tech_packs(tech_pack_id) ON DELETE CASCADE,
    pom_code VARCHAR(50) NOT NULL,
    
    -- Instruction content
    detailed_instructions TEXT NOT NULL,
    measurement_steps JSONB DEFAULT '[]', -- Array of step descriptions
    illustration_images JSONB DEFAULT '[]', -- Array of image URLs
    video_url TEXT,
    
    -- Localization
    language VARCHAR(10) NOT NULL DEFAULT 'en-US' CHECK (language IN ('en-US', 'vi-VN', 'zh-CN', 'es-ES')),
    
    -- Version control
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT unique_pom_language UNIQUE (tech_pack_id, pom_code, language, version),
    
    -- Foreign key to measurement_charts
    CONSTRAINT fk_measurement_chart
        FOREIGN KEY (tech_pack_id, pom_code)
        REFERENCES measurement_charts(tech_pack_id, pom_code)
        ON DELETE CASCADE
);

-- =====================================================
-- 6. COLORWAYS TABLE
-- =====================================================
CREATE TABLE colorways (
    colorway_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_pack_id UUID NOT NULL REFERENCES tech_packs(tech_pack_id) ON DELETE CASCADE,

    -- Colorway identification
    colorway_name VARCHAR(255) NOT NULL,
    colorway_code VARCHAR(50) NOT NULL,
    season VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,

    -- Color parts (JSON array for flexibility)
    color_parts JSONB NOT NULL DEFAULT '[]',

    -- Approval and production status
    approval_status VARCHAR(20) DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
    production_status VARCHAR(20) DEFAULT 'Lab Dip' CHECK (production_status IN ('Lab Dip', 'Bulk Fabric', 'Finished')),

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(user_id),
    updated_by UUID REFERENCES users(user_id),

    -- Constraints
    CONSTRAINT unique_tech_pack_colorway UNIQUE (tech_pack_id, colorway_code)
);

-- =====================================================
-- 7. REVISION_HISTORIES TABLE
-- =====================================================
CREATE TABLE revision_histories (
    revision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tech_pack_id UUID NOT NULL REFERENCES tech_packs(tech_pack_id) ON DELETE CASCADE,

    -- Revision information
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('CREATE', 'UPDATE', 'STATUS_CHANGE', 'DELETE')),

    -- Change details (JSON for flexibility)
    changed_fields JSONB NOT NULL DEFAULT '[]',

    -- User information
    user_id UUID NOT NULL REFERENCES users(user_id),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,

    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Approval workflow
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(user_id),
    approval_date TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_tech_pack_revision UNIQUE (tech_pack_id, revision_number)
);
