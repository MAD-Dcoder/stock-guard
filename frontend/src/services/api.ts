import type {
  CreateOrderPayload,
  CreateProductPayload,
  Order,
  ProblemDetailsError,
  Product,
  StockMovement,
} from '../types/stock';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5002';

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const problem = (await response.json()) as ProblemDetailsError;
      message = problem.detail || problem.title || message;
    } catch {
      // mantém mensagem padrão
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return (await response.json()) as T;
}

export const stockApi = {
  baseUrl: API_BASE_URL,

  async checkHealth(): Promise<{ online: boolean; latencyMs: number }> {
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return { online: res.ok, latencyMs: Math.round(performance.now() - start) };
    } catch {
      return { online: false, latencyMs: 0 };
    }
  },

  async getProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE_URL}/api/products`);
    return parseResponse<Product[]>(res);
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return parseResponse<Product>(res);
  },

  async restockProduct(productId: string, quantity: number): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/api/products/${productId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    return parseResponse<Product>(res);
  },

  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE_URL}/api/orders`);
    return parseResponse<Order[]>(res);
  },

  async getMovements(): Promise<StockMovement[]> {
    const res = await fetch(`${API_BASE_URL}/api/movements`);
    return parseResponse<StockMovement[]>(res);
  },

  async placeOrder(payload: CreateOrderPayload, idempotencyKey?: string): Promise<Order> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return parseResponse<Order>(res);
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
      method: 'POST',
    });
    return parseResponse<Order>(res);
  },

  async placeOrderRaw(payload: CreateOrderPayload): Promise<{
    status: number;
    durationMs: number;
    detail: string;
  }> {
    const start = performance.now();
    const res = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const durationMs = Math.round(performance.now() - start);
    if (res.ok) {
      const order = (await res.json()) as Order;
      return {
        status: res.status,
        durationMs,
        detail: `Pedido #${order.id.slice(0, 8)} confirmado`,
      };
    }
    let detail = `Status ${res.status}`;
    try {
      const problem = (await res.json()) as ProblemDetailsError;
      detail = problem.detail || problem.title || detail;
    } catch {
      // ignora
    }
    return { status: res.status, durationMs, detail };
  },
};
