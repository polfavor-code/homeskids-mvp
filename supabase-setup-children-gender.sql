-- ============================================
-- HOMES.KIDS: Add Gender Column to Children
-- ============================================
-- Adds the optional gender field to the children table
-- ============================================

DO $$
BEGIN
    -- Add gender column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'gender') THEN
        ALTER TABLE children ADD COLUMN gender TEXT CHECK (gender IN ('boy', 'girl'));
    END IF;
END $$;

COMMENT ON COLUMN children.gender IS 'Optional gender: boy or girl';





