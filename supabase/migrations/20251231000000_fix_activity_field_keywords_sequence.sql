-- activity_field_keywords 테이블의 sequence 동기화
-- sequence의 last_value가 실제 max_id보다 작아서 primary key 충돌 발생
-- sequence를 현재 max_id + 1로 설정

DO $$
DECLARE
    v_max_id bigint;
    v_next_val bigint;
BEGIN
    -- 현재 최대 id 값 조회
    SELECT COALESCE(MAX(id), 0) INTO v_max_id
    FROM public.activity_field_keywords;
    
    -- sequence를 max_id + 1로 설정
    v_next_val := v_max_id + 1;
    
    -- sequence 값 설정 (setval은 다음 nextval 호출 시 반환할 값을 설정)
    -- false는 다음 nextval이 v_next_val을 반환하도록 함
    PERFORM setval('public.activity_field_keywords_id_seq', v_max_id, true);
    
    RAISE NOTICE 'Sequence synchronized: max_id = %, next value will be %', v_max_id, v_next_val;
END $$;

