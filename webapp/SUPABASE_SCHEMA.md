# Supabase 스키마 가이드

## 브랜드 온보딩을 위한 데이터베이스 설정

### 1. Storage Bucket 생성

Supabase Dashboard > Storage 섹션에서 다음 버킷을 생성하세요:

```
버킷명: brand-images
Public: true (공개 URL 사용을 위해)
```

**버킷 생성 방법:**
1. Supabase Dashboard 접속
2. Storage > Create a new bucket
3. Name: `brand-images`
4. Public bucket 체크
5. Create bucket 클릭

**Storage Policy 설정 (선택사항):**
```sql
-- 인증된 사용자만 업로드 가능하도록 설정
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-images');

-- 모든 사용자가 읽기 가능 (Public URL)
CREATE POLICY "Anyone can view"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-images');

-- 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brand-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

### 2. Brands 테이블 생성

Supabase Dashboard > SQL Editor에서 다음 SQL을 실행하세요:

```sql
-- brands 테이블 생성
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: 브랜드명
  brand_name TEXT NOT NULL,
  
  -- Step 2: 상세정보
  activity_field TEXT NOT NULL,
  target_audience TEXT[] NOT NULL DEFAULT '{}',
  preferred_creator_type TEXT[] NOT NULL DEFAULT '{}',
  
  -- Step 3: 이미지
  cover_image_url TEXT NOT NULL,
  logo_image_url TEXT NOT NULL,
  
  -- Step 4: 협업 정보
  collaboration_types TEXT[] NOT NULL DEFAULT '{}',
  monthly_budget TEXT NOT NULL,
  
  -- Step 5: 비즈니스 정보 (선택사항)
  website_url TEXT,
  sns_channel TEXT,
  contact_info TEXT,
  
  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT unique_user_brand UNIQUE(user_id)
);

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
CREATE INDEX idx_brands_activity_field ON public.brands(activity_field);
CREATE INDEX idx_brands_created_at ON public.brands(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- 정책: 자신의 브랜드만 조회 가능
CREATE POLICY "Users can view own brand"
ON public.brands FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 정책: 인증된 사용자는 브랜드 생성 가능
CREATE POLICY "Users can create own brand"
ON public.brands FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 정책: 자신의 브랜드만 수정 가능
CREATE POLICY "Users can update own brand"
ON public.brands FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 정책: 자신의 브랜드만 삭제 가능
CREATE POLICY "Users can delete own brand"
ON public.brands FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

---

### 3. 테이블 구조 설명

#### brands 테이블 컬럼

| 컬럼명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| id | UUID | ✓ | 기본 키 (자동 생성) |
| user_id | UUID | ✓ | 사용자 ID (auth.users 참조) |
| brand_name | TEXT | ✓ | 브랜드명/회사명 |
| category | TEXT | ✓ | 활동 분야 (패션, 뷰티, 라이프스타일, 테크, F&B) |
| target_audience | TEXT[] | ✓ | 주요 타겟 고객 (10대, 20대, 30대, 40대 이상) |
| preferred_creator_type | TEXT[] | ✓ | 선호 크리에이터 분야 |
| cover_image_url | TEXT | ✓ | 커버 이미지 URL (Storage) |
| logo_image_url | TEXT | ✓ | 로고 이미지 URL (Storage) |
| collaboration_types | TEXT[] | ✓ | 협업 방식 (공동구매, 유료광고 등) |
| monthly_budget | TEXT | ✓ | 월 마케팅 예산 규모 |
| website_url | TEXT | - | 공식 웹사이트 주소 (선택) |
| sns_channel | TEXT | - | SNS 채널 (선택) |
| contact_info | TEXT | - | 담당자 연락처 (선택) |
| created_at | TIMESTAMPTZ | ✓ | 생성 시간 (자동) |
| updated_at | TIMESTAMPTZ | ✓ | 수정 시간 (자동) |

---

### 4. 데이터 예시

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "789e0123-e89b-12d3-a456-426614174000",
  "brand_name": "멋진브랜드",
  "category": "패션",
  "target_audience": ["20대", "30대"],
  "preferred_creator_type": ["라이프스타일", "버츄얼 아티스트"],
  "cover_image_url": "https://xxx.supabase.co/storage/v1/object/public/brand-images/user-id/cover_123.jpg",
  "logo_image_url": "https://xxx.supabase.co/storage/v1/object/public/brand-images/user-id/logo_123.jpg",
  "collaboration_types": ["공동구매", "유료광고", "이벤트"],
  "monthly_budget": "100-500만원",
  "website_url": "https://example.com",
  "sns_channel": "@example_brand",
  "contact_info": "contact@example.com",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

### 5. 테스트 쿼리

```sql
-- 모든 브랜드 조회
SELECT * FROM public.brands;

-- 특정 사용자의 브랜드 조회
SELECT * FROM public.brands WHERE user_id = 'your-user-id';

-- 카테고리별 브랜드 수 조회
SELECT category, COUNT(*) as count
FROM public.brands
GROUP BY category;

-- 최근 생성된 브랜드 10개 조회
SELECT * FROM public.brands
ORDER BY created_at DESC
LIMIT 10;
```

---

### 6. TypeScript 타입 정의 (선택사항)

TypeScript 사용 시 다음 타입을 추가하면 편리합니다:

```typescript
// src/types/database.types.ts
export interface Brand {
  id: string;
  user_id: string;
  brand_name: string;
  category: string;
  target_audience: string[];
  preferred_creator_type: string[];
  cover_image_url: string;
  logo_image_url: string;
  collaboration_types: string[];
  monthly_budget: string;
  website_url: string | null;
  sns_channel: string | null;
  contact_info: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 주의사항

1. **Storage Bucket 먼저 생성**: `brand-images` 버킷을 생성하지 않으면 이미지 업로드가 실패합니다.
2. **RLS 활성화**: Row Level Security를 활성화하여 사용자가 자신의 데이터만 접근할 수 있도록 합니다.
3. **Unique 제약**: 한 사용자당 하나의 브랜드만 등록 가능하도록 설정되어 있습니다. 여러 개 허용 시 제약조건 제거 필요.
4. **인증 필수**: 모든 작업은 인증된 사용자만 수행할 수 있습니다.

