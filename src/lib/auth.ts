// src/lib/auth.ts
import { supabase } from "@/integrations/supabase/client";

// Re-exportar o cliente centralizado
export { supabase };

export async function signOut() {
  try {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  } catch {
    // fallback: caso o projeto trate logout por rota
    window.location.href = "/auth";
  }
}
