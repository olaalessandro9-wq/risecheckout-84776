import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function translateStatus(status: string): "Pago" | "Pendente" | "Reembolso" | "Chargeback" {
  const statusMap: Record<string, "Pago" | "Pendente" | "Reembolso" | "Chargeback"> = {
    'paid': 'Pago',
    'pending': 'Pendente',
    'refunded': 'Reembolso',
    'chargeback': 'Chargeback'
  };
  return statusMap[status?.toLowerCase()] || 'Pendente';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startDate, endDate } = await req.json();

    console.log("[dashboard-analytics] Buscando dados:", { startDate, endDate });

    // Criar cliente Supabase com service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obter usuário do header de autorização
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extrair token e validar usuário
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[dashboard-analytics] Erro ao obter usuário:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado", details: userError?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const vendorId = user.id;
    console.log("[dashboard-analytics] Vendor ID:", vendorId);

    // Buscar pedidos do período
    const { data: orders, error: ordersError } = await supabaseClient
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_email,
        customer_phone,
        amount_cents,
        status,
        created_at,
        paid_at,
        product:product_id (
          id,
          name,
          image_url
        )
      `)
      .eq("vendor_id", vendorId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("[dashboard-analytics] Erro ao buscar pedidos:", ordersError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar pedidos", details: ordersError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("[dashboard-analytics] Pedidos encontrados:", orders?.length || 0);

    // Calcular métricas
    const paidOrders = orders?.filter(o => o.status === "paid") || [];
    const pendingOrders = orders?.filter(o => o.status === "pending") || [];

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.amount_cents || 0), 0);
    
    // Calcular taxas (assumindo 3.99% + R$ 0,39 por transação)
    const totalFees = paidOrders.reduce((sum, o) => {
      const amount = o.amount_cents || 0;
      const fee = Math.round(amount * 0.0399) + 39;
      return sum + fee;
    }, 0);

    const metrics = {
      totalRevenue: formatCurrency(totalRevenue),
      paidRevenue: formatCurrency(totalRevenue),
      pendingRevenue: formatCurrency(pendingRevenue),
      totalFees: formatCurrency(totalFees),
      checkoutsStarted: orders?.length || 0,
      totalPaidOrders: paidOrders.length,
      totalPendingOrders: pendingOrders.length,
      conversionRate: orders?.length > 0 
        ? `${((paidOrders.length / orders.length) * 100).toFixed(2)}%`
        : "0%"
    };

    // Agrupar dados por dia para o gráfico
    const chartDataMap = new Map();
    
    orders?.forEach(order => {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      
      if (!chartDataMap.has(date)) {
        chartDataMap.set(date, {
          date,
          revenue: 0,
          fees: 0,
          emails: 0
        });
      }

      const dataPoint = chartDataMap.get(date);
      
      if (order.status === "paid") {
        dataPoint.revenue += (order.amount_cents || 0) / 100;
        const fee = Math.round((order.amount_cents || 0) * 0.0399) + 39;
        dataPoint.fees += fee / 100;
      }
      
      if (order.customer_email) {
        dataPoint.emails += 1;
      }
    });

    const chartData = Array.from(chartDataMap.values());

    // Formatar clientes recentes
    const recentCustomers = (orders || []).slice(0, 50).map(order => {
      const product = Array.isArray(order.product) ? order.product[0] : order.product;
      
      return {
        id: order.id.substring(0, 8),
        orderId: order.id,
        offer: product?.name || "Produto não encontrado",
        client: order.customer_name || "N/A",
        phone: order.customer_phone || "N/A",
        email: order.customer_email || "N/A",
        createdAt: formatDate(order.created_at),
        value: formatCurrency(order.amount_cents || 0),
        status: translateStatus(order.status),
        productName: product?.name || "Produto não encontrado",
        productImageUrl: product?.image_url || "",
        customerName: order.customer_name || "N/A",
        customerEmail: order.customer_email || "N/A",
        customerPhone: order.customer_phone || "N/A",
        fullCreatedAt: order.created_at
      };
    });

    const response = {
      metrics,
      chartData,
      recentCustomers
    };

    console.log("[dashboard-analytics] Resposta preparada:", {
      metricsCount: Object.keys(metrics).length,
      chartDataPoints: chartData.length,
      customersCount: recentCustomers.length
    });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[dashboard-analytics] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", message: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
