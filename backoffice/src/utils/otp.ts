/**
 * 2FA OTP 생성 및 검증 유틸리티
 */

// OTP 생성 (6자리 숫자)
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP 저장 (세션 스토리지)
export function storeOTP(otp: string): void {
  try {
    sessionStorage.setItem('admin_otp', otp);
    sessionStorage.setItem('admin_otp_expiry', (Date.now() + 5 * 60 * 1000).toString()); // 5분 유효
  } catch (error) {
    console.error('OTP 저장 실패:', error);
  }
}

// OTP 검증
export function verifyOTP(inputOTP: string): boolean {
  try {
    const storedOTP = sessionStorage.getItem('admin_otp');
    const expiry = sessionStorage.getItem('admin_otp_expiry');
    
    if (!storedOTP || !expiry) {
      return false;
    }
    
    const now = Date.now();
    if (now > parseInt(expiry, 10)) {
      // 만료된 OTP 제거
      clearOTP();
      return false;
    }
    
    if (storedOTP !== inputOTP) {
      return false;
    }
    
    // 검증 성공 시 OTP 제거
    clearOTP();
    return true;
  } catch (error) {
    console.error('OTP 검증 실패:', error);
    return false;
  }
}

// OTP 제거
export function clearOTP(): void {
  try {
    sessionStorage.removeItem('admin_otp');
    sessionStorage.removeItem('admin_otp_expiry');
  } catch (error) {
    console.error('OTP 제거 실패:', error);
  }
}

