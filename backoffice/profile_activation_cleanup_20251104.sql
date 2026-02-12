-- 다중 비팬 활성 사용자 정리 스크립트 (시뮬레이션/실행용)
-- 전략: 사용자별(프로필 소유자)로 세 비팬 테이블 합집합에서 최신(created_at) 1개만 남기고 나머지는 is_active=false로 비활성화

begin;

with combined as (
  select profile_id as user_id, 'brand' as t, created_at
  from public.profile_brands where is_active = true
  union all
  select profile_id as user_id, 'artist' as t, created_at
  from public.profile_artists where is_active = true
  union all
  select profile_id as user_id, 'creative' as t, created_at
  from public.profile_creatives where is_active = true
), latest as (
  select user_id,
         (array_agg(t order by created_at desc nulls last))[1] as keep_type
  from combined
  group by user_id
)
-- 브랜드: 최신 타입이 브랜드가 아닌 사용자 레코드 비활성화
update public.profile_brands b
set is_active = false
from latest l
where b.profile_id = l.user_id and l.keep_type <> 'brand' and b.is_active = true;

-- 아티스트
update public.profile_artists a
set is_active = false
from latest l
where a.profile_id = l.user_id and l.keep_type <> 'artist' and a.is_active = true;

-- 크리에이티브
update public.profile_creatives c
set is_active = false
from latest l
where c.profile_id = l.user_id and l.keep_type <> 'creative' and c.is_active = true;

commit;


