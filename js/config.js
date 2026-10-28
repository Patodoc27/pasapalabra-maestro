/* Conexión con Supabase — la anon key es pública por diseño:
   la privacidad la garantizan las reglas RLS de la base.
   Mismo proyecto que Activate (sin costo extra). */
window.PP_CONFIG = {
  SUPABASE_URL: "https://apehzspwbyqwsrdeezrn.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_GX9QGXoB3IuHbuLMKsgwgw_IVhGy0KL",
  REALTIME_URL: "wss://apehzspwbyqwsrdeezrn.supabase.co/realtime/v1/websocket",
  APP_NAME: "Pasapalabra maestro"
};
