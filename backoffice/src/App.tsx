import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Approvals from './pages/Approvals';
import AdminManagement from './pages/AdminManagement';
import AdminActivityLogs from './pages/AdminActivityLogs';
import Notifications from './pages/Notifications';
import HomepageManagement from './pages/HomepageManagement';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PasswordReset from './pages/PasswordReset';
import Inquiries from './pages/Inquiries';
import Feedbacks from './pages/Feedbacks';
import Reports from './pages/Reports';
import ProjectsCollaborations from './pages/ProjectsCollaborations';
import MagazineManagement from './pages/MagazineManagement';
import AccountDeletions from './pages/AccountDeletions';
import '@ant-design/v5-patch-for-react-19';
function App() {
  // Ant Design React 19 호환성 경고 필터링
  if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      // Ant Design v5 React 19 호환성 경고 무시
      if (
        args[0]?.includes?.('[antd: compatible]') ||
        args[0]?.includes?.('antd v5 support React is 16 ~ 18')
      ) {
        return;
      }
      originalWarn(...args);
    };
  }

  return (
    <ConfigProvider locale={koKR}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            {/* 로그인 페이지 */}
            <Route path="/login" element={<Login />} />
            {/* 비밀번호 재설정 */}
            <Route path="/auth/reset" element={<PasswordReset />} />

            {/* 보호된 라우트 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* 대시보드 */}
              <Route index element={<Dashboard />} />

              {/* 사용자 관리 */}
              <Route path="users" element={<Users />} />

              {/* 문의 관리 */}
              <Route path="inquiries" element={<Inquiries />} />

              {/* 피드백 관리 */}
              <Route path="feedbacks" element={<Feedbacks />} />

              {/* 신고 관리 */}
              <Route path="reports" element={<Reports />} />

              {/* 계정 삭제 요청 관리 */}
              <Route path="account-deletions" element={<AccountDeletions />} />

              {/* 프로젝트/협업 관리 */}
              <Route path="projects" element={<ProjectsCollaborations />} />

              {/* 승인 관리 */}
              <Route path="approvals" element={<Approvals />} />
              {/* 활동 로그 */}
              <Route path="logs" element={<AdminActivityLogs />} />
              {/* 공지/업데이트 */}
              <Route path="notifications" element={<Notifications />} />

              {/* 라잇 화면 관리 */}
              <Route path="homepage" element={<HomepageManagement />} />

              {/* 매거진 관리 */}
              <Route path="magazines" element={<MagazineManagement />} />

              {/* 관리자 관리 (super_admin만 접근 가능) */}
              <Route path="admins" element={<AdminManagement />} />
            </Route>

            {/* 404 처리 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
