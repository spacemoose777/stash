// Stash Configuration
// Replace these with your Supabase project details

const CONFIG = {
  // Your Supabase project URL (from Project Settings > API)
  SUPABASE_URL: 'https://fczfjrgxytiwpokdklxm.supabase.co',

  // Your Supabase anon/public key (from Project Settings > API)
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjemZqcmd4eXRpd3Bva2RrbHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzA3NzcsImV4cCI6MjA4ODY0Njc3N30.Ag65xJZKYqC8FCG160f--Yx02BSl51sOPF-o6l0kAUo',

  // Your web app URL (after deploying to Vercel/Netlify)
  WEB_APP_URL: 'https://stash-ten-iota.vercel.app',

  // Your user ID from Supabase (Authentication > Users)
  // For multi-user mode, this can be removed and auth will be required
  USER_ID: '7dfa5d6e-040d-4494-89dc-d4a807568cec',
};

// Don't edit below this line
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}
