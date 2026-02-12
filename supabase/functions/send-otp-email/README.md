# Send OTP Email Edge Function

관리자 2단계 인증을 위한 OTP 코드 이메일 전송 Edge Function입니다.

## 배포 방법

1. Supabase CLI 설치 (아직 설치하지 않은 경우)
```bash
npm install supabase
```

2. Supabase 프로젝트에 로그인
```bash
supabase login
```

3. 프로젝트 링크
```bash
supabase link --project-ref your-project-ref
```

4. Edge Function 배포
```bash
supabase functions deploy send-otp-email
```

## 환경 변수 설정

Supabase Dashboard > Project Settings > Edge Functions > Secrets에서 다음 환경 변수를 설정해야 합니다:

- `RESEND_API_KEY`: Resend API 키 (https://resend.com 에서 발급)
- `FROM_EMAIL`: 발신 이메일 주소 (예: noreply@yourdomain.com)
- `SUPABASE_URL`: Supabase 프로젝트 URL (자동 설정됨)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role 키 (자동 설정됨)

## Resend 설정

1. https://resend.com 에서 계정 생성
2. API 키 발급
3. 도메인 추가 및 DNS 설정 (프로덕션 환경)
4. 개발 환경에서는 Resend의 테스트 도메인 사용 가능

## 테스트

Edge Function 배포 후, Supabase Dashboard > Edge Functions에서 테스트할 수 있습니다.

