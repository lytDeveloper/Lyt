-- ================================================================
-- Magazine Reactions Migration
-- 매거진 좋아요/싫어요 기능 추가
-- 
-- Production 프로젝트 (ywaldpxprcusqmfdnlfk)에 수동으로 적용하세요.
-- Supabase Dashboard > SQL Editor에서 실행하세요.
-- ================================================================

-- 1. magazines 테이블에 dislike_count 컬럼 추가
ALTER TABLE public.magazines
ADD COLUMN IF NOT EXISTS dislike_count integer DEFAULT 0;

-- 2. magazine_reactions 테이블 생성 (사용자별 좋아요/싫어요 기록)
CREATE TABLE IF NOT EXISTS public.magazine_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  magazine_id uuid NOT NULL REFERENCES public.magazines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (magazine_id, user_id)
);

-- 3. RLS 정책 설정
ALTER TABLE public.magazine_reactions ENABLE ROW LEVEL SECURITY;

-- 사용자 본인의 반응만 조회 가능
CREATE POLICY "Users can view own reactions"
  ON public.magazine_reactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 로그인한 사용자는 반응 추가 가능
CREATE POLICY "Users can insert own reactions"
  ON public.magazine_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 로그인한 사용자는 본인 반응 수정 가능
CREATE POLICY "Users can update own reactions"
  ON public.magazine_reactions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 로그인한 사용자는 본인 반응 삭제 가능
CREATE POLICY "Users can delete own reactions"
  ON public.magazine_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_magazine_reactions_magazine_id ON public.magazine_reactions(magazine_id);
CREATE INDEX IF NOT EXISTS idx_magazine_reactions_user_id ON public.magazine_reactions(user_id);

-- 5. 반응 추가/변경 시 카운트 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_magazine_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: 새로운 반응 추가
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE public.magazines SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.magazine_id;
    ELSIF NEW.reaction_type = 'dislike' THEN
      UPDATE public.magazines SET dislike_count = COALESCE(dislike_count, 0) + 1 WHERE id = NEW.magazine_id;
    END IF;
    RETURN NEW;
  
  -- UPDATE: 반응 타입 변경 (like <-> dislike)
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type <> NEW.reaction_type THEN
      IF OLD.reaction_type = 'like' THEN
        UPDATE public.magazines SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.magazine_id;
      ELSIF OLD.reaction_type = 'dislike' THEN
        UPDATE public.magazines SET dislike_count = GREATEST(COALESCE(dislike_count, 0) - 1, 0) WHERE id = OLD.magazine_id;
      END IF;
      
      IF NEW.reaction_type = 'like' THEN
        UPDATE public.magazines SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.magazine_id;
      ELSIF NEW.reaction_type = 'dislike' THEN
        UPDATE public.magazines SET dislike_count = COALESCE(dislike_count, 0) + 1 WHERE id = NEW.magazine_id;
      END IF;
    END IF;
    RETURN NEW;
  
  -- DELETE: 반응 삭제
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE public.magazines SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.magazine_id;
    ELSIF OLD.reaction_type = 'dislike' THEN
      UPDATE public.magazines SET dislike_count = GREATEST(COALESCE(dislike_count, 0) - 1, 0) WHERE id = OLD.magazine_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS trigger_update_magazine_reaction_counts ON public.magazine_reactions;
CREATE TRIGGER trigger_update_magazine_reaction_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.magazine_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_magazine_reaction_counts();

