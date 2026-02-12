import { useCallback, useRef, useState } from 'react';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { paymentService } from '../services/paymentService';
import { usePaymentStore } from '../stores/paymentStore';
import type { Order, OrderType } from '../types/payment.types';

type PaymentWidgetInstance = Awaited<ReturnType<typeof loadPaymentWidget>>;

interface UseTossPaymentOptions {
  userId?: string; // 게스트 모드에서는 선택적
  customerKey: string;
  orderName: string;
  orderType: OrderType;
  amount: number;
  relatedId?: string | null;
  relatedType?: string | null;
  metadata?: Record<string, unknown>;
  guestName?: string; // 게스트 이름
  guestEmail?: string; // 게스트 이메일
  successUrl?: string;
  failUrl?: string;
}

interface RequestPaymentOptions {
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
}

export function useTossPayment(options: UseTossPaymentOptions) {
  const {
    userId,
    customerKey,
    orderName,
    orderType,
    amount,
    relatedId,
    relatedType,
    metadata,
    guestName,
    guestEmail,
    successUrl,
    failUrl,
  } = options;

  const paymentWidgetRef = useRef<PaymentWidgetInstance | null>(null);
  const initializedRef = useRef(false);
  const { setCurrentOrder, setLastError } = usePaymentStore();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeWidget = useCallback(
    async (methodsContainerId: string, agreementContainerId?: string) => {
      if (initializedRef.current) {
        return;
      }

      const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;
      if (!clientKey) {
        const message = 'Missing VITE_TOSS_CLIENT_KEY';
        setError(message);
        setLastError(message);
        return;
      }

      setIsLoading(true);
      setError(null);
      setLastError(null);

      try {
        const widget = await loadPaymentWidget(clientKey, customerKey);
        widget.renderPaymentMethods(methodsContainerId, { value: amount });
        if (agreementContainerId) {
          widget.renderAgreement(agreementContainerId);
        }
        paymentWidgetRef.current = widget;
        initializedRef.current = true;
        setIsReady(true);
      } catch (initError) {
        console.error('[useTossPayment] Failed to initialize widget:', initError);
        const message = initError instanceof Error ? initError.message : 'Failed to initialize payment widget';
        setError(message);
        setLastError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [amount, customerKey, setLastError]
  );

  const requestPayment = useCallback(
    async (requestOptions?: RequestPaymentOptions): Promise<Order> => {
      console.log('[useTossPayment] ===== requestPayment START =====');
      console.log('[useTossPayment] Widget ready:', !!paymentWidgetRef.current);
      console.log('[useTossPayment] userId:', userId);
      console.log('[useTossPayment] amount:', amount);

      if (!paymentWidgetRef.current) {
        const message = 'Payment widget is not ready';
        setError(message);
        setLastError(message);
        throw new Error(message);
      }

      setIsLoading(true);
      setError(null);
      setLastError(null);

      let createdOrderId: string | null = null;

      try {
        console.log('[useTossPayment] Calling createOrder...');
        const order = await paymentService.createOrder({
          userId,
          orderName,
          orderType,
          amount,
          relatedId,
          relatedType,
          metadata,
          guestName,
          guestEmail,
        });

        createdOrderId = order.id;
        console.log('[useTossPayment] Order created:', order.id, order.tossOrderId);
        setCurrentOrder(order);

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const resolvedSuccessUrl = successUrl ?? `${origin}/payment/callback?status=success`;
        const resolvedFailUrl = failUrl ?? `${origin}/payment/callback?status=fail`;

        console.log('[useTossPayment] Calling widget.requestPayment...');
        console.log('[useTossPayment] successUrl:', resolvedSuccessUrl);
        console.log('[useTossPayment] failUrl:', resolvedFailUrl);

        await paymentWidgetRef.current.requestPayment({
          orderId: order.tossOrderId,
          orderName,
          successUrl: resolvedSuccessUrl,
          failUrl: resolvedFailUrl,
          customerName: requestOptions?.customerName,
          customerEmail: requestOptions?.customerEmail,
          customerMobilePhone: requestOptions?.customerMobilePhone,
        });

        return order;
      } catch (requestError) {
        console.error('[useTossPayment] Failed to request payment:', requestError);

        // 주문이 생성된 후 취소/실패된 경우, 주문 상태를 cancelled로 업데이트
        if (createdOrderId) {
          console.log('[useTossPayment] Cancelling order:', createdOrderId);
          await paymentService.cancelOrder(createdOrderId);
        }

        const message = requestError instanceof Error ? requestError.message : 'Failed to request payment';
        setError(message);
        setLastError(message);
        throw requestError;
      } finally {
        setIsLoading(false);
      }
    },
    [
      amount,
      failUrl,
      metadata,
      orderName,
      orderType,
      relatedId,
      relatedType,
      guestName,
      guestEmail,
      setCurrentOrder,
      setLastError,
      successUrl,
      userId,
    ]
  );

  return {
    isReady,
    isLoading,
    error,
    initializeWidget,
    requestPayment,
  };
}
