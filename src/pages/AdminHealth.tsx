import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminHealth() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [webhookStats, setWebhookStats] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  async function loadData() {
    try {
      const { data: metricsData } = await (supabase as any)
        .from("v_system_health_summary")
        .select("*")
        .order("hour", { ascending: false })
        .limit(24);

      const { data: errorsData } = await (supabase as any)
        .from("v_unresolved_errors")
        .select("*")
        .limit(50);

      const { data: webhookData } = await supabase
        .from("webhook_deliveries")
        .select("status, attempts")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      setMetrics(metricsData || []);
      setErrors(errorsData || []);
      
      if (webhookData) {
        const stats = {
          total: webhookData.length,
          delivered: webhookData.filter(w => w.status === 'delivered').length,
          failed: webhookData.filter(w => w.status === 'failed').length,
          pending: webhookData.filter(w => w.status === 'pending_retry').length,
          avgAttempts: webhookData.reduce((sum, w) => sum + w.attempts, 0) / (webhookData.length || 1)
        };
        setWebhookStats(stats);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markErrorResolved(errorId: string) {
    await supabase
      .from("edge_function_errors")
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString() 
      })
      .eq("id", errorId);
    
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pixCreatedData = metrics
    .filter(m => m.metric_type === 'pix_created')
    .map(m => ({
      hour: new Date(m.hour).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      count: m.event_count,
      errors: m.error_count
    }))
    .reverse();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Health Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoramento em tempo real do sistema
          </p>
        </div>
        
        <select
          value={refreshInterval}
          onChange={(e) => setRefreshInterval(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={10000}>Atualizar a cada 10s</option>
          <option value={30000}>Atualizar a cada 30s</option>
          <option value={60000}>Atualizar a cada 1min</option>
          <option value={300000}>Atualizar a cada 5min</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PIX Criados (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.filter(m => m.metric_type === 'pix_created')
                .reduce((sum, m) => sum + m.event_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks Entregues</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookStats?.delivered || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa: {webhookStats ? ((webhookStats.delivered / webhookStats.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Webhooks Falhos</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webhookStats?.failed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Média tentativas: {webhookStats?.avgAttempts.toFixed(1) || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros Ativos</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errors.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Não resolvidos
            </p>
          </CardContent>
        </Card>
      </div>

      {pixCreatedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Criação de PIX - Últimas 24h</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pixCreatedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="PIX criados" />
                <Bar dataKey="errors" fill="hsl(var(--destructive))" name="Erros" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Erros Não Resolvidos ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errors.map((error) => (
                <Alert key={error.id} variant="destructive">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {error.function_name}
                      </div>
                      <AlertDescription className="mt-1 text-xs">
                        {error.error_message}
                      </AlertDescription>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {new Date(error.timestamp).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <button
                      onClick={() => markErrorResolved(error.id)}
                      className="ml-4 text-xs px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Resolver
                    </button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informações do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Última atualização:</span>
            <span className="font-medium">{new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intervalo de refresh:</span>
            <span className="font-medium">{refreshInterval / 1000}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total webhooks pendentes:</span>
            <span className="font-medium">{webhookStats?.pending || 0}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
