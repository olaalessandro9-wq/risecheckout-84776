import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function FacebookPixelConfig() {
  const { user } = useAuth();
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadConfig();
    }
  }, [user]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vendor_integrations")
        .select("*")
        .eq("vendor_id", user?.id)
        .eq("integration_type", "FACEBOOK_PIXEL")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const config = data.config as { pixel_id?: string; access_token?: string } | null;
        setPixelId(config?.pixel_id || "");
        setAccessToken(config?.access_token || "");
        setActive(data.active || false);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Erro ao carregar configuração");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!pixelId.trim()) {
        toast.error("Pixel ID é obrigatório");
        return;
      }

      const { data: existingData, error: checkError } = await supabase
        .from("vendor_integrations")
        .select("id")
        .eq("vendor_id", user?.id)
        .eq("integration_type", "FACEBOOK_PIXEL")
        .maybeSingle();

      if (checkError) throw checkError;

      const config = {
        pixel_id: pixelId.trim(),
        ...(accessToken.trim() && { access_token: accessToken.trim() }),
      };

      if (existingData) {
        const { error } = await supabase
          .from("vendor_integrations")
          .update({
            config,
            active,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendor_integrations")
          .insert({
            vendor_id: user?.id,
            integration_type: "FACEBOOK_PIXEL",
            config,
            active,
          });

        if (error) throw error;
      }

      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Facebook Pixel
          </h3>
          <p className="text-sm" style={{ color: "var(--subtext)" }}>
            Rastreamento de eventos e conversões
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="fb-active" style={{ color: "var(--text)" }}>
            Ativo
          </Label>
          <Switch id="fb-active" checked={active} onCheckedChange={setActive} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pixel-id" style={{ color: "var(--text)" }}>
            Pixel ID <span className="text-red-500">*</span>
          </Label>
          <Input
            id="pixel-id"
            type="text"
            placeholder="Ex: 1234567890123456"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs" style={{ color: "var(--subtext)" }}>
            Encontre seu Pixel ID no{" "}
            <a
              href="https://business.facebook.com/events_manager2"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary"
            >
              Gerenciador de Eventos
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="access-token" style={{ color: "var(--text)" }}>
            Access Token (Opcional)
          </Label>
          <Input
            id="access-token"
            type="password"
            placeholder="Para Conversions API"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs" style={{ color: "var(--subtext)" }}>
            Necessário apenas para rastreamento server-side
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
}
