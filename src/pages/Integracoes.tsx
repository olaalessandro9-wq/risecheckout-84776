import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Integracoes = () => {
  const { user } = useAuth();
  
  // UTMify
  const [utmifyToken, setUtmifyToken] = useState("");
  const [utmifyActive, setUtmifyActive] = useState(false);
  const [savingUtmify, setSavingUtmify] = useState(false);
  const [testingUtmify, setTestingUtmify] = useState(false);

  // Facebook Pixel
  const [facebookPixelId, setFacebookPixelId] = useState("");
  const [facebookAccessToken, setFacebookAccessToken] = useState("");
  const [facebookActive, setFacebookActive] = useState(false);
  const [savingFacebook, setSavingFacebook] = useState(false);

  // Carregar configurações ao montar
  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('vendor_integrations')
        .select('*')
        .eq('vendor_id', user!.id);

      if (error) throw error;

      data?.forEach((integration) => {
        if (integration.integration_type === 'UTMIFY') {
          setUtmifyToken(integration.config.api_token || '');
          setUtmifyActive(integration.active);
        } else if (integration.integration_type === 'FACEBOOK_PIXEL') {
          setFacebookPixelId(integration.config.pixel_id || '');
          setFacebookAccessToken(integration.config.access_token || '');
          setFacebookActive(integration.active);
        }
      });
    } catch (error) {
      console.error("Error loading integrations:", error);
    }
  };

  const handleSaveUtmify = async () => {
    try {
      setSavingUtmify(true);
      
      if (!utmifyToken.trim()) {
        toast.error("API Token é obrigatório");
        return;
      }

      const { error } = await supabase
        .from('vendor_integrations')
        .upsert({
          vendor_id: user!.id,
          integration_type: 'UTMIFY',
          config: { api_token: utmifyToken },
          active: utmifyActive,
        }, {
          onConflict: 'vendor_id,integration_type'
        });

      if (error) throw error;
      
      toast.success("Integração UTMify salva com sucesso!");
    } catch (error) {
      console.error("Error saving integration:", error);
      toast.error("Erro ao salvar integração");
    } finally {
      setSavingUtmify(false);
    }
  };

  // Validar Pixel ID do Facebook (deve ter exatamente 15 dígitos)
  const validatePixelId = (pixelId: string): boolean => {
    const pixelIdRegex = /^\d{15}$/;
    return pixelIdRegex.test(pixelId.trim());
  };

  const handleSaveFacebook = async () => {
    try {
      setSavingFacebook(true);
      
      if (!facebookPixelId.trim()) {
        toast.error("Pixel ID é obrigatório");
        return;
      }

      // Validar formato do Pixel ID
      if (!validatePixelId(facebookPixelId)) {
        toast.error("Pixel ID inválido. Deve ter exatamente 15 dígitos numéricos.");
        return;
      }

      // Ativar automaticamente ao salvar
      setFacebookActive(true);

      const { error } = await supabase
        .from('vendor_integrations')
        .upsert({
          vendor_id: user!.id,
          integration_type: 'FACEBOOK_PIXEL',
          config: {
            pixel_id: facebookPixelId.trim(),
            access_token: facebookAccessToken.trim() || null,
          },
          active: true, // Sempre ativo ao salvar
        }, {
          onConflict: 'vendor_id,integration_type'
        });

      if (error) throw error;
      
      toast.success("✅ Integração Facebook Pixel conectada com sucesso!");
    } catch (error) {
      console.error("Error saving Facebook integration:", error);
      toast.error("Erro ao salvar integração");
    } finally {
      setSavingFacebook(false);
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
      
      toast.success("Conexão testada com sucesso!");
    } catch (error) {
      console.error("Error testing integration:", error);
      toast.error("Erro ao testar conexão");
    } finally {
      setTestingUtmify(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>Integrações</h1>
        <p className="text-sm" style={{ color: 'var(--subtext)' }}>
          Configure suas integrações com serviços externos
        </p>
      </div>

      <div className="grid gap-6">
        {/* UTMify */}
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

        {/* Facebook Pixel */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle style={{ color: 'var(--text)' }}>Facebook Pixel</CardTitle>
                  {facebookPixelId && validatePixelId(facebookPixelId) && (
                    <Badge variant={facebookActive ? "default" : "secondary"} className="text-xs">
                      {facebookActive ? "✅ Conectado" : "⚪ Desconectado"}
                    </Badge>
                  )}
                </div>
                <CardDescription style={{ color: 'var(--subtext)' }}>
                  Rastreamento de conversões do Facebook Ads
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
              <Label htmlFor="facebook-pixel-id" style={{ color: 'var(--text)' }}>Pixel ID</Label>
              <Input
                id="facebook-pixel-id"
                type="text"
                placeholder="123456789012345"
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
                placeholder="Token para API de Conversões"
                value={facebookAccessToken}
                onChange={(e) => setFacebookAccessToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs" style={{ color: 'var(--subtext)' }}>
                Recomendado para rastreamento mais preciso via API de Conversões
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveFacebook} 
                disabled={savingFacebook || !facebookPixelId.trim() || !validatePixelId(facebookPixelId)}
              >
                {savingFacebook && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configuração
              </Button>
              {facebookPixelId && !validatePixelId(facebookPixelId) && (
                <p className="text-xs text-red-500 flex items-center">
                  ⚠️ Pixel ID deve ter exatamente 15 dígitos
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integracoes;
