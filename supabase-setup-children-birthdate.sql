-- ============================================
-- ADD BIRTHDATE AND GENDER TO CHILDREN TABLE
-- ============================================
-- Run this in your Supabase SQL Editor to add
-- birthdate and gender columns to the children table.
-- ============================================

-- Add birthdate column
ALTER TABLE children
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Add gender column
ALTER TABLE children
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add comments
COMMENT ON COLUMN children.birthdate IS 'Child birth date for age calculation and milestones';
COMMENT ON COLUMN children.gender IS 'Child gender: boy, girl, or NULL if not specified';

-- ============================================
-- DONE!
-- ============================================
