-- Fix PostgreSQL replica identity issue for join tables
-- This script sets the replica identity for Prisma-generated join tables

-- Fix the _DiseaseTemplateToLabTest join table
ALTER TABLE "_DiseaseTemplateToLabTest" REPLICA IDENTITY FULL;

-- Fix other potential join tables that might have the same issue
-- (Add more tables as needed)

-- Optional: Check if the table exists before altering
-- DO $$
-- BEGIN
--     IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_DiseaseTemplateToLabTest') THEN
--         ALTER TABLE "_DiseaseTemplateToLabTest" REPLICA IDENTITY FULL;
--     END IF;
-- END $$;
