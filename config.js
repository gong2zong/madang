// Supabase 프로젝트 설정값을 붙여 넣으세요.
const SUPABASE_URL = "https://gscsegsifaeqvqsmiwvz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_V25Nh-2GWVLBlrRMasD4yg_2U9TVshK";

// 브라우저에서 사용할 Supabase 클라이언트입니다.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
