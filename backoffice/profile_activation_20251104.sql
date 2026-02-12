-- 프로필 활성화 규칙 마이그레이션 (2025-11-04)
-- 규칙 요약:
-- 1) 각 사용자에 대해 팬(profile_fans)은 활성 상태가 최대 1개
-- 2) 비팬(profile_brands | profile_artists | profile_creatives)은 세 테이블 전체를 통틀어 활성 상태가 동시에 최대 1개
-- 3) 비활성은 소프트 삭제로 is_active=false 처리

-- 0) 안전한 트랜잭션 경계
begin;

-- 1) 각 테이블에 is_active 컬럼 추가 (기본값 true)
alter table if exists public.profile_fans add column if not exists is_active boolean not null default true;
alter table if exists public.profile_brands add column if not exists is_active boolean not null default true;
alter table if exists public.profile_artists add column if not exists is_active boolean not null default true;
alter table if exists public.profile_creatives add column if not exists is_active boolean not null default true;

-- 2) 인덱스 및 부분 유니크 제약
-- 팬: 사용자당 활성 1개 제한
create unique index if not exists ux_profile_fans_user_active
  on public.profile_fans(profile_id)
  where is_active = true;

-- 보조 인덱스(조회 최적화)
create index if not exists ix_profile_fans_user_active on public.profile_fans(profile_id, is_active);
create index if not exists ix_profile_brands_user_active on public.profile_brands(profile_id, is_active);
create index if not exists ix_profile_artists_user_active on public.profile_artists(profile_id, is_active);
create index if not exists ix_profile_creatives_user_active on public.profile_creatives(profile_id, is_active);

-- 3) 비팬 활성 상호배타 제약을 트리거로 강제
create or replace function public.fn_assert_single_active_nonfan(p_user uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_cnt int;
begin
  select
    coalesce((select count(1) from public.profile_brands where profile_id = p_user and is_active = true), 0)
  + coalesce((select count(1) from public.profile_artists where profile_id = p_user and is_active = true), 0)
  + coalesce((select count(1) from public.profile_creatives where profile_id = p_user and is_active = true), 0)
  into v_cnt;

  if v_cnt > 1 then
    raise exception 'Only one active non-fan profile is allowed per user' using errcode = '23514';
  end if;
end;
$$;

-- 브랜드
create or replace function public.trg_profile_brands_single_active()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_active, true) then
    perform public.fn_assert_single_active_nonfan(new.profile_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_brands_single_active on public.profile_brands;
create trigger trg_profile_brands_single_active
  before insert or update of is_active on public.profile_brands
  for each row execute function public.trg_profile_brands_single_active();

-- 아티스트
create or replace function public.trg_profile_artists_single_active()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_active, true) then
    perform public.fn_assert_single_active_nonfan(new.profile_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_artists_single_active on public.profile_artists;
create trigger trg_profile_artists_single_active
  before insert or update of is_active on public.profile_artists
  for each row execute function public.trg_profile_artists_single_active();

-- 크리에이티브
create or replace function public.trg_profile_creatives_single_active()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_active, true) then
    perform public.fn_assert_single_active_nonfan(new.profile_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_creatives_single_active on public.profile_creatives;
create trigger trg_profile_creatives_single_active
  before insert or update of is_active on public.profile_creatives
  for each row execute function public.trg_profile_creatives_single_active();

commit;


