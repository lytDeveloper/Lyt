import { supabase} from '../lib/supabase';
import type {
  CancelPaymentInput,
  CancelPaymentResponse,
  ConfirmPaymentInput,
  ConfirmPaymentResponse,
  CreateOrderInput,
  Order,
  OrderRow,
} from '../types/payment.types';

const mapOrderRow = (row: OrderRow): Order => ({
  id: row.id,
  userId: row.user_id ?? null,
  orderName: row.order_name,
  orderType: row.order_type,
  amount: row.amount,
  currency: row.currency ?? 'KRW',
  status: row.status,
  tossOrderId: row.toss_order_id,
  paymentKey: row.payment_key ?? null,
  paymentMethod: row.payment_method ?? null,
  relatedId: row.related_id ?? null,
  relatedType: row.related_type ?? null,
  metadata: row.metadata ?? {},
  guestName: row.guest_name ?? null,
  guestEmail: row.guest_email ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  paymentRequestedAt: row.payment_requested_at ?? null,
  confirmedAt: row.confirmed_at ?? null,
  failedAt: row.failed_at ?? null,
  failureCode: row.failure_code ?? null,
  failureMessage: row.failure_message ?? null,
});

const generateTossOrderId = () =>
  `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const paymentService = {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // 게스트 검증: userId 또는 (guestName + guestEmail) 중 하나 필요
    if (!input.userId && (!input.guestName || !input.guestEmail)) {
      throw new Error('Either userId or guest info (name + email) is required');
    }

    const tossOrderId = generateTossOrderId();
    const now = new Date().toISOString();

    // Validate related_id is a valid UUID or null
    const isValidUUID = (str: string | null | undefined): boolean => {
      if (!str) return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    const relatedId = isValidUUID(input.relatedId) ? input.relatedId : null;

    console.log('[paymentService] Creating order:', {
      userId: input.userId ?? 'guest',
      guestEmail: input.guestEmail,
      orderName: input.orderName,
      orderType: input.orderType,
      amount: input.amount,
      tossOrderId,
      relatedId,
    });

    const insertQuery = supabase.from('orders').insert({
      user_id: input.userId ?? null,
      order_name: input.orderName,
      order_type: input.orderType,
      amount: input.amount,
      status: 'payment_requested',
      toss_order_id: tossOrderId,
      related_id: relatedId,
      related_type: input.relatedType ?? null,
      metadata: input.metadata ?? {},
      guest_name: input.guestName ?? null,
      guest_email: input.guestEmail ?? null,
      payment_requested_at: now,
    });

    const { data, error } = await (input.userId
      ? insertQuery.select('*').single()
      : // 게스트: REST API 직접 호출로 우회
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/orders?select=*`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            user_id: null,
            order_name: input.orderName,
            order_type: input.orderType,
            amount: input.amount,
            status: 'payment_requested',
            toss_order_id: tossOrderId,
            related_id: relatedId,
            related_type: input.relatedType ?? null,
            metadata: input.metadata ?? {},
            guest_name: input.guestName,
            guest_email: input.guestEmail,
            payment_requested_at: now,
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            return { data: null, error: errorData };
          }
          const jsonData = await res.json();
          return { data: Array.isArray(jsonData) ? jsonData[0] : jsonData, error: null };
        })
    );

    if (error) {
      console.error('[paymentService] Failed to create order:', error);
      throw error;
    }

    if (!data) {
      console.error('[paymentService] Order creation returned no data - possible RLS issue');
      throw new Error('Failed to create order: No data returned. Check RLS policies.');
    }

    console.log('[paymentService] Order created successfully:', data.id);
    return mapOrderRow(data as OrderRow);
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      console.error('[paymentService] Failed to fetch order:', error);
      throw error;
    }

    return data ? mapOrderRow(data as OrderRow) : null;
  },

  async getOrderByTossOrderId(tossOrderId: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('toss_order_id', tossOrderId)
      .maybeSingle();

    if (error) {
      console.error('[paymentService] Failed to fetch order by toss id:', error);
      throw error;
    }

    return data ? mapOrderRow(data as OrderRow) : null;
  },

  async getPendingOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'payment_requested')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[paymentService] Failed to fetch pending orders:', error);
      throw error;
    }

    return (data || []).map((row) => mapOrderRow(row as OrderRow));
  },

  async confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResponse> {
    const { data, error } = await supabase.functions.invoke('confirm-payment', {
      body: input,
    });

    if (error) {
      console.error('[paymentService] Failed to confirm payment:', error);
      throw error;
    }

    return data as ConfirmPaymentResponse;
  },

  async cancelOrder(orderId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'payment_requested'); // Only cancel if still pending

    if (error) {
      console.error('[paymentService] Failed to cancel order:', error);
      // Don't throw - cancellation failure shouldn't block user flow
    }
  },

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentResponse> {
    const { data, error } = await supabase.functions.invoke('cancel-payment', {
      body: input,
    });

    if (error) {
      console.error('[paymentService] Failed to cancel payment:', error);
      throw error;
    }

    return data as CancelPaymentResponse;
  },
};
