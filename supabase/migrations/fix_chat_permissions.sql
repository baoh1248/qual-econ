-- Fix RLS policies for chat tables to allow anon users (custom auth app)
-- The app uses a custom auth system and does not create Supabase auth sessions,
-- so auth.uid() is always null. Allow all operations for anon role.

-- ── chat_rooms ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all users to read chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow all users to insert chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow all users to update chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Allow all users to delete chat_rooms" ON chat_rooms;

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read chat_rooms"
  ON chat_rooms FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat_rooms"
  ON chat_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update chat_rooms"
  ON chat_rooms FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete chat_rooms"
  ON chat_rooms FOR DELETE USING (true);

-- ── chat_room_members ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all users to read chat_room_members" ON chat_room_members;
DROP POLICY IF EXISTS "Allow all users to insert chat_room_members" ON chat_room_members;
DROP POLICY IF EXISTS "Allow all users to update chat_room_members" ON chat_room_members;
DROP POLICY IF EXISTS "Allow all users to delete chat_room_members" ON chat_room_members;

ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read chat_room_members"
  ON chat_room_members FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert chat_room_members"
  ON chat_room_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update chat_room_members"
  ON chat_room_members FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete chat_room_members"
  ON chat_room_members FOR DELETE USING (true);

-- ── messages ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all users to read messages" ON messages;
DROP POLICY IF EXISTS "Allow all users to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow all users to update messages" ON messages;
DROP POLICY IF EXISTS "Allow all users to delete messages" ON messages;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to read messages"
  ON messages FOR SELECT USING (true);

CREATE POLICY "Allow all users to insert messages"
  ON messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all users to update messages"
  ON messages FOR UPDATE USING (true);

CREATE POLICY "Allow all users to delete messages"
  ON messages FOR DELETE USING (true);
