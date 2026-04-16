import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ppequqcwptkipuitlxwo.supabase.co";
const supabaseAnonKey = "sb_publishable_lpcFhytaM5lxyIr-I5zIqA_M1dTIJw4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
