-- ============================================================================
-- Script: Create Missing SPOC Users
-- ============================================================================
-- Description: Creates placeholder users for SPOCs that don't exist yet
--              You should update these with real email addresses and passwords
-- ============================================================================
-- WARNING: This creates users with placeholder emails and default passwords.
--          You MUST update the email addresses and set proper passwords after running this.
-- ============================================================================

-- Create Joji Joseph if doesn't exist
INSERT INTO users (email, password_hash, full_name, role)
SELECT 
  'joji.joseph@mfilterit.com',  -- UPDATE THIS EMAIL
  '$2a$10$placeholder.hash.update.this.password',  -- UPDATE THIS PASSWORD
  'Joji Joseph',
  'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE full_name = 'Joji Joseph'
);

-- Create Santosh Kumar if doesn't exist
INSERT INTO users (email, password_hash, full_name, role)
SELECT 
  'santosh.kumar@mfilterit.com',  -- UPDATE THIS EMAIL
  '$2a$10$placeholder.hash.update.this.password',  -- UPDATE THIS PASSWORD
  'Santosh Kumar',
  'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE full_name = 'Santosh Kumar'
);

-- Create Apar Bhatnagar if doesn't exist
INSERT INTO users (email, password_hash, full_name, role)
SELECT 
  'apar.bhatnagar@mfilterit.com',  -- UPDATE THIS EMAIL
  '$2a$10$placeholder.hash.update.this.password',  -- UPDATE THIS PASSWORD
  'Apar Bhatnagar',
  'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE full_name = 'Apar Bhatnagar'
);

-- Create Chethana H if doesn't exist
INSERT INTO users (email, password_hash, full_name, role)
SELECT 
  'chethana.h@mfilterit.com',  -- UPDATE THIS EMAIL
  '$2a$10$placeholder.hash.update.this.password',  -- UPDATE THIS PASSWORD
  'Chethana H',
  'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE full_name = 'Chethana H'
);

-- Create Gaurav Verma if doesn't exist
INSERT INTO users (email, password_hash, full_name, role)
SELECT 
  'gaurav.verma@mfilterit.com',  -- UPDATE THIS EMAIL
  '$2a$10$placeholder.hash.update.this.password',  -- UPDATE THIS PASSWORD
  'Gaurav Verma',
  'agent'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE full_name = 'Gaurav Verma'
);

-- Update Sachin Kumar's name to proper case if exists as lowercase
UPDATE users 
SET full_name = 'Sachin Kumar'
WHERE LOWER(full_name) = 'sachin kumar' AND full_name != 'Sachin Kumar';

-- Show created/updated users
SELECT 
  id,
  full_name,
  email,
  role,
  CASE 
    WHEN email LIKE '%placeholder%' OR password_hash LIKE '%placeholder%' THEN '⚠️  Needs real email/password'
    ELSE '✅ Ready'
  END as status
FROM users
WHERE full_name IN ('Joji Joseph', 'Soju Jose', 'Santosh Kumar', 'Sachin Kumar', 'Apar Bhatnagar', 'Chethana H', 'Gaurav Verma')
ORDER BY full_name;

-- ============================================================================
-- IMPORTANT: After running this script
-- ============================================================================
-- 1. Update email addresses for the created users with real emails
-- 2. Set proper passwords (use your authentication system's password hashing)
-- 3. Run the SPOC update script: 030-update-business-group-spocs.sql
-- ============================================================================
