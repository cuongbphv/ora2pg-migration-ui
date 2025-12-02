-- Test user data
-- This script will run automatically on application startup
-- Email: test@gmail.com
-- Password: 123456 (hashed with BCrypt)

-- Note: The password hash below is for "123456" using BCrypt
-- If the user already exists, this will be skipped by the DataInitializer component

-- To manually insert (if needed), use:
-- INSERT INTO users (id, email, password, name, role, created_at, updated_at)
-- VALUES (
--   gen_random_uuid(),
--   'test@gmail.com',
--   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- BCrypt hash of "123456"
--   'Test User',
--   'admin',
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP
-- )
-- ON CONFLICT (email) DO NOTHING;

