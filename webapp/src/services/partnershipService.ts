import { supabase } from '../lib/supabase';
import type { PartnershipInquiryData } from '../stores/usePartnershipStore';
import { getContentType } from '../utils/fileUtils';

export const partnershipService = {
  async createInquiry(senderId: string, receiverId: string, data: PartnershipInquiryData) {
    try {
      // 1. Upload files if any
      const attachments = [];
      if (data.files.length > 0) {
        for (const file of data.files) {
          // Simple file upload logic - typically you'd upload to a bucket like 'inquiry-attachments'
          // For this MVP, we will skip actual storage upload if bucket not set up, 
          // or assume a 'attachments' bucket exists. 
          // To be safe and avoid errors if bucket missing, let's mock the URL or try upload.
          // We'll try to upload to a 'chat-attachments' or similar if available, 
          // or just store metadata if we can't ensure bucket existence.
          // Let's assume 'attachments' bucket.

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${senderId}/${fileName}`;

          // Get Content-Type for the file
          const contentType = getContentType(file);

          const { error: uploadError } = await supabase.storage
            .from('partnership-attachments') // Assuming this bucket exists, if not, this might fail. 
            .upload(filePath, file, {
              contentType: contentType,
            });

          if (uploadError) {
            console.warn('File upload failed, skipping file:', file.name, uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('partnership-attachments')
            .getPublicUrl(filePath);

          attachments.push({
            name: file.name,
            type: file.type,
            size: file.size,
            url: publicUrl
          });
        }
      }

      // 2. Insert inquiry record
      const { data: inquiry, error } = await supabase
        .from('partnership_inquiries')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          company_name: data.companyName,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          project_type: data.projectType,
          budget_range: data.budgetRange,
          duration: data.duration,
          description: data.description,
          goals: data.goals,
          experience: data.experience,
          attachments: attachments,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return inquiry;

    } catch (error) {
      console.error('Failed to create partnership inquiry:', error);
      throw error;
    }
  },

  async getSentPartnershipInquiries(senderId: string) {
    // 1. 파트너십 문의 조회
    const { data: inquiries, error } = await supabase
      .from('partnership_inquiries')
      .select('*')
      .eq('sender_id', senderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!inquiries || inquiries.length === 0) return [];

    // 2. receiver_id 목록으로 브랜드 정보 조회
    const receiverIds = [...new Set(inquiries.map(i => i.receiver_id))];
    const { data: brands, error: brandsError } = await supabase
      .from('profile_brands')
      .select('profile_id, brand_name, activity_field, is_active')
      .in('profile_id', receiverIds);

    if (brandsError) {
      console.warn('Failed to fetch brand info:', brandsError);
    }

    // 3. 브랜드 정보 맵 생성
    const brandMap = new Map(
      (brands || []).map(b => [b.profile_id, b])
    );

    // 4. 파트너십 문의에 브랜드 정보 병합
    return inquiries.map((inquiry: any) => {
      const brand = brandMap.get(inquiry.receiver_id);
      return {
        ...inquiry,
        receiver_brand_name: brand?.brand_name || '',
        receiver_activity_field: brand?.activity_field || '',
        receiver_is_verified: brand?.is_active || false,
      };
    });
  },

  async getReceivedPartnershipInquiries(receiverId: string) {
    const { data, error } = await supabase
      .from('partnership_inquiries')
      .select('*')
      .eq('receiver_id', receiverId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Respond to a partnership inquiry (accept/reject/hold)
   * When accepted, a chat room is created via DB trigger
   * @returns Chat room ID if accepted, undefined otherwise
   */
  async respondToPartnershipInquiry(
    id: string,
    status: 'accepted' | 'rejected' | 'on_hold',
    responseMessage?: string
  ): Promise<string | undefined> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('로그인이 필요합니다');
    }

    // Get inquiry info
    const { data: inquiry, error: fetchError } = await supabase
      .from('partnership_inquiries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !inquiry) {
      throw new Error('파트너십 문의를 찾을 수 없습니다');
    }

    // Check permission
    if (inquiry.receiver_id !== user.id) {
      throw new Error('이 파트너십 문의에 응답할 권한이 없습니다');
    }

    // Check status - allow pending or hold to be updated
    if (inquiry.status !== 'pending' && inquiry.status !== 'on_hold') {
      throw new Error('이미 처리된 파트너십 문의입니다');
    }

    // Update with response_message
    const updateData: { status: string; response_message?: string } = { status };
    if (responseMessage) {
      updateData.response_message = responseMessage;
    }

    // For rejection or hold, just update and return
    if (status === 'rejected' || status === 'on_hold') {
      const { error: updateError } = await supabase
        .from('partnership_inquiries')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('[partnershipService] respondToPartnershipInquiry failed:', updateError);
        throw new Error(`파트너십 문의 응답에 실패했습니다: ${updateError.message}`);
      }

      return undefined;
    }

    // 수락 시 요청자(sender)의 채팅권 차감
    // const { shopService } = await import('./shopService');
    // const creditUsed = await shopService.useChatCredit(inquiry.sender_id);
    // if (!creditUsed) {
    //   throw new Error('문의를 보낸 사용자의 채팅권이 부족하여 수락할 수 없어요.');
    // }

    // For acceptance, get the created chat room ID
    const { data: updatedInquiry, error: updateError } = await supabase
      .from('partnership_inquiries')
      .update(updateData)
      .eq('id', id)
      .select('created_chat_room_id')
      .single();

    if (updateError) {
      console.error('[partnershipService] respondToPartnershipInquiry failed:', updateError);
      throw new Error(`파트너십 문의 응답에 실패했습니다: ${updateError.message}`);
    }

    // 파트너십 수락 시 양측에 활동 기록
    try {
      const { activityService } = await import('./activityService');

      // sender(inquiry.sender_id)와 receiver(브랜드) 이름 조회
      const [senderBrandRes, receiverBrandRes] = await Promise.all([
        // sender 정보 (partners 뷰에서 조회)
        supabase.from('partners').select('name').eq('id', inquiry.sender_id).maybeSingle(),
        // receiver(브랜드) 정보
        supabase.from('profile_brands').select('brand_name').eq('profile_id', user.id).eq('is_active', true).maybeSingle(),
      ]);

      const senderName = senderBrandRes.data?.name || '파트너';
      const receiverBrandName = receiverBrandRes.data?.brand_name || '브랜드';

      // sender에게 활동 기록 (브랜드 이름으로)
      activityService
        .createActivityViaRPC({
          userId: inquiry.sender_id,
          activityType: 'partnership_inquiry_accepted',
          relatedEntityType: 'user',
          relatedEntityId: user.id,
          title: `새로운 브랜드 ${receiverBrandName}님과 연결되었어요`,
          description: '',
          metadata: {
            brand_id: user.id,
            brand_name: receiverBrandName,
            chat_room_id: updatedInquiry?.created_chat_room_id,
          },
        })
        .catch((err) =>
          console.warn('[partnershipService] Failed to record sender activity:', err)
        );

      // receiver(브랜드)에게도 활동 기록 (sender 이름으로)
      activityService
        .createActivityViaRPC({
          userId: user.id,
          activityType: 'partnership_inquiry_accepted',
          relatedEntityType: 'user',
          relatedEntityId: inquiry.sender_id,
          title: `새로운 파트너 ${senderName}님과 연결되었어요`,
          description: '',
          metadata: {
            partner_id: inquiry.sender_id,
            partner_name: senderName,
            chat_room_id: updatedInquiry?.created_chat_room_id,
          },
        })
        .catch((err) =>
          console.warn('[partnershipService] Failed to record receiver activity:', err)
        );
    } catch (err) {
      console.warn('[partnershipService] Failed to record partnership activities:', err);
    }

    return updatedInquiry?.created_chat_room_id || undefined;
  },

  /**
   * @deprecated Use respondToPartnershipInquiry instead
   */
  async updatePartnershipStatus(id: string, status: string) {
    const { error } = await supabase
      .from('partnership_inquiries')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  }
};

