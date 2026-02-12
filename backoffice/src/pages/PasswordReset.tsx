import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import { sendPasswordReset } from '../utils/auth';

export default function PasswordReset() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  // Supabase onAuthStateChange로 PASSWORD_RECOVERY 이벤트 감지
  useEffect(() => {
    let mounted = true;
    let recoveryDetected = false;

    // 1. 먼저 URL 해시에서 토큰 확인 (초기 로드 시)
    const hash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(location.search);
    
    const type = hashParams.get('type') || searchParams.get('type');
    const hasAccessToken = !!(hashParams.get('access_token') || searchParams.get('access_token'));
    
    if (type === 'recovery' && hasAccessToken) {
      recoveryDetected = true;
      if (mounted) {
        setIsRecoveryFlow(true);
        setCheckingToken(false);
      }
    }

    // 2. Supabase onAuthStateChange로 PASSWORD_RECOVERY 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'PASSWORD_RECOVERY') {
        recoveryDetected = true;
        if (mounted) {
          setIsRecoveryFlow(true);
          setCheckingToken(false);
          toast.success('비밀번호 재설정 링크를 확인했습니다. 새 비밀번호를 설정해주세요.');
        }
      }
    });

    // 3. 토큰이 없는 경우 처리 (약간의 지연 후)
    const timer = setTimeout(() => {
      if (!recoveryDetected && mounted) {
        // localStorage에서 이메일 가져오기 (Login 페이지에서 설정된 경우)
        const storedEmail = localStorage.getItem('passwordResetEmail');
        if (storedEmail) {
          setEmail(storedEmail);
          setEmailSent(true);
          localStorage.removeItem('passwordResetEmail');
        }
        setCheckingToken(false);
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 의존성 배열을 비워서 마운트 시 한 번만 실행

  const handleResendEmail = async () => {
    if (!email || !email.trim()) {
      toast.warning('이메일을 입력해주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.warning('올바른 이메일 형식이 아닙니다.');
      return;
    }

    setResendLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setEmailSent(true);
      toast.success('비밀번호 재설정 이메일이 다시 전송되었습니다.');
    } catch (error: unknown) {
      console.error('이메일 재전송 실패:', error);
      
      const errorMessage = error instanceof Error ? error.message : '';
      const errorStatus = (error as { status?: number })?.status;
      
      if (errorStatus === 429 || errorMessage.includes('48 seconds')) {
        const waitTimeMatch = errorMessage.match(/(\d+)\s*seconds?/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : '48';
        toast.error(`너무 많은 요청이 발생했습니다. ${waitTime}초 후 다시 시도해주세요.`);
      } else if (errorMessage.includes('For security purposes')) {
        const waitTimeMatch = errorMessage.match(/(\d+)\s*seconds?/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : '48';
        toast.error(`보안을 위해 ${waitTime}초 후에만 요청할 수 있습니다.`);
      } else {
        toast.error(errorMessage || '이메일 전송에 실패했습니다.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const onFinish = async (values: { password: string; confirm: string }) => {
    if (values.password !== values.confirm) {
      toast.error('비밀번호가 일치하지 않습니다.');
      return;
    }
    setSubmitting(true);
    try {
      // 토큰은 자동으로 세션에 반영되며, 여기서 비밀번호를 업데이트
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      toast.success('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '비밀번호 변경 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 로딩 중일 때
  if (checkingToken) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        minWidth: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Card style={{ width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Typography.Text>링크 확인 중...</Typography.Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      minWidth: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>비밀번호 재설정</Typography.Title>
          <Typography.Text type="secondary">
            {isRecoveryFlow 
              ? '새 비밀번호를 설정하세요.'
              : '이메일로 받은 링크를 클릭하거나, 아래에서 이메일을 다시 보낼 수 있습니다.'}
          </Typography.Text>
        </div>

        {/* 토큰이 없는 경우: 이메일 재전송 */}
        {!isRecoveryFlow && (
          <>
            {emailSent ? (
              <Alert
                message="이메일이 전송되었습니다"
                description={`${email}로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인하고 링크를 클릭해주세요.`}
                type="success"
                showIcon
                style={{ marginBottom: 24 }}
                action={
                  <Button 
                    size="small" 
                    onClick={handleResendEmail}
                    loading={resendLoading}
                  >
                    다시 보내기
                  </Button>
                }
              />
            ) : (
              <div style={{ marginBottom: 24 }}>
                <Input
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ marginBottom: 12 }}
                  size="large"
                />
                <Button 
                  type="primary" 
                  block 
                  onClick={handleResendEmail}
                  loading={resendLoading}
                  size="large"
                >
                  비밀번호 재설정 이메일 보내기
                </Button>
              </div>
            )}
          </>
        )}

        {/* 토큰이 있는 경우에만 비밀번호 변경 폼 표시 */}
        {isRecoveryFlow && (
          <Form layout="vertical" onFinish={onFinish} autoComplete="off">
            <Form.Item
              label="새 비밀번호"
              name="password"
              rules={[
                { required: true, message: '새 비밀번호를 입력해주세요.' }, 
                { min: 8, message: '8자 이상 입력해주세요.' }
              ]}
            >
              <Input.Password placeholder="새 비밀번호" />
            </Form.Item>

            <Form.Item
              label="새 비밀번호 확인"
              name="confirm"
              dependencies={["password"]}
              rules={[
                { required: true, message: '비밀번호를 다시 한 번 입력해주세요.' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="새 비밀번호 확인" />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={submitting} block style={{ height: 44 }}>
              비밀번호 변경
            </Button>
          </Form>
        )}

        <Button 
          style={{ marginTop: 12 }} 
          block 
          onClick={() => navigate('/login')}
        >
          로그인으로 돌아가기
        </Button>
      </Card>
    </div>
  );
}














