export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  price: number;
  initialStock: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customerEmail: string;
  status: 1 | 2;
  createdAtUtc: string;
}

export interface CreateOrderPayload {
  productId: string;
  quantity: number;
  customerEmail: string;
}

export type StockMovementType = 1 | 2 | 3 | 4;

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantityDelta: number;
  type: StockMovementType;
  referenceOrderId: string | null;
  createdAtUtc: string;
}

export interface ProblemDetailsError {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}
