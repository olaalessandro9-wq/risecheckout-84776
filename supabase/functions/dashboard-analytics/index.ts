import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req.headers.get('origin')) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { startDate, endDate } = await req.json();
    const vendorId = user.id;

    // Buscar taxa de plataforma
    const { data: settings } = await supabase
      .from('payment_gateway_settings')
      .select('platform_fee_percent')
      .eq('user_id', vendorId)
      .single();
    
    const platformFeePercent = settings?.platform_fee_percent || 0;

    // Métricas principais
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('vendor_id', vendorId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data: sessions } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('vendor_id', vendorId)
      .gte('started_at', startDate)
      .lte('started_at', endDate);

    const totalOrders = orders?.length || 0;
    const paidOrders = orders?.filter(o => o.status === 'PAID') || [];
    const pendingOrders = orders?.filter(o => o.status === 'PENDING') || [];
    
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.amount_cents / 100), 0);
    const paidRevenue = totalRevenue;
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (o.amount_cents / 100), 0);
    
    const totalFees = paidOrders.reduce((sum, o) => {
      return sum + ((o.amount_cents / 100) * (platformFeePercent / 100));
    }, 0);

    const checkoutsStarted = sessions?.length || 0;
    const conversionRate = checkoutsStarted > 0 
      ? ((paidOrders.length / checkoutsStarted) * 100).toFixed(2)
      : '0.00';

    // Dados para gráficos (últimos 8 pontos)
    const chartData = [];
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const interval = Math.max(1, Math.floor(days / 8));
    
    for (let i = 0; i < 8; i++) {
      const pointDate = new Date(startDate);
      pointDate.setDate(pointDate.getDate() + (i * interval));
      const nextDate = new Date(pointDate);
      nextDate.setDate(nextDate.getDate() + interval);

      const periodOrders = paidOrders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= pointDate && orderDate < nextDate;
      });

      const revenue = periodOrders.reduce((sum, o) => sum + (o.amount_cents / 100), 0);
      const fees = periodOrders.reduce((sum, o) => {
        return sum + ((o.amount_cents / 100) * (platformFeePercent / 100));
      }, 0);

      chartData.push({
        date: `${pointDate.getDate().toString().padStart(2, '0')}/${(pointDate.getMonth() + 1).toString().padStart(2, '0')}`,
        revenue,
        fees,
        emails: periodOrders.length
      });
    }

    // Últimos clientes
    const recentCustomers = orders?.slice(0, 10).map(order => ({
      id: order.id.substring(0, 8),
      offer: order.product_id.substring(0, 8),
      client: order.customer_name || 'N/A',
      phone: 'N/A',
      createdAt: new Date(order.created_at).toLocaleDateString('pt-BR'),
      value: `R$ ${(order.amount_cents / 100).toFixed(2).replace('.', ',')}`,
      status: order.status === 'PAID' ? 'Pago' : 'Pendente'
    })) || [];

    return new Response(
      JSON.stringify({
        metrics: {
          totalRevenue: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`,
          paidRevenue: `R$ ${paidRevenue.toFixed(2).replace('.', ',')}`,
          pendingRevenue: `R$ ${pendingRevenue.toFixed(2).replace('.', ',')}`,
          totalFees: `R$ ${totalFees.toFixed(2).replace('.', ',')}`,
          checkoutsStarted,
          totalPaidOrders: paidOrders.length,
          totalPendingOrders: pendingOrders.length,
          conversionRate: `${conversionRate}%`
        },
        chartData,
        recentCustomers
      }),
      { headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' } }
    );
  }
});
