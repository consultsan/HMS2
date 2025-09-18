-- Fix PostgreSQL replica identity issue for join tables
-- This migration sets the replica identity for Prisma-generated join tables

-- Fix the _DiseaseTemplateToLabTest join table
ALTER TABLE "_DiseaseTemplateToLabTest" REPLICA IDENTITY FULL;
