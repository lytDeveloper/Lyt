import { Box, Typography, TextField, useTheme } from '@mui/material';
import { usePartnershipStore } from '../../../stores/usePartnershipStore';
import FileDropzone from '../../../components/inquiry/FileDropzone';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';


export default function CreatePartnershipInquiryStep3() {
    const { data, updateData, setFiles } = usePartnershipStore();
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box
                sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2.5 }}>
                    프로젝트 상세 내용을 작성해주세요
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                    {/* Description */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            프로젝트 설명 *
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            placeholder="프로젝트에 대한 상세한 설명을 작성해주세요"
                            value={data.description}
                            onChange={(e) => updateData({ description: e.target.value })}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    {/* Goals */}
                    <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                            프로젝트 목표 *
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="이 프로젝트를 통해 달성하고자 하는 목표를 작성해주세요"
                            value={data.goals}
                            onChange={(e) => updateData({ goals: e.target.value })}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    {/* Experience (Optional) */}
                    <Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                협업 경험
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: '#9CA3AF' }}>(선택)</Typography>
                        </Box>
                        <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="이전 협업 경험이나 특별히 전달하고 싶은 내용이 있다면 작성해주세요"
                            value={data.experience}
                            onChange={(e) => updateData({ experience: e.target.value })}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                        />
                    </Box>

                    {/* File Upload (Optional) */}
                    <Box>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                                첨부 파일
                            </Typography>
                            <Typography sx={{ fontSize: 14, color: '#9CA3AF' }}>(선택)</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: '#6B7280', mb: 1 }}>
                            최대 10MB, PDF, 이미지, 문서 파일
                        </Typography>

                        <FileDropzone
                            files={data.files}
                            onFilesChange={setFiles}
                        />

                        <Box sx={{ p: 1.5, backgroundColor: theme.palette.grey[50], borderRadius: '8px', mt: 2 }}>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                <ErrorOutlineRoundedIcon sx={{ fontSize: 16, color: theme.palette.icon.default }} />
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#4B5563' }}>
                                    파일 업로드 가이드라인
                                </Typography>
                            </Box>

                            <Typography sx={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>
                                • 파일 크기: 개별 파일당 최대 10MB<br />
                                • 지원 형식: PDF, Word, PowerPoint, Excel, 이미지 파일<br />
                                • 추천 파일: 회사 소개서, 포트폴리오, 기획서, 레퍼런스 이미지<br />
                                • 개인정보가 포함된 파일은 업로드하지 마세요.
                            </Typography>
                        </Box>
                    </Box>

                </Box>
            </Box>
        </Box>
    );
}

