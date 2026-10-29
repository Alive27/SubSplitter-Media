import { createClient } from '@supabase/supabase-js'

// Sustituye estos valores con la URL y la Anon Key de tu proyecto en Supabase
const SUPABASE_URL = 'https://jvtloxcpndwodubrmhtu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_Kzg4Yt7ERGhALo6QjurEew_921z7-Gh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)