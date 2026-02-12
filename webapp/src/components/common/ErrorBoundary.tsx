import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100vh',
                        gap: 2,
                        px: 2,
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="h6">페이지를 불러오는 중 오류가 발생했어요.</Typography>
                    <Typography variant="body2" color="text.secondary">
                        네트워크 상태를 확인한 뒤 다시 시도해주세요.
                    </Typography>
                    {/* 임시: 에러 상세 표시 (디버깅 후 조건 복원 필요) */}
                    {this.state.error && (
                        <Box sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: '#fee',
                            borderRadius: 1,
                            maxWidth: '90%',
                            overflow: 'auto',
                            maxHeight: '200px',
                        }}>
                            <Typography variant="caption" color="error" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
                            </Typography>
                        </Box>
                    )}
                    <Button variant="contained" onClick={this.handleRetry}>
                        새로고침
                    </Button>
                </Box>
            );
        }
        return this.props.children;
    }
}
