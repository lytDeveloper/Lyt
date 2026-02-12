# 동의 컬럼 추가 마이그레이션 가이드

## 개요
이 마이그레이션은 `profiles` 테이블에 누락된 4개의 동의 컬럼을 추가합니다.

### 추가되는 컬럼
1. `privacy_agreed_at` - 개인정보 수집 및 이용 동의 (필수)
2. `project_recommendation_agreed_at` - 프로젝트 추천 동의 (선택)
3. `partner_matching_agreed_at` - 파트너 매칭 동의 (선택)
4. `events_agreed_at` - 이벤트 동의 (선택)

### 기존 컬럼 (유지)
- `terms_agreed_at` - 서비스 이용약관 동의 (필수)
- `marketing_agreed_at` - 마케팅 정보 수신 동의 (선택)

---

## 마이그레이션 실행 방법

### 방법 1: Supabase CLI 사용 (권장)

로컬 개발 환경인 경우:

```bash
# 1. Supabase 프로젝트 디렉토리로 이동
cd c:\Users\이창한\OneDrive\바탕 화면\BridgeApp

# 2. 로컬 Supabase 시작 (이미 실행 중이면 생략)
supabase start

# 3. 마이그레이션 적용
supabase db reset  # 로컬 DB를 리셋하고 모든 마이그레이션 재실행
# 또는
supabase db push   # 새로운 마이그레이션만 적용
```

프로덕션/스테이징 환경:

```bash
# 1. Supabase에 연결
supabase link --project-ref [YOUR_PROJECT_REF]

# 2. 마이그레이션 푸시
supabase db push

# 3. 적용 확인
supabase db diff
```

---

### 방법 2: Supabase Dashboard 사용

1. **Supabase Dashboard 접속**
   - https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]

2. **SQL Editor로 이동**
   - 왼쪽 메뉴에서 `SQL Editor` 클릭

3. **마이그레이션 파일 내용 복사**
   - `20250128_add_consent_columns.sql` 파일 내용 전체 복사

4. **쿼리 실행**
   - SQL Editor에 붙여넣기
   - `Run` 버튼 클릭

5. **확인**
   - `Table Editor` > `profiles` 테이블로 이동
   - 새로운 컬럼들이 추가되었는지 확인

---

### 방법 3: psql 직접 사용

```bash
# 1. Supabase DB에 연결
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 2. SQL 파일 실행
\i supabase/migrations/20250128_add_consent_columns.sql

# 3. 확인
\d profiles
```

---

## 마이그레이션 후 확인 사항

### 1. 컬럼 존재 확인

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'privacy_agreed_at',
    'project_recommendation_agreed_at',
    'partner_matching_agreed_at',
    'events_agreed_at'
  );
```

예상 결과:
```
column_name                         | data_type                   | is_nullable
------------------------------------+-----------------------------+-------------
privacy_agreed_at                   | timestamp with time zone    | YES
project_recommendation_agreed_at    | timestamp with time zone    | YES
partner_matching_agreed_at          | timestamp with time zone    | YES
events_agreed_at                    | timestamp with time zone    | YES
```

### 2. 인덱스 확인

```sql
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
  AND indexname LIKE 'idx_profiles_%_agreed';
```

### 3. 주석 확인

```sql
SELECT 
  column_name,
  col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as column_comment
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE '%_agreed_at';
```

---

## 롤백 방법 (필요시)

마이그레이션을 되돌려야 하는 경우:

```sql
-- 인덱스 제거
DROP INDEX IF EXISTS idx_profiles_marketing_agreed;
DROP INDEX IF EXISTS idx_profiles_project_recommendation_agreed;
DROP INDEX IF EXISTS idx_profiles_partner_matching_agreed;
DROP INDEX IF EXISTS idx_profiles_events_agreed;

-- 컬럼 제거
ALTER TABLE profiles DROP COLUMN IF EXISTS privacy_agreed_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS project_recommendation_agreed_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS partner_matching_agreed_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS events_agreed_at;
```

---

## 영향 받는 코드

### 수정된 파일
- ✅ `webapp/src/pages/onboarding/ConsentPage.tsx` (handleSubmit 함수)
  - 6개 동의 항목 모두 DB에 저장하도록 업데이트됨

### TypeScript 타입 업데이트 필요 여부
- `database.types.ts` 파일이 있다면 재생성 필요:
  ```bash
  supabase gen types typescript --local > webapp/src/types/database.types.ts
  # 또는 프로덕션
  supabase gen types typescript --linked > webapp/src/types/database.types.ts
  ```

---

## 주의사항

1. **기존 사용자 데이터**: 새로 추가된 컬럼은 모두 `NULL`로 시작됩니다.
   - 문제없음: 선택적 동의 항목이므로 NULL이 정상입니다.

2. **RLS 정책**: 기존 RLS 정책이 새 컬럼에도 적용되는지 확인하세요.
   ```sql
   -- profiles 테이블의 RLS 정책 확인
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **백업**: 프로덕션 환경에서는 실행 전 백업 권장
   ```bash
   # Supabase Dashboard > Database > Backups
   ```

---

## 문제 해결

### "relation 'profiles' does not exist" 오류
- profiles 테이블이 존재하는지 확인
- 올바른 스키마(보통 public)에 있는지 확인

### "column already exists" 오류
- 정상입니다. `IF NOT EXISTS` 구문으로 인해 안전하게 처리됨

### 권한 오류
- Supabase 서비스 롤로 실행되고 있는지 확인
- Dashboard에서 실행 시 자동으로 올바른 권한으로 실행됨

---

## 테스트

마이그레이션 후 ConsentPage에서 테스트:

1. 새로운 사용자로 회원가입
2. 동의 페이지에서 모든 항목 체크
3. 제출 후 DB에서 확인:
   ```sql
   SELECT 
     id,
     privacy_agreed_at,
     terms_agreed_at,
     marketing_agreed_at,
     project_recommendation_agreed_at,
     partner_matching_agreed_at,
     events_agreed_at
   FROM profiles
   WHERE id = '[USER_ID]';
   ```

모든 체크한 항목의 타임스탬프가 올바르게 저장되어야 합니다.
