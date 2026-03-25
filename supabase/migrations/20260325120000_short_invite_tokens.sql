-- Migration: Change invite token from UUID to TEXT for shorter codes
-- This allows using nanoid (8 chars) instead of full UUIDs (36 chars)
-- Result: Simpler QR codes and cleaner URLs

-- Step 1: Drop the default (which generates UUIDs)
ALTER TABLE invites ALTER COLUMN token DROP DEFAULT;

-- Step 2: Change column type from UUID to TEXT
-- The USING clause converts existing UUIDs to text
ALTER TABLE invites ALTER COLUMN token TYPE TEXT USING token::TEXT;

-- Step 3: Ensure the column is still NOT NULL and UNIQUE
-- (These constraints should persist, but let's be explicit)
ALTER TABLE invites ALTER COLUMN token SET NOT NULL;

-- Note: The UNIQUE constraint on token should persist through the type change
-- If it doesn't, uncomment this:
-- ALTER TABLE invites ADD CONSTRAINT invites_token_unique UNIQUE (token);
