import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import {
    Dialog,
    Box,
    Typography,
    IconButton,
    Button,
    useTheme,
    Paper,
    CircularProgress,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { type ShopProduct } from '../../services/shopService';
import { useAuth } from '../../providers/AuthContext';
import { paymentService } from '../../services/paymentService';

interface ShopProductModalProps {
    open: boolean;
    onClose: () => void;
    product: ShopProduct | null;
}

export default function ShopProductModal({ open, onClose, product }: ShopProductModalProps) {
    const theme = useTheme();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    if (!product) return null;

    const handlePurchase = async () => {
        const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
        if (!clientKey) {
            alert('결제 설정이 올바르지 않습니다.');
            return;
        }

        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        setIsLoading(true);

        let createdOrderId: string | null = null;

        try {
            // 1. 먼저 DB에 주문 생성
            console.log('[ShopProductModal] Creating order in DB...');
            const order = await paymentService.createOrder({
                userId: user.id,
                orderName: product.name,
                orderType: 'one_time',
                amount: product.price,
                relatedId: product.id,
                relatedType: 'shop_product',
                metadata: { productId: product.id },
            });
            createdOrderId = order.id;
            console.log('[ShopProductModal] Order created:', order.id, order.tossOrderId);

            // 2. v2 SDK 초기화
            const tossPayments = await loadTossPayments(clientKey);

            // 3. 결제창 인스턴스 생성 (회원 결제)
            const payment = tossPayments.payment({
                customerKey: user.id,
            });

            const origin = window.location.origin;

            // 4. 결제창 띄우기 (DB에 저장된 orderId 사용)
            console.log('[ShopProductModal] Launching payment widget...');
            await payment.requestPayment({
                method: 'CARD',
                amount: {
                    currency: 'KRW',
                    value: product.price,
                },
                orderId: order.tossOrderId,  // DB에 저장된 orderId 사용
                orderName: product.name,
                successUrl: `${origin}/payment/callback?status=success&productId=${product.id}`,
                failUrl: `${origin}/payment/callback?status=fail`,
                customerEmail: user.email ?? undefined,
                customerName: user.user_metadata?.name ?? user.user_metadata?.full_name ?? '고객',
                card: {
                    useEscrow: false,
                    flowMode: 'DEFAULT',
                    useCardPoint: false,
                    useAppCardOnly: false,
                },
            });
        } catch (error) {
            console.error('[ShopProductModal] Payment error:', error);

            // 주문이 생성된 후 취소된 경우, 주문 상태를 cancelled로 업데이트
            if (createdOrderId) {
                console.log('[ShopProductModal] Cancelling order:', createdOrderId);
                await paymentService.cancelOrder(createdOrderId);
            }

            // 사용자가 결제창을 닫은 경우는 에러로 처리하지 않음
            if (error instanceof Error && !error.message.includes('USER_CANCEL')) {
                alert('결제 중 오류가 발생했습니다.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    borderRadius: '24px',
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ p: 3, position: 'relative' }}>
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 16, top: 16, bgcolor: '#f3f4f6' }}
                    size="small"
                >
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, textAlign: 'left', mt: 1 }}>
                    {product.name} 구매
                </Typography>

                {/* Selected Product Card */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 2.5,
                        borderRadius: '20px',
                        bgcolor: '#eff6ff',
                        border: `2px solid ${theme.palette.primary.main}`,
                        mb: 3,
                        position: 'relative'
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>
                            {product.name}
                        </Typography>
                        <Typography sx={{ fontSize: 20, fontWeight: 900, color: theme.palette.primary.main }}>
                            ₩{product.price.toLocaleString()}
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: theme.palette.primary.dark, mb: 2, fontWeight: 500 }}>
                        {product.description}
                    </Typography>

                    {product.badgeText && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: theme.palette.primary.main }}>
                            <LocalOfferRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                                {product.badgeText}
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {/* Benefits Section */}
                <Box sx={{ mb: 4, px: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2, color: '#374151' }}>
                        구매 안내
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[
                            '구매 즉시 아이템이 적용됩니다.',
                            '결제일로부터 7일 이내 환불이 가능합니다 (미사용 시).',
                            '안전한 결제 시스템으로 보호됩니다.',
                        ].map((text, idx) => (
                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <CheckCircleRoundedIcon sx={{ fontSize: 16, color: theme.palette.status.Success }} />
                                <Typography sx={{ fontSize: 13, color: '#6B7280' }}>
                                    {text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Purchase Button */}
                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handlePurchase}
                    disabled={isLoading}
                    sx={{
                        py: 1.8,
                        borderRadius: '16px',
                        fontSize: '16px',
                        fontWeight: 600,
                        boxShadow: '0px 8px 16px rgba(37, 99, 235, 0.2)',
                        mb: 2,
                    }}
                >
                    {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        `${product.name} 구매하기 (₩${product.price.toLocaleString()})`
                    )}
                </Button>

                <Typography sx={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                    안전한 결제 시스템으로 보호됩니다
                </Typography>
            </Box>
        </Dialog>
    );
}
