-- =====================================================
-- Tech Pack Management System - Security & Access Control
-- =====================================================

-- =====================================================
-- ROLE-BASED ACCESS CONTROL (RBAC)
-- =====================================================

-- Create roles table for fine-grained permissions
CREATE TABLE roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles with permissions
INSERT INTO roles (role_name, description, permissions) VALUES
('Admin', 'System Administrator', 
 '["tech_pack:create", "tech_pack:read", "tech_pack:update", "tech_pack:delete", "tech_pack:approve", "user:manage", "system:configure"]'::JSONB),
('Designer', 'Product Designer', 
 '["tech_pack:create", "tech_pack:read", "tech_pack:update", "bom:manage", "measurement:manage", "colorway:manage"]'::JSONB),
('Merchandiser', 'Merchandiser/Buyer', 
 '["tech_pack:read", "tech_pack:approve", "tech_pack:reject", "reports:view"]'::JSONB),
('Production', 'Production Manager', 
 '["tech_pack:read", "bom:read", "measurement:read", "colorway:read", "production:update"]'::JSONB),
('Supplier', 'External Supplier', 
 '["tech_pack:read_assigned", "bom:read_assigned", "measurement:read_assigned"]'::JSONB),
('Viewer', 'Read-only Access', 
 '["tech_pack:read", "bom:read", "measurement:read", "colorway:read"]'::JSONB);

-- Update users table to reference roles
ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(role_id);

-- Update existing users to have roles
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = role_name);

-- Make role_id required after migration
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all main tables
ALTER TABLE tech_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_of_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE how_to_measures ENABLE ROW LEVEL SECURITY;
ALTER TABLE colorways ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_histories ENABLE ROW LEVEL SECURITY;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
BEGIN
    SELECT r.permissions INTO user_permissions
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = user_id AND u.is_active = TRUE AND r.is_active = TRUE;
    
    RETURN user_permissions ? permission_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access specific tech pack
CREATE OR REPLACE FUNCTION can_access_tech_pack(user_id UUID, tech_pack_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_name VARCHAR(50);
    tech_pack_supplier_id TEXT;
    user_supplier_id TEXT;
BEGIN
    -- Get user role
    SELECT r.role_name INTO user_role_name
    FROM users u
    JOIN roles r ON u.role_id = r.role_id
    WHERE u.user_id = user_id;
    
    -- Admin can access everything
    IF user_role_name = 'Admin' THEN
        RETURN TRUE;
    END IF;
    
    -- For suppliers, check if they're assigned to this tech pack
    IF user_role_name = 'Supplier' THEN
        SELECT tp.supplier_info->>'supplierId', u.username 
        INTO tech_pack_supplier_id, user_supplier_id
        FROM tech_packs tp, users u
        WHERE tp.tech_pack_id = tech_pack_id AND u.user_id = user_id;
        
        RETURN tech_pack_supplier_id = user_supplier_id;
    END IF;
    
    -- Other roles can access based on general permissions
    RETURN has_permission(user_id, 'tech_pack:read');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for tech_packs
CREATE POLICY tech_pack_access_policy ON tech_packs
    FOR ALL
    TO PUBLIC
    USING (can_access_tech_pack(current_setting('app.current_user_id')::UUID, tech_pack_id));

-- RLS Policies for bill_of_materials
CREATE POLICY bom_access_policy ON bill_of_materials
    FOR ALL
    TO PUBLIC
    USING (can_access_tech_pack(current_setting('app.current_user_id')::UUID, tech_pack_id));

-- RLS Policies for measurement_charts
CREATE POLICY measurement_access_policy ON measurement_charts
    FOR ALL
    TO PUBLIC
    USING (can_access_tech_pack(current_setting('app.current_user_id')::UUID, tech_pack_id));

-- RLS Policies for colorways
CREATE POLICY colorway_access_policy ON colorways
    FOR ALL
    TO PUBLIC
    USING (can_access_tech_pack(current_setting('app.current_user_id')::UUID, tech_pack_id));

-- RLS Policies for revision_histories
CREATE POLICY revision_access_policy ON revision_histories
    FOR ALL
    TO PUBLIC
    USING (can_access_tech_pack(current_setting('app.current_user_id')::UUID, tech_pack_id));

-- =====================================================
-- DATA ENCRYPTION FUNCTIONS
-- =====================================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key_name TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    -- Use application-level encryption key (should be stored securely)
    RETURN encode(
        pgp_sym_encrypt(
            data, 
            current_setting('app.encryption_key_' || key_name, true)
        ), 
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key_name TEXT DEFAULT 'default')
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_data, 'base64'),
        current_setting('app.encryption_key_' || key_name, true)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL; -- Return NULL if decryption fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encrypted columns for sensitive data
ALTER TABLE tech_packs ADD COLUMN supplier_contact_encrypted TEXT;
ALTER TABLE bill_of_materials ADD COLUMN supplier_contact_encrypted TEXT;

-- =====================================================
-- AUDIT LOGGING FOR SECURITY
-- =====================================================

-- Create security audit log table
CREATE TABLE security_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    additional_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for security audit log
CREATE INDEX idx_security_audit_user_timestamp ON security_audit_log (user_id, timestamp DESC);
CREATE INDEX idx_security_audit_action ON security_audit_log (action);
CREATE INDEX idx_security_audit_resource ON security_audit_log (resource_type, resource_id);

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_resource_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_failure_reason TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        user_id, action, resource_type, resource_id,
        ip_address, user_agent, success, failure_reason, additional_data
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_success, p_failure_reason, p_additional_data
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SESSION MANAGEMENT
-- =====================================================

-- Create user sessions table
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session management
CREATE INDEX idx_user_sessions_token ON user_sessions (session_token);
CREATE INDEX idx_user_sessions_user_active ON user_sessions (user_id, is_active);
CREATE INDEX idx_user_sessions_expires ON user_sessions (expires_at);

-- Function to create user session
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 24
)
RETURNS TABLE(session_id UUID, session_token VARCHAR(255)) AS $$
DECLARE
    new_session_id UUID;
    new_session_token VARCHAR(255);
BEGIN
    -- Generate secure session token
    new_session_token := encode(gen_random_bytes(32), 'base64');
    
    -- Insert session
    INSERT INTO user_sessions (
        user_id, session_token, ip_address, user_agent, expires_at
    ) VALUES (
        p_user_id, new_session_token, p_ip_address, p_user_agent,
        CURRENT_TIMESTAMP + (p_expires_hours || ' hours')::INTERVAL
    ) RETURNING user_sessions.session_id INTO new_session_id;
    
    -- Log session creation
    PERFORM log_security_event(
        p_user_id, 'SESSION_CREATED', 'USER_SESSION', new_session_id,
        p_ip_address, p_user_agent, TRUE
    );
    
    RETURN QUERY SELECT new_session_id, new_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate session
CREATE OR REPLACE FUNCTION validate_session(p_session_token VARCHAR(255))
RETURNS TABLE(user_id UUID, role_name VARCHAR(50), permissions JSONB) AS $$
BEGIN
    -- Update last activity and return user info
    UPDATE user_sessions 
    SET last_activity = CURRENT_TIMESTAMP
    WHERE session_token = p_session_token 
    AND is_active = TRUE 
    AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN QUERY
    SELECT u.user_id, r.role_name, r.permissions
    FROM user_sessions s
    JOIN users u ON s.user_id = u.user_id
    JOIN roles r ON u.role_id = r.role_id
    WHERE s.session_token = p_session_token
    AND s.is_active = TRUE
    AND s.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = TRUE
    AND r.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECURITY MONITORING FUNCTIONS
-- =====================================================

-- Function to detect suspicious activities
CREATE OR REPLACE FUNCTION detect_suspicious_activities()
RETURNS TABLE(
    alert_type VARCHAR(50),
    user_id UUID,
    username VARCHAR(50),
    description TEXT,
    severity VARCHAR(20),
    event_count INTEGER,
    first_occurrence TIMESTAMP WITH TIME ZONE,
    last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Multiple failed login attempts
    RETURN QUERY
    SELECT 
        'MULTIPLE_FAILED_LOGINS'::VARCHAR(50),
        sal.user_id,
        u.username,
        'Multiple failed login attempts detected'::TEXT,
        'HIGH'::VARCHAR(20),
        COUNT(*)::INTEGER,
        MIN(sal.timestamp),
        MAX(sal.timestamp)
    FROM security_audit_log sal
    JOIN users u ON sal.user_id = u.user_id
    WHERE sal.action = 'LOGIN_ATTEMPT'
    AND sal.success = FALSE
    AND sal.timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    GROUP BY sal.user_id, u.username
    HAVING COUNT(*) >= 5;
    
    -- Unusual access patterns
    RETURN QUERY
    SELECT 
        'UNUSUAL_ACCESS_PATTERN'::VARCHAR(50),
        sal.user_id,
        u.username,
        'Unusual number of tech pack accesses'::TEXT,
        'MEDIUM'::VARCHAR(20),
        COUNT(*)::INTEGER,
        MIN(sal.timestamp),
        MAX(sal.timestamp)
    FROM security_audit_log sal
    JOIN users u ON sal.user_id = u.user_id
    WHERE sal.action = 'TECH_PACK_ACCESS'
    AND sal.timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
    GROUP BY sal.user_id, u.username
    HAVING COUNT(*) > 100;
    
    -- Access from multiple IP addresses
    RETURN QUERY
    SELECT 
        'MULTIPLE_IP_ACCESS'::VARCHAR(50),
        sal.user_id,
        u.username,
        'Access from multiple IP addresses'::TEXT,
        'MEDIUM'::VARCHAR(20),
        COUNT(DISTINCT sal.ip_address)::INTEGER,
        MIN(sal.timestamp),
        MAX(sal.timestamp)
    FROM security_audit_log sal
    JOIN users u ON sal.user_id = u.user_id
    WHERE sal.timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND sal.ip_address IS NOT NULL
    GROUP BY sal.user_id, u.username
    HAVING COUNT(DISTINCT sal.ip_address) > 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATA MASKING FOR NON-PRODUCTION ENVIRONMENTS
-- =====================================================

-- Function to mask sensitive data for development/testing
CREATE OR REPLACE FUNCTION mask_sensitive_data()
RETURNS VOID AS $$
BEGIN
    -- Only run in non-production environments
    IF current_setting('app.environment', true) NOT IN ('development', 'testing') THEN
        RAISE EXCEPTION 'Data masking can only be run in development or testing environments';
    END IF;
    
    -- Mask user emails
    UPDATE users 
    SET email = 'user' || user_id::TEXT || '@example.com',
        full_name = 'Test User ' || ROW_NUMBER() OVER (ORDER BY created_at);
    
    -- Mask supplier information
    UPDATE tech_packs 
    SET supplier_info = jsonb_set(
        supplier_info,
        '{supplierName}',
        '"Test Supplier"'::JSONB
    );
    
    -- Clear sensitive audit data
    UPDATE security_audit_log 
    SET ip_address = '127.0.0.1'::INET,
        user_agent = 'Test Agent';
    
    RAISE NOTICE 'Sensitive data has been masked for non-production use';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP PROCEDURES
-- =====================================================

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old logs to archive table (create if not exists)
    CREATE TABLE IF NOT EXISTS security_audit_log_archive (
        LIKE security_audit_log INCLUDING ALL
    );
    
    -- Move old records
    WITH moved_records AS (
        DELETE FROM security_audit_log 
        WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL
        RETURNING *
    )
    INSERT INTO security_audit_log_archive 
    SELECT * FROM moved_records;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
