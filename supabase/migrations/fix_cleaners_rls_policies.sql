-- Ensure all CRUD operations are allowed on cleaners table
-- RLS policies for anon role to support full cleaner management

-- Drop existing policies if any, then recreate cleanly
DROP POLICY IF EXISTS "Allow insert on cleaners" ON cleaners;
DROP POLICY IF EXISTS "Allow select on cleaners" ON cleaners;
DROP POLICY IF EXISTS "Allow update on cleaners" ON cleaners;
DROP POLICY IF EXISTS "Allow delete on cleaners" ON cleaners;
DROP POLICY IF EXISTS "Allow all operations on cleaners" ON cleaners;

CREATE POLICY "Allow select on cleaners" ON cleaners
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow insert on cleaners" ON cleaners
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow update on cleaners" ON cleaners
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow delete on cleaners" ON cleaners
  FOR DELETE TO anon USING (true);
