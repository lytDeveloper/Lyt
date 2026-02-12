import { supabase } from '../lib/supabase';

// ============================================
// Types
// ============================================

export type ShopCategory = 'decoration' | 'chat_ticket' | 'explore_boost';

export interface ShopProduct {
    id: string;
    category: ShopCategory;
    name: string;
    description: string | null;
    price: number;
    originalPrice: number | null;
    metadata: Record<string, unknown>;
    badgeText: string | null;
    sortOrder: number;
}

export interface UserInventoryItem {
    id: string;
    userId: string;
    productId: string;
    product?: ShopProduct;
    quantity: number;
    expiresAt: string | null;
    isEquipped: boolean;
    createdAt: string;
}

export interface ExploreBoost {
    id: string;
    userId: string;
    rankPosition: number;
    startsAt: string;
    endsAt: string;
}

export interface UserChatCredits {
    userId: string;
    remainingCredits: number;
    updatedAt: string;
}

// ============================================
// Shop Service
// ============================================

export const shopService = {
    /**
     * 모든 활성 상품 조회
     */
    async getProducts(): Promise<ShopProduct[]> {
        const { data, error } = await supabase
            .from('shop_products')
            .select('*')
            .eq('is_active', true)
            .order('category')
            .order('sort_order');

        if (error) {
            console.error('[shopService] Failed to fetch products:', error);
            throw error;
        }

        return (data || []).map(row => ({
            id: row.id,
            category: row.category as ShopCategory,
            name: row.name,
            description: row.description,
            price: row.price,
            originalPrice: row.original_price,
            metadata: row.metadata || {},
            badgeText: row.badge_text,
            sortOrder: row.sort_order,
        }));
    },

    /**
     * 카테고리별 상품 조회
     */
    async getProductsByCategory(category: ShopCategory): Promise<ShopProduct[]> {
        const { data, error } = await supabase
            .from('shop_products')
            .select('*')
            .eq('is_active', true)
            .eq('category', category)
            .order('sort_order');

        if (error) {
            console.error('[shopService] Failed to fetch products by category:', error);
            throw error;
        }

        return (data || []).map(row => ({
            id: row.id,
            category: row.category as ShopCategory,
            name: row.name,
            description: row.description,
            price: row.price,
            originalPrice: row.original_price,
            metadata: row.metadata || {},
            badgeText: row.badge_text,
            sortOrder: row.sort_order,
        }));
    },

    /**
     * 사용자 인벤토리 조회
     */
    async getUserInventory(userId: string): Promise<UserInventoryItem[]> {
        const { data, error } = await supabase
            .from('user_inventory')
            .select(`
        *,
        product:shop_products(*)
      `)
            .eq('user_id', userId);

        if (error) {
            console.error('[shopService] Failed to fetch user inventory:', error);
            throw error;
        }

        return (data || []).map(row => ({
            id: row.id,
            userId: row.user_id,
            productId: row.product_id,
            product: row.product ? {
                id: row.product.id,
                category: row.product.category as ShopCategory,
                name: row.product.name,
                description: row.product.description,
                price: row.product.price,
                originalPrice: row.product.original_price,
                metadata: row.product.metadata || {},
                badgeText: row.product.badge_text,
                sortOrder: row.product.sort_order,
            } : undefined,
            quantity: row.quantity,
            expiresAt: row.expires_at,
            isEquipped: row.is_equipped,
            createdAt: row.created_at,
        }));
    },

    /**
     * 사용자 채팅 크레딧 조회
     */
    async getChatCredits(userId: string): Promise<number> {
        const { data, error } = await supabase
            .from('user_chat_credits')
            .select('remaining_credits')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[shopService] Failed to fetch chat credits:', error);
            throw error;
        }

        // 기본값 1000
        return data?.remaining_credits ?? 1000;
    },

    /**
     * 활성 부스트 조회 (탐색 페이지용)
     */
    async getActiveBoostedPartners(): Promise<ExploreBoost[]> {
        const { data, error } = await supabase
            .rpc('get_active_boosted_partners');

        if (error) {
            console.error('[shopService] Failed to fetch boosted partners:', error);
            return [];
        }

        return (data || []).map((row: { user_id: string; rank_position: number; ends_at: string }) => ({
            id: '',
            userId: row.user_id,
            rankPosition: row.rank_position,
            startsAt: '',
            endsAt: row.ends_at,
        }));
    },

    /**
     * 특정 순위 슬롯 사용 가능 여부 확인
     */
    async isBoostSlotAvailable(rank: number, days: number): Promise<boolean> {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + days);

        const { data, error } = await supabase
            .from('explore_boosts')
            .select('id')
            .eq('rank_position', rank)
            .gt('ends_at', new Date().toISOString())
            .limit(1);

        if (error) {
            console.error('[shopService] Failed to check boost slot:', error);
            return false;
        }

        return (data || []).length === 0;
    },

    /**
     * 주문 생성 (결제 전 preparatory step)
     */
    async createOrder(params: {
        productId: string;
        userId: string;
        orderName: string;
        amount: number;
    }): Promise<{ orderId: string; tossOrderId: string }> {
        const tossOrderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const { data, error } = await supabase
            .from('orders')
            .insert({
                user_id: params.userId,
                order_name: params.orderName,
                order_type: 'one_time',
                amount: params.amount,
                status: 'pending',
                toss_order_id: tossOrderId,
            })
            .select('id')
            .single();

        if (error) {
            console.error('[shopService] Failed to create order:', error);
            throw error;
        }

        return {
            orderId: data.id,
            tossOrderId,
        };
    },

    /**
     * 구매 완료 처리 (결제 성공 후)
     * 실제로는 Toss Payments 웹훅에서 처리
     */
    async completePurchase(params: {
        orderId: string;
        paymentKey: string;
        productId: string;
        userId: string;
        metadata: Record<string, unknown>;
    }): Promise<void> {
        // 1. 주문 상태 업데이트
        await supabase
            .from('orders')
            .update({
                status: 'completed',
                payment_key: params.paymentKey,
                confirmed_at: new Date().toISOString(),
            })
            .eq('id', params.orderId);

        // 2. 상품 타입에 따라 처리
        const { data: product } = await supabase
            .from('shop_products')
            .select('*')
            .eq('id', params.productId)
            .single();

        if (!product) return;

        const category = product.category as ShopCategory;
        const metadata = product.metadata as Record<string, unknown>;

        if (category === 'chat_ticket') {
            // 채팅 크레딧 추가
            const quantity = (metadata.quantity as number) || 0;
            await supabase.rpc('add_chat_credits', {
                p_user_id: params.userId,
                p_amount: quantity,
            });
        } else if (category === 'explore_boost') {
            // 부스트 적용
            const rank = (metadata.rank as number) || 1;
            const days = (metadata.days as number) || 30;
            const endsAt = new Date();
            endsAt.setDate(endsAt.getDate() + days);

            await supabase
                .from('explore_boosts')
                .insert({
                    user_id: params.userId,
                    rank_position: rank,
                    ends_at: endsAt.toISOString(),
                    order_id: params.orderId,
                });
        } else if (category === 'decoration') {
            // 인벤토리에 추가
            await supabase
                .from('user_inventory')
                .upsert({
                    user_id: params.userId,
                    product_id: params.productId,
                    order_id: params.orderId,
                    quantity: 1,
                    is_equipped: false,
                }, {
                    onConflict: 'user_id,product_id',
                });
        }
    },

    /**
   * 채팅 크레딧 차감 (1회)
   * 성공 시 true, 잔여 부족 시 false 반환
   */
    async useChatCredit(userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .rpc('use_chat_credit', { p_user_id: userId });

        if (error) {
            console.error('[shopService] Failed to use chat credit:', error);
            return false; // 에러 시 안전하게 차단?? 혹은 정책에 따라 true로 할 수도 있으나 일단 false
        }

        return data as boolean;
    },

    /**
     * 장착 아이템 토글
     */
    async toggleEquipped(inventoryId: string, isEquipped: boolean): Promise<void> {
        const { error } = await supabase
            .from('user_inventory')
            .update({ is_equipped: isEquipped })
            .eq('id', inventoryId);

        if (error) {
            console.error('[shopService] Failed to toggle equipped:', error);
            throw error;
        }
    },
};

export default shopService;
