-- Create tables for Documents and Health features
-- Run this in your Supabase SQL editor

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,

    -- Document info
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('id', 'school', 'health', 'travel', 'legal', 'other')),
    file_path TEXT, -- Path in Supabase storage
    file_type TEXT, -- 'pdf', 'image', etc.
    file_size INTEGER, -- Size in bytes

    -- Metadata
    description TEXT,
    expiry_date DATE,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    tags TEXT[], -- Array of tags

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_family_id ON documents(family_id);
CREATE INDEX IF NOT EXISTS idx_documents_child_id ON documents(child_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_is_pinned ON documents(is_pinned);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their family's documents"
    ON documents FOR SELECT
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert documents for their family"
    ON documents FOR INSERT
    WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their family's documents"
    ON documents FOR UPDATE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their family's documents"
    ON documents FOR DELETE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

-- ============================================
-- ALLERGIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

    -- Allergy info
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'medication', 'environmental', 'other')),
    severity TEXT NOT NULL DEFAULT 'mild' CHECK (severity IN ('mild', 'moderate', 'severe')),

    -- Details
    reaction TEXT, -- What happens
    action TEXT, -- What to do
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for allergies
CREATE INDEX IF NOT EXISTS idx_allergies_family_id ON allergies(family_id);
CREATE INDEX IF NOT EXISTS idx_allergies_child_id ON allergies(child_id);
CREATE INDEX IF NOT EXISTS idx_allergies_category ON allergies(category);
CREATE INDEX IF NOT EXISTS idx_allergies_severity ON allergies(severity);

-- Enable RLS
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for allergies
CREATE POLICY "Users can view their family's allergies"
    ON allergies FOR SELECT
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert allergies for their family"
    ON allergies FOR INSERT
    WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their family's allergies"
    ON allergies FOR UPDATE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their family's allergies"
    ON allergies FOR DELETE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

-- ============================================
-- MEDICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,

    -- Medication info
    name TEXT NOT NULL,
    dose TEXT, -- e.g., "2 puffs", "5 ml"
    frequency TEXT, -- e.g., "daily", "as needed", "twice daily"
    schedule TEXT, -- e.g., "morning", "with breakfast", "when wheezing"

    -- Additional info
    notes TEXT,
    is_as_needed BOOLEAN NOT NULL DEFAULT false, -- PRN medication
    is_active BOOLEAN NOT NULL DEFAULT true, -- Currently taking

    -- Timestamps
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for medications
CREATE INDEX IF NOT EXISTS idx_medications_family_id ON medications(family_id);
CREATE INDEX IF NOT EXISTS idx_medications_child_id ON medications(child_id);
CREATE INDEX IF NOT EXISTS idx_medications_is_active ON medications(is_active);
CREATE INDEX IF NOT EXISTS idx_medications_is_as_needed ON medications(is_as_needed);

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for medications
CREATE POLICY "Users can view their family's medications"
    ON medications FOR SELECT
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert medications for their family"
    ON medications FOR INSERT
    WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their family's medications"
    ON medications FOR UPDATE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their family's medications"
    ON medications FOR DELETE
    USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid()));

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

-- Documents updated_at trigger
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Allergies updated_at trigger
CREATE OR REPLACE FUNCTION update_allergies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER allergies_updated_at
    BEFORE UPDATE ON allergies
    FOR EACH ROW
    EXECUTE FUNCTION update_allergies_updated_at();

-- Medications updated_at trigger
CREATE OR REPLACE FUNCTION update_medications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medications_updated_at
    BEFORE UPDATE ON medications
    FOR EACH ROW
    EXECUTE FUNCTION update_medications_updated_at();

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ============================================
-- Run this separately or in the Supabase dashboard:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false);
--
-- Then add storage policies:
--
-- CREATE POLICY "Users can view their family's document files"
-- ON storage.objects FOR SELECT
-- USING (
--     bucket_id = 'documents' AND
--     (storage.foldername(name))[1] IN (
--         SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
--     )
-- );
--
-- CREATE POLICY "Users can upload document files for their family"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'documents' AND
--     (storage.foldername(name))[1] IN (
--         SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
--     )
-- );
--
-- CREATE POLICY "Users can delete their family's document files"
-- ON storage.objects FOR DELETE
-- USING (
--     bucket_id = 'documents' AND
--     (storage.foldername(name))[1] IN (
--         SELECT family_id::text FROM family_members WHERE user_id = auth.uid()
--     )
-- );
