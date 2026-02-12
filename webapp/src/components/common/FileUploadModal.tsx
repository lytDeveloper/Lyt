import { useState, useRef, type DragEvent, useEffect, useMemo } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Radio,
  TextField,
  Button,
  Avatar,
  Backdrop,
  useTheme,
} from '@mui/material';
import { LightningLoader } from './index';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import type { Project } from '../../services/projectService';
import type { Collaboration } from '../../services/collaborationService';
import { useProfileStore } from '../../stores/profileStore';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
type EntityType = 'project' | 'collaboration';

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  entity: Project | Collaboration;
  entityType: EntityType;
  isUploading?: boolean;
  onUploadSuccess: (files: File[], description: string, sharedWith: 'all' | string[]) => void;
}

export default function FileUploadModal({
  open,
  onClose,
  entity,
  entityType,
  isUploading = false,
  onUploadSuccess,
}: FileUploadModalProps) {
  const theme = useTheme();
  const fanProfile = useProfileStore((state) => state.fanProfile);
  const nonFanProfile = useProfileStore((state) => state.nonFanProfile);
  const [shareTarget, setShareTarget] = useState<'all' | 'individual'>('individual');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayAvatar =
    entityType === 'collaboration'
      ? (entity as Collaboration)?.display?.displayAvatar
      : (entity as Project)?.display?.displayAvatar || (entity as Project)?.team?.leaderAvatar;
  const activeAvatar =
    (nonFanProfile as any)?.record?.avatar_url ||
    (nonFanProfile as any)?.record?.logo_image_url ||
    (fanProfile as any)?.avatar_url ||
    displayAvatar ||
    undefined;
  // Common member type for both project and collaboration
  interface DisplayMember {
    id?: string;
    name: string;
    profileImageUrl?: string;
    activityField?: string;
    userId?: string;
    isLeader?: boolean;
  }

  // Get members based on entity type
  const getMembers = (): DisplayMember[] => {
    if (entityType === 'project') {
      const project = entity as Project;
      // Include leader as a member
      const allMembers: DisplayMember[] = [];
      if (project.team) {
        // Add leader
        allMembers.push({
          id: project.team.leaderId,
          userId: project.team.leaderId,
          name: project.team.leaderName,
          profileImageUrl: project.team.leaderAvatar || activeAvatar,
          activityField: project.team.leaderField,
          isLeader: true,
        });
        // Add other members
        if (project.team.members) {
          allMembers.push(...project.team.members.map(m => ({
            id: m.id,
            userId: m.id,
            name: m.name,
            profileImageUrl: m.profileImageUrl,
            activityField: m.activityField,
            isLeader: false,
          })));
        }
      }
      return allMembers;
    } else {
      const collaboration = entity as Collaboration;
      return (collaboration.members || []).map(m => ({
        id: m.id,
        userId: m.userId,
        name: m.name,
        profileImageUrl: m.profileImageUrl || (m.isLeader ? activeAvatar : undefined),
        activityField: m.activityField,
        isLeader: m.isLeader,
      }));
    }
  };

  const members = getMembers();
  // If there are no members (e.g., solo upload by brand/artist), seed with active profile info
  const membersWithSelf =
    members.length > 0
      ? members
      : [
        {
          id: nonFanProfile?.record.profile_id || undefined,
          userId: nonFanProfile?.record.profile_id || undefined,
          name:
            (nonFanProfile?.type === 'brand' && nonFanProfile.record.brand_name) ||
            (nonFanProfile?.type === 'artist' && nonFanProfile.record.artist_name) ||
            (nonFanProfile?.type === 'creative' && nonFanProfile.record.nickname) ||
            fanProfile?.nickname ||
            '나',
          profileImageUrl: activeAvatar,
          activityField: '',
          isLeader: true,
        },
      ];

  const leaderMember = membersWithSelf.find(m => m.isLeader);
  const nonLeaderMembers = membersWithSelf.filter(m => !m.isLeader);
  const displayMembers = nonLeaderMembers.slice(0, 3);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      addFiles(newFiles);
    }
    // Reset input value to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      addFiles(newFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > 3) {
        alert('최대 3개의 파일까지 업로드 가능합니다.');
        return combined.slice(0, 3);
      }
      return combined;
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle member selection
  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Handle submit
  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      alert('파일을 선택해주세요');
      return;
    }

    if (shareTarget === 'individual' && selectedMembers.length === 0) {
      alert('공유할 팀원을 선택해주세요');
      return;
    }

    const sharedWith = shareTarget === 'all' ? 'all' : selectedMembers;
    onUploadSuccess(selectedFiles, description, sharedWith);
    handleClose();
  };

  // Handle close
  const handleClose = () => {
    // Revoke all blob URLs before closing
    previewUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    setShareTarget('individual');
    setSelectedMembers([]);
    setSelectedFiles([]);
    setDescription('');
    setIsDragging(false);
    onClose();
  };

  // Create and manage blob URLs for image previews
  const previewUrls = useMemo(() => {
    const urls: Map<File, string> = new Map();
    selectedFiles.forEach((file) => {
      if (file.type.includes('image')) {
        urls.set(file, URL.createObjectURL(file));
      }
    });
    return urls;
  }, [selectedFiles]);

  // Clean up object URLs when files change or component unmounts
  useEffect(() => {
    const currentUrls = previewUrls;
    return () => {
      // Revoke all URLs when component unmounts or files change
      currentUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewUrls]);

  // Helper to get file icon based on type
  const getFileIcon = (file: File) => {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.includes('image')) {
      // This should not be used for images anymore, but keeping for non-image files
      return null;
    }
    if (type.includes('pdf')) {
      return <PictureAsPdfIcon sx={{ fontSize: 32, color: '#F40F02' }} />;
    }
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      return <DescriptionIcon sx={{ fontSize: 32, color: '#2B579A' }} />;
    }
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
      return <DescriptionIcon sx={{ fontSize: 32, color: '#217346' }} />;
    }
    return <InsertDriveFileIcon sx={{ fontSize: 32, color: '#757575' }} />;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            margin: 2,
            maxHeight: 'calc(100vh - 64px)',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            파일 공유
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ px: 3, py: 3, overflowY: 'auto' }}>
          {/* Entity Info Card */}
          <Box
            sx={{
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              p: 2,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                color: theme.palette.text.primary,
                mb: 1,
              }}
            >
              {entity.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Leader Avatar */}
              {leaderMember && (
                <Avatar
                  src={leaderMember.profileImageUrl}
                  sx={{ width: 24, height: 24, border: '2px solid white' }}
                />
              )}
              {/* Team Members (first 3) */}
              {displayMembers.map((member, index) => (
                <Avatar
                  key={index}
                  src={member.profileImageUrl}
                  sx={{
                    width: 24,
                    height: 24,
                    marginLeft: '-8px',
                    border: '2px solid white',
                  }}
                />
              ))}
              <Typography
                sx={{
                  ml: 1,
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                }}
              >
                {members.length}명
              </Typography>
            </Box>
          </Box>

          {/* Share Target Section */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: 2,
            }}
          >
            공유 대상
          </Typography>

          {/* All Team Option */}
          <Box
            onClick={() => {
              setShareTarget('all');
              setSelectedMembers([]);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              mb: 2,
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              cursor: 'pointer',
            }}
          >
            <Radio checked={shareTarget === 'all'} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {displayMembers.map((member, index) => (
                <Avatar
                  key={index}
                  src={member.profileImageUrl}
                  sx={{
                    width: 28,
                    height: 28,
                    marginLeft: index > 0 ? '-8px' : 0,
                    border: '2px solid white',
                  }}
                />
              ))}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.palette.text.primary,
                }}
              >
                전체 팀
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                }}
              >
                모든 팀원에게 공유
              </Typography>
            </Box>
          </Box>

          {/* Individual Members Section */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 13,
              color: theme.palette.text.secondary,
              mb: 1.5,
            }}
          >
            개별 팀원 선택:
          </Typography>

          {/* Individual Member Cards */}
          {nonLeaderMembers.map((member, index: number) => {
            const memberId = member.userId || member.id || `member-${index}`;
            const isSelected = selectedMembers.includes(memberId);
            return (
              <Box
                key={memberId}
                onClick={() => {
                  setShareTarget('individual');
                  handleMemberToggle(memberId);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  mb: 1.5,
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  cursor: 'pointer',
                }}
              >
                <Radio checked={shareTarget === 'individual' && isSelected} />
                <Avatar src={member.profileImageUrl} sx={{ width: 36, height: 36 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {member.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'Pretendard, sans-serif',
                      fontSize: 12,
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {member.activityField}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          {/* Selected Members Count */}
          {shareTarget === 'individual' && (
            <Box
              sx={{
                backgroundColor: theme.palette.grey[100],
                borderRadius: '12px',
                p: 2,
                mb: 3,
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 13,
                  color: theme.palette.text.secondary,
                  textAlign: 'center',
                }}
              >
                선택된 멤버: {selectedMembers.length}명
              </Typography>
            </Box>
          )}

          {/* File Selection Area */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 2,
            }}
          >
            파일 선택
          </Typography>

          {/* Main Dropzone */}
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => selectedFiles.length < 3 && fileInputRef.current?.click()}
            sx={{
              border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
              borderRadius: '12px',
              p: 4,
              mb: 2,
              cursor: selectedFiles.length < 3 ? 'pointer' : 'default',
              backgroundColor: isDragging ? theme.palette.action.selected : '#FAFAFA',
              transition: 'all 0.2s ease',
              opacity: selectedFiles.length >= 3 ? 0.5 : 1,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: 'none' }}
              disabled={selectedFiles.length >= 3}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 30, color: theme.palette.icon.inner }} />
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                {selectedFiles.length >= 3
                  ? '최대 3개까지 업로드 가능합니다'
                  : '파일을 선택하거나 드래그하세요'}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'Pretendard, sans-serif',
                  fontSize: 12,
                  color: theme.palette.text.secondary,
                }}
              >
                PDF, DOC, XLS, PPT, 이미지, 압축파일 등
              </Typography>
            </Box>
          </Box>

          {/* 3 Small Upload Boxes */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[0, 1, 2].map((index) => {
              const file = selectedFiles[index];
              const isImage = file && file.type.includes('image');
              const previewUrl = isImage && file ? previewUrls.get(file) || '' : '';

              return (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    height: 100,
                    borderRadius: '12px',
                    border: '1px dashed #D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: file ? '#fff' : '#FAFAFA',
                  }}
                >
                  {file ? (
                    <>
                      {/* Delete Button */}
                      <IconButton
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 24,
                          height: 24,
                          padding: 0,
                          backgroundColor: theme.palette.transparent.white,
                          border: `1px solid ${theme.palette.transparent.white}`,
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          color: theme.palette.icon.default,
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          zIndex: 10,
                        }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 16 }} />
                      </IconButton>

                      {/* Content */}
                      {isImage ? (
                        <Box
                          component="img"
                          src={previewUrl}
                          alt={file.name}
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                            p: 1,
                          }}
                        >
                          {getFileIcon(file)}
                          <Typography
                            sx={{
                              fontFamily: 'Pretendard, sans-serif',
                              fontSize: 10,
                              color: theme.palette.text.secondary,
                              textAlign: 'center',
                              wordBreak: 'break-all',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {file.name}
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <CloudUploadIcon sx={{ fontSize: 24, color: theme.palette.divider }} />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Description Input */}
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 14,
              fontWeight: 500,
              color: theme.palette.text.primary,
              mb: 1,
            }}
          >
            설명 (선택사항)
          </Typography>
          <TextField
            multiline
            rows={3}
            placeholder="파일에 대한 간단한 설명을 작성해주세요..."
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            fullWidth
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Pretendard, sans-serif',
                fontSize: 14,
                borderRadius: '12px',
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              color: theme.palette.text.secondary,
              textAlign: 'left',
            }}
          >
            선택된 {selectedMembers.length}명에게 공유됩니다.
          </Typography>
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 12,
              color: theme.palette.text.secondary,
              textAlign: 'right',
            }}
          >
            {description.length}/200
          </Typography>
        </Box>

        {/* Footer Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            px: 3,
            py: 2,
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            fullWidth
            sx={{
              height: 40,
              borderRadius: '30px',
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              textTransform: 'none',
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            fullWidth
            disabled={selectedFiles.length === 0}
            sx={{
              height: 40,
              borderRadius: '30px',
              backgroundColor: theme.palette.primary.main,
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 16,
              fontWeight: 500,
              textTransform: 'none',
              '&:disabled': {
                backgroundColor: theme.palette.divider,
                color: theme.palette.text.secondary,
                opacity: 0.5,
              },
            }}
          >
            파일공유
          </Button>
        </Box>
      </Dialog>

      {/* Upload Loading Backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.modal + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        open={isUploading}
      >
        <LightningLoader size={60} color="inherit" />
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: '#fff',
          }}
        >
          파일 업로드 중...
        </Typography>
      </Backdrop>
    </>
  );
}
