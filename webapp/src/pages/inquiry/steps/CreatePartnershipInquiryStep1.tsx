import { Box, Typography, TextField } from '@mui/material';
import { usePartnershipStore } from '../../../stores/usePartnershipStore';
import { validateEmail } from '../../../utils/validation';
import { useState } from 'react';

export default function CreatePartnershipInquiryStep1() {
    const { data, updateData } = usePartnershipStore();

    // Local error states
    const [errors, setErrors] = useState({
        email: '',
        phone: ''
    });

    // Validate on change or blur
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        updateData({ email: val });
        if (val && validateEmail(val)) {
            setErrors(prev => ({ ...prev, email: validateEmail(val) || '' }));
        } else {
            setErrors(prev => ({ ...prev, email: '' }));
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // 숫자만 추출
        const numbersOnly = val.replace(/\D/g, '');
        // 최대 11자리로 제한
        const limitedValue = numbersOnly.slice(0, 11);
        updateData({ phone: limitedValue });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    backgroundColor: '#fff',
                    boxShadow: '0 0px 1px rgba(0,0,0,0.3)',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                    기본 정보를 입력해주세요
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Company Name */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            소속 단체 *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="회사명을 입력해주세요"
                            value={data.companyName}
                            onChange={(e) => updateData({ companyName: e.target.value })}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Box>

                    {/* Name */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            이름 *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="담당자명을 입력해주세요"
                            value={data.contactName}
                            onChange={(e) => updateData({ contactName: e.target.value })}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Box>

                    {/* Email */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            이메일 *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="이메일을 입력해주세요"
                            value={data.email}
                            onChange={handleEmailChange}
                            error={!!errors.email}
                            helperText={errors.email}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Box>

                    {/* Phone */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            연락처 *
                        </Typography>
                        <TextField
                            fullWidth
                            placeholder="연락처를 입력해주세요(숫자만 입력)"
                            value={data.phone}
                            onChange={handlePhoneChange}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '12px' }
                            }}
                        />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}

