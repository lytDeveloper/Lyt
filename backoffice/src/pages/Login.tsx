import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { sendPasswordReset, signIn } from '../utils/auth';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      message.success('로그인 성공!');
      navigate('/');
    } catch (error) {
      console.error('로그인 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    // Form에서 이메일 값 가져오기
    const email = form.getFieldValue('email');
    
    // 이메일 검증
    if (!email || !email.trim()) {
      message.warning('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      message.warning('올바른 이메일 형식이 아닙니다.');
      return;
    }

    // 이메일을 localStorage에 저장하여 PasswordReset 페이지에서 사용할 수 있도록 함
    localStorage.setItem('passwordResetEmail', email.trim());

    setResetLoading(true);
    try {
      await sendPasswordReset(email.trim());
      message.success('비밀번호 재설정 이메일이 전송되었습니다.');
      // 성공 후 PasswordReset 페이지로 이동
      navigate('/auth/reset');
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('비밀번호 재설정 요청 실패:', error);
      
      // 429 에러 또는 rate limit 에러 처리
      if (error?.status === 429 || error?.message?.includes('48 seconds')) {
        const waitTimeMatch = error?.message?.match(/(\d+)\s*seconds?/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : '48';
        message.error(`너무 많은 요청이 발생했습니다. ${waitTime}초 후 다시 시도해주세요.`);
      } else if (error?.message?.includes('For security purposes')) {
        const waitTimeMatch = error?.message?.match(/(\d+)\s*seconds?/i);
        const waitTime = waitTimeMatch ? waitTimeMatch[1] : '48';
        message.error(`보안을 위해 ${waitTime}초 후에만 요청할 수 있습니다. 잠시 후 다시 시도해주세요.`);
      } else {
        // 에러가 발생해도 페이지로 이동 (이메일 재전송을 위해)
        message.warning('이메일 전송에 문제가 있을 수 있지만, 비밀번호 재설정 페이지로 이동합니다.');
        navigate('/auth/reset');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      minWidth: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{
          width: 400,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Lyt 백오피스
          </Title>
          <Typography.Text type="secondary">
            관리자 로그인
          </Typography.Text>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="이메일"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="비밀번호"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 48 }}
            >
              로그인
            </Button>
            <Button 
              style={{ marginTop: '12px' }}
              type="link"
              htmlType="button"
              onClick={handlePasswordReset}
              loading={resetLoading}
              disabled={resetLoading}
            >
              비밀번호 최초 설정(이메일만 입력 후 클릭)
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

