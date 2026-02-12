export type OrderType = 'one_time' | 'project_fee' | 'digital_product';

export type OrderStatus =
  | 'pending'
  | 'payment_requested'
  | 'confirmed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface OrderRow {
  id: string;
  user_id: string | null; // 게스트 모드 지원
  order_name: string;
  order_type: OrderType;
  amount: number;
  currency?: string;
  status: OrderStatus;
  toss_order_id: string;
  payment_key?: string | null;
  payment_method?: string | null;
  related_id?: string | null;
  related_type?: string | null;
  metadata?: Record<string, unknown> | null;
  guest_name?: string | null; // 게스트 이름
  guest_email?: string | null; // 게스트 이메일
  created_at: string;
  updated_at: string;
  payment_requested_at?: string | null;
  confirmed_at?: string | null;
  failed_at?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
}

export interface Order {
  id: string;
  userId: string | null; // 게스트 모드 지원
  orderName: string;
  orderType: OrderType;
  amount: number;
  currency: string;
  status: OrderStatus;
  tossOrderId: string;
  paymentKey: string | null;
  paymentMethod: string | null;
  relatedId: string | null;
  relatedType: string | null;
  metadata: Record<string, unknown>;
  guestName?: string | null; // 게스트 이름
  guestEmail?: string | null; // 게스트 이메일
  createdAt: string;
  updatedAt: string;
  paymentRequestedAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  failureCode: string | null;
  failureMessage: string | null;
}

export interface CreateOrderInput {
  userId?: string; // 게스트 모드에서는 선택적
  orderName: string;
  orderType: OrderType;
  amount: number;
  currency?: string;
  relatedId?: string | null;
  relatedType?: string | null;
  metadata?: Record<string, unknown>;
  guestName?: string; // 게스트 이름
  guestEmail?: string; // 게스트 이메일
}

export interface CreateOrderResult {
  orderId: string;
  tossOrderId: string;
}

export interface ConfirmPaymentInput {
  orderId: string;
  paymentKey: string;
  amount: number;
  idempotencyKey: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  orderId?: string;
  paymentKey?: string;
  status?: OrderStatus;
  paymentMethod?: string | null;
  approvedAt?: string | null;
  code?: string;
  message?: string;
  raw?: Record<string, unknown>;
}

export interface CancelPaymentInput {
  orderId: string;
  cancelReason: string;
}

export interface CancelPaymentResponse {
  success: boolean;
  message?: string;
  cancelledAt?: string;
  code?: string;
  raw?: Record<string, unknown>;
}
