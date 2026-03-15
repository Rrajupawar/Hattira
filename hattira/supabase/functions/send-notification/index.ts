// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { targetUserId, title, body, data } = await req.json();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_token, notifications_enabled")
    .eq("id", targetUserId)
    .single();

  if (!profile?.push_token || !profile?.notifications_enabled) {
    return new Response(JSON.stringify({ sent: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const message = {
    to: profile.push_token,
    sound: "default",
    title,
    body,
    data: data ?? {},
  };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  const result = await response.json();

  return new Response(JSON.stringify({ sent: true, result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});