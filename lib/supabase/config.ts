export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const testerGroupEmail =
  process.env.NEXT_PUBLIC_TESTER_GROUP_EMAIL ?? 'testloop-testers@googlegroups.com';
