import { useEffect } from "react";

interface FacebookPixelProps {
  pixelId: string;
  enabled?: boolean;
}

/**
 * Componente para injetar o Facebook Pixel no documento
 * Este componente deve ser renderizado apenas uma vez por página
 */
export const FacebookPixel = ({ pixelId, enabled = true }: FacebookPixelProps) => {
  useEffect(() => {
    if (!enabled || !pixelId) {
      console.log("[FacebookPixel] Pixel não habilitado ou ID não fornecido");
      return;
    }

    console.log("[FacebookPixel] Inicializando pixel:", pixelId);

    // Verificar se o script já foi carregado
    if (window.fbq) {
      console.log("[FacebookPixel] Pixel já carregado, apenas inicializando");
      window.fbq('init', pixelId);
      return;
    }

    // Criar função fbq se não existir
    const fbq = function() {
      // @ts-ignore
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    
    // @ts-ignore
    if (!window.fbq) window.fbq = fbq;
    // @ts-ignore
    fbq.push = fbq;
    // @ts-ignore
    fbq.loaded = true;
    // @ts-ignore
    fbq.version = '2.0';
    // @ts-ignore
    fbq.queue = [];

    // Criar e injetar o script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    
    script.onload = () => {
      console.log("[FacebookPixel] Script carregado com sucesso");
      window.fbq('init', pixelId);
      console.log("[FacebookPixel] Pixel inicializado:", pixelId);
    };

    script.onerror = () => {
      console.error("[FacebookPixel] Erro ao carregar script do Facebook Pixel");
    };

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    // Cleanup ao desmontar
    return () => {
      console.log("[FacebookPixel] Limpando pixel");
      // Não removemos o script para evitar problemas de recarregamento
    };
  }, [pixelId, enabled]);

  return null; // Este componente não renderiza nada visualmente
};

/**
 * Funções auxiliares para disparar eventos do Facebook Pixel
 */
export const FacebookPixelEvents = {
  /**
   * Dispara evento PageView
   */
  pageView: () => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: PageView");
      window.fbq('track', 'PageView');
    }
  },

  /**
   * Dispara evento ViewContent
   */
  viewContent: (params: {
    content_name: string;
    content_ids: string[];
    content_type?: string;
    value: number;
    currency: string;
  }) => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: ViewContent", params);
      window.fbq('track', 'ViewContent', {
        content_name: params.content_name,
        content_ids: params.content_ids,
        content_type: params.content_type || 'product',
        value: params.value,
        currency: params.currency,
      });
    }
  },

  /**
   * Dispara evento AddToCart
   */
  addToCart: (params: {
    content_name: string;
    content_ids: string[];
    value: number;
    currency: string;
  }) => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: AddToCart", params);
      window.fbq('track', 'AddToCart', {
        content_name: params.content_name,
        content_ids: params.content_ids,
        value: params.value,
        currency: params.currency,
      });
    }
  },

  /**
   * Dispara evento InitiateCheckout
   */
  initiateCheckout: (params: {
    content_name: string;
    content_ids: string[];
    value: number;
    currency: string;
    num_items?: number;
  }) => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: InitiateCheckout", params);
      window.fbq('track', 'InitiateCheckout', {
        content_name: params.content_name,
        content_ids: params.content_ids,
        value: params.value,
        currency: params.currency,
        num_items: params.num_items || 1,
      });
    }
  },

  /**
   * Dispara evento Purchase
   */
  purchase: (params: {
    content_name: string;
    content_ids: string[];
    value: number;
    currency: string;
    transaction_id: string;
  }) => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: Purchase", params);
      window.fbq('track', 'Purchase', {
        content_name: params.content_name,
        content_ids: params.content_ids,
        value: params.value,
        currency: params.currency,
        transaction_id: params.transaction_id,
      });
    }
  },

  /**
   * Dispara evento Lead
   */
  lead: (params: {
    content_name: string;
    value?: number;
    currency?: string;
  }) => {
    if (window.fbq) {
      console.log("[FacebookPixel] Evento: Lead", params);
      window.fbq('track', 'Lead', params);
    }
  },
};

// Declaração de tipos para o window.fbq
declare global {
  interface Window {
    fbq: any;
  }
}
