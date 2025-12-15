-- ============================================
-- Add Travel Support to Calendar Events
-- ============================================
-- This migration adds columns to support travel events
-- which track movement between homes or locations.
-- ============================================

-- Add travel-specific columns to calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS from_home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS from_location TEXT,
ADD COLUMN IF NOT EXISTS to_home_id UUID REFERENCES homes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS to_location TEXT,
ADD COLUMN IF NOT EXISTS travel_with TEXT;

-- Add indexes for travel queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_from_home_id ON calendar_events (from_home_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_to_home_id ON calendar_events (to_home_id);

-- Add comment for documentation
COMMENT ON COLUMN calendar_events.from_home_id IS 'For travel events: the home being departed from (null if custom location)';
COMMENT ON COLUMN calendar_events.from_location IS 'For travel events: custom location name if from_home_id is null';
COMMENT ON COLUMN calendar_events.to_home_id IS 'For travel events: the destination home (null if custom location)';
COMMENT ON COLUMN calendar_events.to_location IS 'For travel events: custom location name if to_home_id is null';
COMMENT ON COLUMN calendar_events.travel_with IS 'For travel events: who is traveling with the child (e.g., Mom, Dad, Both)';

-- ============================================
-- Verify the changes
-- ============================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calendar_events'
AND column_name IN ('from_home_id', 'from_location', 'to_home_id', 'to_location', 'travel_with')
ORDER BY column_name;
