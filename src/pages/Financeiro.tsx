import { useEffect, useState } from "react";
import { Loader2, Check, AlertCircle, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  savePushinPaySettings,
  getPushinPaySettings,
  type PushinPayEnvironment,
} from "@/services/pushinpay";

export default function Financeiro() {
  const [apiToken, setApiToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [environment, setEnvironment] = useState<PushinPayEnvironment>("sandbox");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUpdateSectionOpen, setIsUpdateSectionOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const settings = await getPushinPaySettings();
        if (settings) {
          if (settings.pushinpay_token === "••••••••") {
            setHasExistingToken(true);
            setApiToken("");
          } else {
            setApiToken(settings.pushinpay_token ?? "");
          }
          setEnvironment(settings.environment ?? "sandbox");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);


  async function onSave() {
    // Se já existe token e o campo está vazio, não exigir novo token
    if (!hasExistingToken && !apiToken.trim()) {
      setMessage({ type: "error", text: "Por favor, informe o API Token" });
      return;
    }

    // Se tem token existente e campo vazio, mantém o token existente
    if (hasExistingToken && !apiToken.trim()) {
      setMessage({ type: "error", text: "Para atualizar, informe um novo token ou mantenha o atual" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await savePushinPaySettings({
        pushinpay_token: apiToken,
        environment,
      });

      if (result.ok) {
        setMessage({ type: "success", text: "Integração PushinPay salva com sucesso!" });
        setHasExistingToken(true);
        setApiToken("");
      } else {
        setMessage({ type: "error", text: `Erro ao salvar: ${result.error}` });
      }
    } catch (error: any) {
      setMessage({ type: "error", text: `Erro: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure suas integrações de pagamento e split de receita
        </p>
      </div>

      {/* Integração PushinPay */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">Integração PIX - PushinPay</h2>
          {hasExistingToken && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <Check className="h-3 w-3" />
              CONECTADO
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Conecte sua conta PushinPay informando o <strong>API Token</strong>.
          Você pode solicitar acesso ao <em>Sandbox</em> direto no suporte deles.
        </p>

        {hasExistingToken && (
          <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  ✅ Integração PushinPay Ativa
                </h4>
                <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                  Seu checkout está conectado e processando pagamentos PIX via PushinPay.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="text-green-700 dark:text-green-300">
                    <strong>Ambiente:</strong> {environment === 'sandbox' ? 'Sandbox (Testes)' : 'Produção'}
                  </span>
                  <span className="text-green-700 dark:text-green-300">
                    <strong>Token:</strong> Configurado
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {hasExistingToken ? (
          <Collapsible open={isUpdateSectionOpen} onOpenChange={setIsUpdateSectionOpen} className="space-y-2">
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
              <ChevronDown className={`h-4 w-4 transition-transform ${isUpdateSectionOpen ? 'rotate-180' : ''}`} />
              <span>🔧 Atualizar token ou ambiente</span>
              <span className="text-xs opacity-60">(clique para expandir)</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4 pl-6 border-l-2 border-muted">
              <div>
                <label className="block text-sm font-medium mb-2">API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="••••••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-900/20">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Token já está configurado e funcionando. Deixe em branco para manter o atual ou informe um novo para atualizar.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ambiente</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as PushinPayEnvironment)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="sandbox">Sandbox (testes)</option>
                  <option value="production">Produção</option>
                </select>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">API Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Bearer token da PushinPay"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ambiente</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as PushinPayEnvironment)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="sandbox">Sandbox (testes)</option>
                <option value="production">Produção</option>
              </select>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            disabled={loading || !apiToken}
            onClick={onSave}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Salvando..." : "Salvar integração"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-medium mb-2">Informações importantes</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>O token é armazenado de forma segura no banco de dados</li>
            <li>Use o ambiente Sandbox para testes antes de ir para produção</li>
            <li>Certifique-se de configurar o webhook no painel da PushinPay</li>
            <li>A taxa da plataforma é aplicada automaticamente em cada transação PIX</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
