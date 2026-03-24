-- Backfill household_name based on shared children
-- Strategy: Homes sharing the same children belong to the same "household"
-- Name format: "[Child Name(s)] Care" e.g., "June Jolie Care" or "Elodie & June Care"

-- Create a temp table to compute household groups based on shared children
WITH home_children AS (
    -- Get sorted child IDs per home as an array (for grouping)
    SELECT
        h.id as home_id,
        ARRAY_AGG(cs.child_id ORDER BY cs.child_id) as child_ids
    FROM homes h
    LEFT JOIN child_spaces cs ON cs.home_id = h.id
    WHERE h.household_name IS NULL
    GROUP BY h.id
),
child_group_names AS (
    -- For each unique child set, build a household name from child names
    SELECT DISTINCT ON (hc.child_ids)
        hc.child_ids,
        CASE
            WHEN array_length(hc.child_ids, 1) IS NULL OR hc.child_ids = ARRAY[NULL]::uuid[] THEN NULL
            WHEN array_length(hc.child_ids, 1) = 1 THEN
                (SELECT c.name || ' Care' FROM children c WHERE c.id = hc.child_ids[1])
            WHEN array_length(hc.child_ids, 1) = 2 THEN
                (SELECT c1.name || ' & ' || c2.name || ' Care'
                 FROM children c1, children c2
                 WHERE c1.id = hc.child_ids[1] AND c2.id = hc.child_ids[2])
            ELSE
                (SELECT c.name || ' Family Care' FROM children c WHERE c.id = hc.child_ids[1])
        END as household_name
    FROM home_children hc
    WHERE hc.child_ids IS NOT NULL AND hc.child_ids != ARRAY[NULL]::uuid[]
)
UPDATE homes h
SET household_name = cgn.household_name
FROM home_children hc
JOIN child_group_names cgn ON hc.child_ids = cgn.child_ids
WHERE h.id = hc.home_id
  AND h.household_name IS NULL
  AND cgn.household_name IS NOT NULL;

-- For homes without children, use creator's name as household
UPDATE homes h
SET household_name = p.name || '''s Household'
FROM profiles p
WHERE h.created_by = p.id
  AND h.household_name IS NULL
  AND NOT EXISTS (SELECT 1 FROM child_spaces cs WHERE cs.home_id = h.id);
