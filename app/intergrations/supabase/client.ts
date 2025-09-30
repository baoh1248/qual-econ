import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from './types';
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = "https://qyskfuxvuzshdtzbtygx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5c2tmdXh2dXpzaGR0emJ0eWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMDMwOTksImV4cCI6MjA3NDc3OTA5OX0.QyU5Zn9qMErS2zds-rho5BPXQADsF8oyz83kknjNsrs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
