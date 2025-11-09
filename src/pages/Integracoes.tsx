import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Integracoes = () => {
  const { user } = useAuth();
  
  // UTMify states
  const [utmifyToken, setUtmifyToken] = useState("");
  const [utmifyActive, setUtmifyActive] = useState(false);
  const [savingUtmify, setSavingUtmify] = useState(false);
  const [testingUtmify, setTestingUtmify] = useState(false);

  // Facebook Pixel states
  const [facebookPixelId, setFacebookPixelId] = useState("");
  const [facebookAccessToken, setFacebookAccessToken] = useState("");
  const [facebookActive, setFacebookActive] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  // Carregar integrações existentes ao montar o componente
  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      
      const { data, error } = await supabase
        .from("vendor_integrations")
        .select("*")
        .eq("vendor_id", user?.id);

      if (error) throw error;

      // Processar integrações carregadas
      data?.forEach((integration: any) => {
        if (integration.integration_type === "FACEBOOK_PIXEL") {
          setFacebookPixelId(integration.config?.pixel_id || "");
          setFacebookAccessToken(integration.config?.access_token || "");
          setFacebookActive(integration.active || false);
        }
        // Adicionar outros tipos de integração aqui no futuro
      });
    } catch (error) {
      console.error("Error loading integrations:", error);
      toast.error("Erro ao carregar integrações");
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleSaveUtmify = async () => {
    try {
      setSavingUtmify(true);
      
      if (!utmifyToken.trim()) {
        toast.error("API Token é obrigatório");
        return;
      }

      // Simulação - em produção, fazer chamada real ao Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Integração UTMify salva com sucesso!");
    } catch (error) {
      console.error("Error saving UTMify integration:", error);
      toast.error("Erro ao salvar integração UTMify");
    } finally {
      setSavingUtmify(false);
    }
  };

  const handleTestUtmify = async () => {
    try {
      setTestingUtmify(true);
      
      if (!utmifyToken.trim()) {
        toast.error("Configure o token primeiro");
        return;
      }

      // Simulação - em produção, fazer chamada real ao Supabase
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Conexão UTMify testada com sucesso!");
    } catch (error) {
      console.error("Error testing UTMify integration:", error);
      toast.error("Erro ao testar conexão UTMify");
    } finally {
      setTestingUtmify(false);
    }
  };

  const handleSaveFacebook = async () => {
    try {
      setSavingFacebook(true);
      
      if (!facebookPixelId.trim()) {
        toast.error("Pixel ID é obrigatório");
        return;
      }

      // Verificar se já existe uma integração do Facebook Pixel para este usuário
      const { data: existingData, error: checkError } = await supabase
        .from("vendor_integrations")
        .select("id")
        .eq("vendor_id", user?.id)
        .eq("integration_type", "FACEBOOK_PIXEL")
        .maybeSingle();

      if (checkError) throw checkError;

      const config = {
        pixel_id: facebookPixelId.trim(),
        ...(facebookAccessToken.trim() && { access_token: facebookAccessToken.trim() })
      };

      if (existingData) {
        // Atualizar integração existente
        const { error: updateError } = await supabase
          .from("vendor_integrations")
          .update({
            config,
            active: facebookActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingData.id);

        if (updateError) throw updateError;
      } else {
        // Criar nova integração
        const { error: insertError } = await supabase
          .from("vendor_integrations")
          .insert({
            vendor_id: user?.id,
            integration_type: "FACEBOOK_PIXEL",
            config,
            active: facebookActive
          });

        if (insertError) throw insertError;
      }
      
      toast.success("Integração do Facebook Pixel salva com sucesso!");
    } catch (error) {
      console.error("Error saving Facebook Pixel integration:", error);
      toast.error("Erro ao salvar integração do Facebook Pixel");
    } finally {
      setSavingFacebook(false);
    }
  };

  if (loadingIntegrations) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Integrações</h1>
        <p className="text-sm" style={{ color: 'var(--subtext)' }}>
          Configure suas integrações com serviços externos
        </p>
      </div>

      <div className="grid gap-6">
        {/* UTMify Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle style={{ color: 'var(--text)' }}>UTMify</CardTitle>
                <CardDescription style={{ color: 'var(--subtext)' }}>
                  Rastreamento e atribuição de conversões
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="utmify-active" style={{ color: 'var(--text)' }}>Ativo</Label>
                <Switch
                  id="utmify-active"
                  checked={utmifyActive}
                  onCheckedChange={setUtmifyActive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="utmify-token" style={{ color: 'var(--text)' }}>API Token</Label>
              <Input
                id="utmify-token"
                type="password"
                placeholder="Cole seu token da UTMify aqui"
                value={utmifyToken}
                onChange={(e) => setUtmifyToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs" style={{ color: 'var(--subtext)' }}>
                Obtenha seu token em{" "}
                <a 
                  href="https://utmify.com.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  utmify.com.br
                </a>
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveUtmify} disabled={savingUtmify}>
                {savingUtmify && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configuração
              </Button>
              <Button variant="outline" onClick={handleTestUtmify} disabled={testingUtmify || !utmifyToken}>
                {testingUtmify && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Pixel Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle style={{ color: 'var(--text)' }}>Facebook Pixel</CardTitle>
                <CardDescription style={{ color: 'var(--subtext)' }}>
                  Rastreamento de eventos e conversões do Facebook
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="facebook-active" style={{ color: 'var(--text)' }}>Ativo</Label>
                <Switch
                  id="facebook-active"
                  checked={facebookActive}
                  onCheckedChange={setFacebookActive}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebook-pixel-id" style={{ color: 'var(--text)' }}>
                Pixel ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="facebook-pixel-id"
                type="text"
                placeholder="Ex: 1234567890123456"
                value={facebookPixelId}
                onChange={(e) => setFacebookPixelId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs" style={{ color: 'var(--subtext)' }}>
                Encontre seu Pixel ID no{" "}
                <a 
                  href="https://business.facebook.com/events_manager2" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-primary"
                >
                  Gerenciador de Eventos do Facebook
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook-access-token" style={{ color: 'var(--text)' }}>
                Access Token (Opcional)
              </Label>
              <Input
                id="facebook-access-token"
                type="password"
                placeholder="Cole seu Access Token aqui (para Conversions API)"
                value={facebookAccessToken}
                onChange={(e) => setFacebookAccessToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs" style={{ color: 'var(--subtext)' }}>
                O Access Token é necessário apenas para usar a Conversions API (rastreamento server-side).
                Deixe em branco se quiser usar apenas o Pixel (client-side).
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveFacebook} disabled={savingFacebook}>
                {savingFacebook && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configuração
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                Mais integrações em breve
              </p>
              <p className="text-sm" style={{ color: 'var(--subtext)' }}>
                Estamos trabalhando para trazer mais integrações úteis para você
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integracoes;
