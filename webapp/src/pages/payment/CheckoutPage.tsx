import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Container, Divider, Paper, Typography } from '@mui/material';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';
import Header from '../../components/common/Header';
import BottomNavigationBar, { BOTTOM_NAV_HEIGHT } from '../../components/navigation/BottomNavigationBar';
import { useAuth } from '../../providers/AuthContext';
import { usePaymentRecovery } from '../../hooks/usePaymentRecovery';
import { paymentService } from '../../services/paymentService';
import type { OrderType } from '../../types/payment.types';

export default function CheckoutPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isRequesting, setIsRequesting] = useState(false);
  const { pendingOrder, isChecking } = usePaymentRecovery();
  const [error, setError] = useState<string | null>(null);

  const amount = useMemo(() => {
    const raw = searchParams.get('amount');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [searchParams]);

  const orderName = searchParams.get('orderName') ?? 'Bridge Payment';
  const orderTypeParam = searchParams.get('orderType');
  const orderType: OrderType =
    orderTypeParam === 'project_fee' ? 'project_fee' :
    orderTypeParam === 'digital_product' ? 'digital_product' :
    'one_time';
  const relatedId = searchParams.get('relatedId');
  const relatedType = searchParams.get('relatedType');
  const productId = searchParams.get('productId');

  // 게스트 모드 파라미터
  const guestMode = searchParams.get('guestMode') === 'true';
  const guestName = searchParams.get('guestName');
  const guestEmail = searchParams.get('guestEmail');
  const landingOrigin = searchParams.get('landingOrigin');
  const isGuestModeValid = guestMode && guestName && guestEmail;

  const isAmountValid = Number.isFinite(amount) && amount > 0;

  const handleRequestPayment = async () => {
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
    if (!clientKey) {
      setError('결제 설정이 올바르지 않습니다. (VITE_TOSS_CLIENT_KEY)');
      return;
    }

    // 게스트 모드 또는 인증 사용자 확인
    if (!guestMode && !user) return;
    if (guestMode && !isGuestModeValid) return;
    if (!isAmountValid) return;

    setIsRequesting(true);
    setError(null);

    let createdOrderId: string | null = null;

    try {
      // 1. DB에 주문 생성
      console.log('[CheckoutPage] Creating order...');
      const order = await paymentService.createOrder({
        userId: guestMode ? undefined : user!.id,
        orderName,
        orderType,
        amount,
        relatedId,
        relatedType,
        metadata: productId ? { productId } : undefined,
        guestName: guestMode ? (guestName ?? undefined) : undefined,
        guestEmail: guestMode ? (guestEmail ?? undefined) : undefined,
      });
      createdOrderId = order.id;
      console.log('[CheckoutPage] Order created:', order.id, order.tossOrderId);

      // 2. v2 SDK 초기화 (ShopProductModal과 동일한 패턴)
      const tossPayments = await loadTossPayments(clientKey);

      // 3. 결제창 인스턴스 생성 (게스트: ANONYMOUS, 회원: userId)
      const payment = tossPayments.payment({
        customerKey: guestMode ? ANONYMOUS : user!.id,
      });

      const origin = window.location.origin;

      // 4. 콜백 URL 결정 (게스트: 랜딩 페이지, 회원: 웹앱)
      let successUrl: string;
      let failUrl: string;

      if (guestMode && landingOrigin) {
        // 게스트 → 랜딩 페이지의 purchase-complete.html로 리다이렉트
        const guestEmailParam = guestEmail ? `&guestEmail=${encodeURIComponent(guestEmail)}` : '';
        successUrl = `${landingOrigin}/purchase-complete.html?status=success${guestEmailParam}`;
        failUrl = `${landingOrigin}/purchase-complete.html?status=fail`;
      } else {
        successUrl = `${origin}/payment/callback?status=success`;
        failUrl = `${origin}/payment/callback?status=fail`;
      }

      // 5. 결제창 띄우기
      console.log('[CheckoutPage] Launching payment...');
      await payment.requestPayment({
        method: 'CARD',
        amount: {
          currency: 'KRW',
          value: amount,
        },
        orderId: order.tossOrderId,
        orderName,
        successUrl,
        failUrl,
        customerEmail: guestMode ? (guestEmail ?? undefined) : (user?.email ?? undefined),
        customerName: guestMode ? (guestName ?? undefined) : (user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? undefined),
        card: {
          useEscrow: false,
          flowMode: 'DEFAULT',
          useCardPoint: false,
          useAppCardOnly: false,
        },
      });
    } catch (requestError) {
      console.error('[CheckoutPage] Payment error:', requestError);

      // 주문이 생성된 후 취소된 경우
      if (createdOrderId) {
        console.log('[CheckoutPage] Cancelling order:', createdOrderId);
        await paymentService.cancelOrder(createdOrderId);
      }

      // 사용자가 결제창을 닫은 경우는 에러로 처리하지 않음
      if (requestError instanceof Error && !requestError.message.includes('USER_CANCEL')) {
        setError(requestError.message);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Box
      sx={{
        pb: `${BOTTOM_NAV_HEIGHT}px`,
        minHeight: '100vh',
        bgcolor: '#F9FAFB',
        maxWidth: '768px',
        margin: '0 auto',
      }}
    >
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1100, bgcolor: 'white' }}>
        <Header />
      </Box>

      <Container sx={{ py: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
          Checkout
        </Typography>

        {!guestMode && !user && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please sign in to continue payment.
          </Alert>
        )}

        {guestMode && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {guestName} ({guestEmail})
          </Alert>
        )}

        {!isAmountValid && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Invalid amount. Please provide a valid amount.
          </Alert>
        )}

        {pendingOrder && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Pending order detected. Please complete payment or retry from the order screen.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ p: 3, borderRadius: '16px' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Order Summary
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>
            {orderName}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 1 }}>
            {isAmountValid ? `${amount.toLocaleString()} KRW` : '-'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={
              (!guestMode && !user) ||
              (guestMode && !isGuestModeValid) ||
              !isAmountValid ||
              isRequesting
            }
            onClick={handleRequestPayment}
          >
            {isRequesting ? <CircularProgress size={20} color="inherit" /> : `${isAmountValid ? amount.toLocaleString() : 0}원 결제하기`}
          </Button>

          {isChecking && (
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#9CA3AF' }}>
              Checking pending orders...
            </Typography>
          )}
        </Paper>
      </Container>

      <BottomNavigationBar />
    </Box>
  );
}
