/**
 * Helpers para disparar eventos do Facebook Pixel no momento correto
 */

export function trackViewContent(
  checkout: any,
  viewContentTracked: boolean,
  setViewContentTracked: (value: boolean) => void
) {
  if (!checkout || viewContentTracked) return;

  // Importar dinamicamente para evitar erros de referência
  import("@/components/FacebookPixel").then(({ FacebookPixelEvents }) => {
    FacebookPixelEvents.viewContent({
      content_name: checkout.product?.name || "Produto",
      content_ids: [checkout.product?.id || "unknown"],
      content_type: "product",
      value: (checkout.product?.price || 0) / 100,
      currency: "BRL",
    });
    setViewContentTracked(true);
  });
}

export function trackInitiateCheckout(
  checkout: any,
  selectedBumps: Set<string>,
  orderBumps: any[],
  initiateCheckoutTracked: boolean,
  setInitiateCheckoutTracked: (value: boolean) => void
) {
  if (!checkout || initiateCheckoutTracked) return;

  // Calcular valor total
  const productPrice = checkout.product?.price || 0;
  const bumpsPrice = Array.from(selectedBumps).reduce((total, bumpId) => {
    const bump = orderBumps.find((b) => b.id === bumpId);
    return total + (bump?.price || 0);
  }, 0);
  const totalValue = productPrice + bumpsPrice;

  // Importar dinamicamente para evitar erros de referência
  import("@/components/FacebookPixel").then(({ FacebookPixelEvents }) => {
    FacebookPixelEvents.initiateCheckout({
      content_name: checkout.product?.name || "Produto",
      content_ids: [checkout.product?.id || "unknown"],
      value: totalValue / 100,
      currency: "BRL",
      num_items: 1 + selectedBumps.size,
    });
    setInitiateCheckoutTracked(true);
  });
}

export function trackAddToCart(bump: any) {
  // Importar dinamicamente para evitar erros de referência
  import("@/components/FacebookPixel").then(({ FacebookPixelEvents }) => {
    FacebookPixelEvents.addToCart({
      content_name: bump.name || "Order Bump",
      content_ids: [bump.id || "unknown"],
      value: (bump.price || 0) / 100,
      currency: "BRL",
    });
  });
}

export function trackPurchase(checkout: any, orderId: string, totalValue: number) {
  // Importar dinamicamente para evitar erros de referência
  import("@/components/FacebookPixel").then(({ FacebookPixelEvents }) => {
    FacebookPixelEvents.purchase({
      content_name: checkout.product?.name || "Produto",
      content_ids: [checkout.product?.id || "unknown"],
      value: totalValue / 100,
      currency: "BRL",
      transaction_id: orderId,
    });
  });
}
