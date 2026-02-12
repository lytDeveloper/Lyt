# User Preferences 테이블 통합 검토

## 📊 현황 분석

### 현재 구조 (3개 테이블)

```sql
-- 1. 프로젝트 숨김/차단
user_project_preferences (
  profile_id UUID,
  project_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  status preference_status DEFAULT 'hidden', -- ENUM: 'hidden', 'blocked'
  reason TEXT,
  PRIMARY KEY (profile_id, project_id)
)

-- 2. 협업 숨김/차단
user_collaboration_preferences (
  profile_id UUID,
  collaboration_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  status preference_status DEFAULT 'hidden',
  reason TEXT,
  PRIMARY KEY (profile_id, collaboration_id)
)

-- 3. 파트너 숨김/차단
user_partner_preferences (
  profile_id UUID,
  partner_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  status preference_status DEFAULT 'hidden',
  reason TEXT,
  PRIMARY KEY (profile_id, partner_id)
)
```

### 중복도 분석

| 항목 | 중복도 | 비고 |
|------|-------|------|
| **테이블 구조** | **100%** | 필드 이름만 다름 |
| **비즈니스 로직** | **100%** | 숨김/차단 로직 동일 |
| **ENUM 타입** | **100%** | preference_status 공유 |
| **제약조건** | **100%** | PK 구조 동일 |

---

## 🎯 핵심 차이점

### projects/collaborations vs preferences 비교

| 특성 | projects/collaborations | user_*_preferences |
|------|------------------------|-------------------|
| **중복도** | 85% | **100%** |
| **비즈니스 로직** | 다름 (브랜드 vs 파트너) | **완전히 동일** |
| **특화 필드** | 6-8개씩 존재 | **없음** |
| **도메인 복잡도** | 높음 | **낮음 (단순 관계)** |
| **확장 가능성** | 각자 다른 방향 | **동일 패턴** |

**결론: preferences는 통합 가능성이 훨씬 높음**

---

## 💡 통합 옵션 분석

### 🅰️ Option A: 3개 모두 통합 (완전 통합)

```sql
CREATE TYPE preference_target_type AS ENUM ('project', 'collaboration', 'partner');

CREATE TABLE user_preferences (
  profile_id UUID NOT NULL REFERENCES profiles(id),
  target_type preference_target_type NOT NULL,
  target_id UUID NOT NULL,
  status preference_status NOT NULL DEFAULT 'hidden',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  PRIMARY KEY (profile_id, target_type, target_id),

  -- 조건부 외래키 (트리거 또는 체크 제약으로 구현)
  CONSTRAINT check_target_exists CHECK (
    CASE target_type
      WHEN 'project' THEN EXISTS (SELECT 1 FROM projects WHERE id = target_id)
      WHEN 'collaboration' THEN EXISTS (SELECT 1 FROM collaborations WHERE id = target_id)
      WHEN 'partner' THEN EXISTS (SELECT 1 FROM profiles WHERE id = target_id)
    END
  )
);

-- 인덱스
CREATE INDEX idx_user_prefs_profile ON user_preferences(profile_id);
CREATE INDEX idx_user_prefs_target ON user_preferences(target_type, target_id);
CREATE INDEX idx_user_prefs_status ON user_preferences(status);
```

**✅ 장점:**
1. **단일 테이블 관리**: 모든 사용자 선호도를 한 곳에서
2. **통합 조회 용이**:
   ```sql
   -- 사용자가 숨긴/차단한 모든 항목
   SELECT * FROM user_preferences
   WHERE profile_id = $user_id;
   ```
3. **코드 중복 제거**: 1개의 Service/Repository로 관리
4. **확장성**: 새로운 타입 추가 시 ENUM만 추가
   ```sql
   ALTER TYPE preference_target_type ADD VALUE 'event';
   ALTER TYPE preference_target_type ADD VALUE 'magazine';
   ```
5. **일관된 정책**: RLS 정책 1개로 통합

**❌ 단점:**
1. **외래키 제약 약화**: 조건부 체크 제약으로 대체 (덜 엄격함)
2. **타입 안전성 약화**: target_id가 무엇을 참조하는지 런타임에만 확인
3. **쿼리 복잡도 증가**:
   ```sql
   -- 특정 타입만 조회 시 필터 필요
   SELECT * FROM user_preferences
   WHERE profile_id = $user AND target_type = 'project';
   ```
4. **인덱스 효율 감소**: target_type 필터링 필요

---

### 🅱️ Option B: 부분 통합 (활동 vs 파트너)

```sql
-- 1. 활동(project + collaboration) 통합
CREATE TABLE user_activity_preferences (
  profile_id UUID NOT NULL REFERENCES profiles(id),
  activity_type VARCHAR(20) NOT NULL, -- 'project' or 'collaboration'
  activity_id UUID NOT NULL,
  status preference_status NOT NULL DEFAULT 'hidden',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  PRIMARY KEY (profile_id, activity_type, activity_id),

  CONSTRAINT valid_activity_type CHECK (activity_type IN ('project', 'collaboration'))
);

-- 2. 파트너는 분리 유지
CREATE TABLE user_partner_preferences (
  profile_id UUID NOT NULL REFERENCES profiles(id),
  partner_id UUID NOT NULL REFERENCES profiles(id),
  status preference_status NOT NULL DEFAULT 'hidden',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  PRIMARY KEY (profile_id, partner_id)
);
```

**✅ 장점:**
1. **도메인 분리**: 활동 vs 사람 구분 명확
2. **외래키 유지**: partner_id는 명확히 profiles 참조
3. **균형잡힌 접근**: 과도한 통합 회피
4. **projects/collaborations 향후 통합 시 일관성**:
   ```
   activities (통합) ← user_activity_preferences (통합)
   profiles (분리) ← user_partner_preferences (분리)
   ```

**❌ 단점:**
1. **여전히 2개 테이블**: 완전 통합 대비 관리 포인트 존재
2. **통합 조회 시 UNION 필요**:
   ```sql
   SELECT * FROM user_activity_preferences WHERE profile_id = $user
   UNION ALL
   SELECT * FROM user_partner_preferences WHERE profile_id = $user;
   ```

---

### 🅲 Option C: 현재 구조 유지 (3개 분리)

**✅ 장점:**
1. **명확한 타입 안전성**: 각 테이블이 명확한 외래키
2. **쿼리 단순성**: 조인 없이 직접 참조
3. **마이그레이션 불필요**: 현재 코드 그대로
4. **RLS 정책 분리**: 각 테이블마다 세밀한 정책

**❌ 단점:**
1. **100% 코드 중복**: 3개의 Service/Repository
2. **통합 조회 복잡**:
   ```sql
   SELECT 'project' as type, * FROM user_project_preferences
   UNION ALL
   SELECT 'collaboration' as type, * FROM user_collaboration_preferences
   UNION ALL
   SELECT 'partner' as type, * FROM user_partner_preferences;
   ```
3. **확장성 부족**: 새로운 타입마다 테이블 추가
4. **유지보수 비용**: 3개 테이블 동기화

---

## 🔄 projects/collaborations 결정과의 일관성 검토

### ❓ "같은 논리를 적용해야 하는가?"

#### projects/collaborations 결정 근거:
```
✅ 보류 이유:
- 데이터 규모 작음 (< 100건)
- 비즈니스 로직 차이 (브랜드 vs 파트너)
- 마이그레이션 비용 > 효과
- MVP 우선순위
```

#### preferences 상황:
```
❓ 재검토 필요:
- 데이터 규모: 작음 (현재 < 10건)
- 비즈니스 로직: 100% 동일 ⭐
- 구조: 100% 동일 ⭐
- 도메인 복잡도: 매우 낮음 (단순 관계) ⭐
```

### 🎯 핵심 차이점

| 판단 기준 | projects/collaborations | user_*_preferences |
|----------|------------------------|-------------------|
| **비즈니스 로직 차이** | 있음 (브랜드 vs 파트너) | **없음 (완전 동일)** |
| **특화 필드** | 6-8개씩 존재 | **없음 (0개)** |
| **도메인 복잡도** | 높음 (20+ 필드) | **낮음 (6개 필드)** |
| **통합 시 JOIN 증가** | 모든 쿼리 | **영향 없음** |
| **마이그레이션 복잡도** | 높음 (데이터 + 코드) | **낮음 (단순 구조)** |

### 💡 결론: **다른 판단 가능**

> **"projects/collaborations는 복잡한 엔티티라서 분리 유지,
> preferences는 단순한 관계 테이블이라서 통합 고려 가능"**

**이유:**
- preferences는 순수 관계 테이블 (Pure Join Table)
- 비즈니스 로직 없음
- 100% 동일한 구조
- 통합 시 이점 > 비용

---

## 📊 의사결정 매트릭스

### 통합 여부 판단 기준

| 기준 | 임계값 | projects/collaborations | preferences | 통합 권장 |
|------|--------|------------------------|------------|----------|
| 구조 중복도 | > 90% | 85% | **100%** ✅ | preferences ✅ |
| 비즈니스 로직 차이 | 있음 | 있음 ⚠️ | **없음** ✅ | preferences ✅ |
| 특화 필드 수 | < 3개 | 6-8개 ⚠️ | **0개** ✅ | preferences ✅ |
| 도메인 복잡도 | 낮음 | 높음 ⚠️ | **매우 낮음** ✅ | preferences ✅ |
| 마이그레이션 복잡도 | 낮음 | 높음 ⚠️ | **낮음** ✅ | preferences ✅ |

**결론: preferences는 통합 조건 충족 ✅**

---

## 🎯 최종 권장안

### 📌 **Option B: 부분 통합** (추천)

```sql
-- 1. 활동 선호도 통합
CREATE TABLE user_activity_preferences (
  profile_id UUID NOT NULL,
  activity_type VARCHAR(20) NOT NULL,
  activity_id UUID NOT NULL,
  status preference_status NOT NULL DEFAULT 'hidden',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, activity_type, activity_id)
);

-- 2. 파트너 선호도 분리
CREATE TABLE user_partner_preferences (
  -- 현재 구조 유지
);
```

### ✅ 권장 이유

1. **도메인 명확성**:
   - 활동(project/collaboration) vs 사람(partner) 분리
   - 비즈니스 의미가 다름

2. **향후 일관성**:
   - projects/collaborations를 통합하면 → activity_preferences 자연스럽게 매칭
   - profiles는 분리 → partner_preferences 분리 유지

3. **적절한 균형**:
   - 완전 통합(Option A)보다 타입 안전
   - 현재 구조(Option C)보다 중복 제거

4. **마이그레이션 비용 적정**:
   - 2개 테이블만 통합
   - 단순한 구조라 리스크 낮음

---

## 🚀 구현 방안

### Phase 1: 마이그레이션 준비

```sql
-- 1. 새 테이블 생성
CREATE TABLE user_activity_preferences (...);

-- 2. 데이터 이전
INSERT INTO user_activity_preferences
  (profile_id, activity_type, activity_id, status, reason, created_at, updated_at)
SELECT
  profile_id,
  'project' as activity_type,
  project_id as activity_id,
  status, reason, created_at, updated_at
FROM user_project_preferences;

INSERT INTO user_activity_preferences
  (profile_id, activity_type, activity_id, status, reason, created_at, updated_at)
SELECT
  profile_id,
  'collaboration' as activity_type,
  collaboration_id as activity_id,
  status, reason, created_at, updated_at
FROM user_collaboration_preferences;

-- 3. 데이터 검증
SELECT
  (SELECT COUNT(*) FROM user_project_preferences) +
  (SELECT COUNT(*) FROM user_collaboration_preferences) as old_count,
  (SELECT COUNT(*) FROM user_activity_preferences) as new_count;

-- 4. 기존 테이블 백업 및 삭제
ALTER TABLE user_project_preferences RENAME TO user_project_preferences_backup;
ALTER TABLE user_collaboration_preferences RENAME TO user_collaboration_preferences_backup;
```

### Phase 2: 애플리케이션 코드 수정

```typescript
// Before: 2개 Service
class ProjectPreferenceService {
  async hide(profileId: string, projectId: string) {
    await supabase.from('user_project_preferences').insert({
      profile_id: profileId,
      project_id: projectId,
      status: 'hidden'
    });
  }
}

class CollaborationPreferenceService {
  async hide(profileId: string, collaborationId: string) {
    await supabase.from('user_collaboration_preferences').insert({
      profile_id: profileId,
      collaboration_id: collaborationId,
      status: 'hidden'
    });
  }
}

// After: 1개 Service
class ActivityPreferenceService {
  async hide(
    profileId: string,
    activityId: string,
    activityType: 'project' | 'collaboration'
  ) {
    await supabase.from('user_activity_preferences').insert({
      profile_id: profileId,
      activity_type: activityType,
      activity_id: activityId,
      status: 'hidden'
    });
  }

  async getHiddenActivities(profileId: string) {
    // 통합 조회
    const { data } = await supabase
      .from('user_activity_preferences')
      .select('*')
      .eq('profile_id', profileId);

    return data;
  }
}
```

---

## ⚖️ Option A (완전 통합) vs Option B (부분 통합)

### 언제 Option A를 선택해야 하는가?

**Option A 권장 조건:**
- [ ] 새로운 preference 타입이 3개 이상 추가 예정
  - 예: event_preferences, magazine_preferences, campaign_preferences
- [ ] 모든 타입의 선호도를 통합 관리하는 UI 필요
- [ ] 타입에 무관한 통합 통계/분석 필요

**현재 BridgeApp 상황:**
- ❌ 신규 타입 추가 계획 없음
- ❌ 통합 관리 UI 불필요
- ✅ 도메인 분리 (활동 vs 사람) 명확

**결론: Option B가 더 적합**

---

## 📋 최종 의사결정

### ✅ **권장: Option B (부분 통합)**

```
user_activity_preferences (project + collaboration 통합)
user_partner_preferences (분리 유지)
```

### 📊 근거

| 판단 요소 | 평가 | 결론 |
|----------|------|------|
| **구조 중복도** | 100% | ✅ 통합 적합 |
| **비즈니스 로직** | 완전 동일 | ✅ 통합 적합 |
| **도메인 의미** | 활동 vs 사람 (다름) | ✅ 부분 통합 |
| **마이그레이션 비용** | 낮음 (단순 구조) | ✅ 실행 가능 |
| **향후 확장성** | activities 통합 시 일치 | ✅ 일관성 |

### ⚠️ 단, 즉시 적용은 보류

**이유:**
1. **데이터 규모**: 현재 < 10건 (매우 작음)
2. **우선순위**: MVP 기능 완성 우선
3. **일관성**: projects/collaborations도 보류했으므로

### 📅 적용 시점

**조건부 실행:**
- [ ] projects/collaborations를 activities로 통합할 때 **함께 진행**
- [ ] 또는 preference 데이터가 1,000건 이상 누적 시

---

## 📝 TODO Next

### 즉시 (현재)
- [ ] 현재 구조 유지 (Option C)
- [ ] 의사결정 문서화 ✅

### 향후 (projects/collaborations 통합 시)
- [ ] user_activity_preferences 마이그레이션 (Option B)
- [ ] ActivityPreferenceService 구현
- [ ] 기존 테이블 백업 및 삭제

### 모니터링
- [ ] preference 데이터 증가 추이
- [ ] 통합 조회 필요성 재평가

---

## 💎 핵심 인사이트

### 1. **엔티티 vs 관계 테이블은 다르게 판단**

```
엔티티 테이블 (projects, collaborations):
- 복잡한 비즈니스 로직
- 많은 특화 필드
→ 통합 신중히

관계 테이블 (preferences):
- 단순한 연결 정보
- 동일한 구조
→ 통합 적극 고려
```

### 2. **도메인 경계가 판단 기준**

```
활동 선호도 (project + collaboration):
- 같은 도메인 (활동)
→ 통합 ✅

사람 선호도 (partner):
- 다른 도메인 (사람)
→ 분리 ✅
```

### 3. **일관성 ≠ 일률적 적용**

> **"projects/collaborations를 분리했다고 해서
> preferences도 무조건 분리할 필요는 없다.
> 각 테이블의 특성에 따라 다르게 판단한다."**

---

## 📄 최종 정리

### 현재 결정: **Option C (구조 유지)**
- projects/collaborations와 동일한 논리 적용
- MVP 단계에서는 안정성 우선
- 데이터 규모 작음

### 향후 계획: **Option B (부분 통합)**
- projects/collaborations 통합 시 함께 진행
- 또는 데이터 > 1,000건 시
- activities ↔ activity_preferences 일관성 확보

### 핵심 메시지:
> **"지금은 유지, 나중에 통합.
> 단, preferences는 projects보다 통합 우선순위 높음."**
