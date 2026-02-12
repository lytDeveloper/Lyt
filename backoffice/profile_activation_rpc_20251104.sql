-- 프로필 전환/생성 관련 RPC 함수 정의 (2025-11-04)

-- 1) 다른 비팬 활성 비활성화 후 타겟 타입을 위한 자리를 비워주는 전환 RPC
create or replace function public.profile_switch(p_user uuid, p_target_type text)
returns void
language plpgsql
security definer
as $$
begin
  -- 대상이 브랜드일 경우: 아티스트/크리에이티브 비활성화
  if lower(p_target_type) = 'brand' then
    update public.profile_artists set is_active = false where profile_id = p_user and is_active = true;
    update public.profile_creatives set is_active = false where profile_id = p_user and is_active = true;
  elsif lower(p_target_type) = 'artist' then
    update public.profile_brands set is_active = false where profile_id = p_user and is_active = true;
    update public.profile_creatives set is_active = false where profile_id = p_user and is_active = true;
  elsif lower(p_target_type) = 'creative' then
    update public.profile_brands set is_active = false where profile_id = p_user and is_active = true;
    update public.profile_artists set is_active = false where profile_id = p_user and is_active = true;
  elsif lower(p_target_type) = 'fan' then
    -- 팬 전환은 비팬에 영향 없음. 팬이 2개 이상 활성화된 경우 최신 1개만 유지
    with ranked as (
      select ctid, row_number() over (order by created_at desc nulls last) as rn
      from public.profile_fans where profile_id = p_user and is_active = true
    )
    update public.profile_fans f
    set is_active = false
    from ranked r
    where f.ctid = r.ctid and r.rn > 1;
  else
    raise exception 'unknown target_type: %', p_target_type;
  end if;

  -- 보장: 전환 후에도 상호배타 제약 검사
  perform public.fn_assert_single_active_nonfan(p_user);
  
  -- profiles.roles 배열을 최신 상태로 동기화
  -- (트리거가 자동으로 처리하지만, 명시적으로 호출하여 일관성 보장)
  perform public.update_profiles_role(p_user);
end;
$$;

-- 2) 선택: 프로필 생성 준비 RPC (제약만 확인하고 OK/에러만 반환)
create or replace function public.profile_create_guard(p_user uuid, p_type text)
returns boolean
language plpgsql
security definer
as $$
begin
  if lower(p_type) in ('brand','artist','creative') then
    perform public.fn_assert_single_active_nonfan(p_user);
  end if;
  return true;
end;
$$;


