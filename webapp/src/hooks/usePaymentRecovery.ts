import { useCallback, useEffect, useState } from 'react';
import { paymentService } from '../services/paymentService';
import { usePaymentStore } from '../stores/paymentStore';
import type { Order } from '../types/payment.types';

export function usePaymentRecovery() {
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const { setCurrentOrder } = usePaymentStore();

  const refreshPendingOrders = useCallback(async () => {
    setIsChecking(true);
    try {
      const pendingOrders = await paymentService.getPendingOrders();
      const latest = pendingOrders[0] ?? null;
      setPendingOrder(latest);
      if (latest) {
        setCurrentOrder(latest);
      }
    } catch (error) {
      console.error('[usePaymentRecovery] Failed to fetch pending orders:', error);
    } finally {
      setIsChecking(false);
    }
  }, [setCurrentOrder]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPendingOrders();
      }
    };

    refreshPendingOrders();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshPendingOrders]);

  return {
    pendingOrder,
    isChecking,
    refreshPendingOrders,
  };
}
