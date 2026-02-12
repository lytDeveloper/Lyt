# Supabase Storage 버킷 설정 가이드

파일 업로드 기능을 사용하려면 Supabase Storage에 버킷을 생성해야 합니다.

## 필요한 버킷

1. **project-files** - 프로젝트 파일 저장용
2. **collaboration-files** - 협업 파일 저장용

## 버킷 생성 방법

### 1. Supabase Dashboard 접속
1. https://supabase.com 에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 `Storage` 클릭

### 2. 버킷 생성

#### project-files 버킷
1. `Create a new bucket` 버튼 클릭
2. 버킷 설정:
   - **Name**: `project-files`
   - **Public bucket**: ✅ 체크 (파일 다운로드를 위해 public 필요)
   - **File size limit**: 50MB (권장)
   - **Allowed MIME types**: 제한 없음 또는 필요시 설정
3. `Create bucket` 클릭

#### collaboration-files 버킷
1. `Create a new bucket` 버튼 클릭
2. 버킷 설정:
   - **Name**: `collaboration-files`
   - **Public bucket**: ✅ 체크
   - **File size limit**: 50MB (권장)
   - **Allowed MIME types**: 제한 없음 또는 필요시 설정
3. `Create bucket` 클릭

### 3. 정책 (Policies) 설정

각 버킷에 대해 다음 정책을 추가하세요:

#### 업로드 정책 (INSERT)
```sql
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files' OR bucket_id = 'collaboration-files');
```

#### 다운로드 정책 (SELECT)
```sql
CREATE POLICY "Public can download files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-files' OR bucket_id = 'collaboration-files');
```

#### 삭제 정책 (DELETE)
```sql
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' OR bucket_id = 'collaboration-files');
```

## 폴더 구조

파일은 다음과 같은 구조로 저장됩니다:

```
project-files/
├── projects/
│   ├── {projectId}/
│   │   ├── {timestamp}-{filename}.pdf
│   │   ├── {timestamp}-{filename}.jpg
│   │   └── ...

collaboration-files/
├── collaborations/
│   ├── {collaborationId}/
│   │   ├── {timestamp}-{filename}.pdf
│   │   ├── {timestamp}-{filename}.docx
│   │   └── ...
```

## 검증

버킷이 제대로 생성되었는지 확인:

1. Storage 메뉴에서 버킷 목록 확인
2. `project-files`와 `collaboration-files` 버킷이 보이면 성공
3. 각 버킷을 클릭해서 `Policies` 탭에서 정책이 적용되었는지 확인

## 트러블슈팅

### 파일 업로드 실패
- 버킷이 생성되었는지 확인
- 버킷 이름이 정확한지 확인 (`project-files`, `collaboration-files`)
- 업로드 정책이 설정되었는지 확인

### 파일 다운로드 실패
- 버킷이 public으로 설정되었는지 확인
- 다운로드 정책이 설정되었는지 확인

### 권한 오류
- 사용자가 로그인되었는지 확인
- INSERT/SELECT/DELETE 정책이 올바르게 설정되었는지 확인

## 참고사항

- 파일 크기 제한은 Supabase 요금제에 따라 다를 수 있습니다
- 프로덕션 환경에서는 더 세밀한 정책 설정을 권장합니다
- 파일 타입 제한이 필요한 경우 MIME type 설정을 추가하세요
