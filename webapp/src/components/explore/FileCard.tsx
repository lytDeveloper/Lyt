import { useState } from 'react';
import { Box, Typography, IconButton, useTheme, type Theme } from '@mui/material';
import { LightningLoader } from '../common';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import DescriptionIcon from '@mui/icons-material/Description';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ImageIcon from '@mui/icons-material/Image';
import type { ProjectFile } from '../../services/exploreService';
import { fileUploadService } from '../../services/fileUploadService';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ConfirmDialog from '../common/ConfirmDialog';
import { formatDateShort } from '../../utils/formatters';
interface FileCardProps {
  file: ProjectFile;
  expandedFileId?: string | null;
  onExpand?: (fileId: string | null) => void;
  canDownload?: boolean;
  disableReason?: string;
  canDelete?: boolean;
  onDelete?: (fileId: string) => void;
}

// File icon based on type (moved inside component to access theme)
const getFileIcon = (fileType: ProjectFile['type'] | null, themeInstance: Theme) => {
  const iconProps = {
    sx: {
      fontSize: 32,
      color: themeInstance.palette.primary.main,
    },
  };
  const iconDefault = {
    sx: {
      fontSize: 22,
      color: themeInstance.palette.icon.default,
    },
  };

  switch (fileType) {
    case 'pdf':
      return <PictureAsPdfIcon {...iconProps} />;
    case 'doc':
      return <DescriptionIcon {...iconProps} />;
    case 'zip':
      return <FolderZipIcon {...iconProps} />;
    case 'ai':
    case 'psd':
    case 'jpg':
    case 'png':
      return <ImageIcon {...iconProps} />;
    case 'mp4':
    case 'mov':
    case 'avi':
      return <VideoFileIcon {...iconProps} />;
    case 'mp3':
      return <AudioFileIcon {...iconProps} />;
    default:
      return <InsertDriveFileOutlinedIcon {...iconDefault} />;
  }
};

export default function FileCard({
  file,
  expandedFileId,
  onExpand,
  canDownload = true,
  disableReason,
  canDelete = false,
  onDelete,
}: FileCardProps) {
  const theme = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isExpanded = expandedFileId === file.id;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDownload) {
      alert(disableReason || '참여 중인 멤버만 파일을 다운로드할 수 있어요.');
      return;
    }
    try {
      setIsDownloading(true);
      await fileUploadService.downloadFile(file.url, file.name);
    } catch (error) {
      console.error('[FileCard] Download failed:', error);
      alert('파일 다운로드에 실패했어요.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCardClick = () => {
    if (!file.description) return;
    if (onExpand) {
      onExpand(isExpanded ? null : file.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete || !onDelete) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!canDelete || !onDelete) return;

    try {
      setIsDeleting(true);
      onDelete(file.id);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('[FileCard] Delete failed:', error);
      alert('파일 삭제에 실패했어요.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box
      onClick={handleCardClick}
      sx={{
        width: '100%',
        borderRadius: '12px',
        p: 1,
        mt: 1,
        display: 'flex',
        alignItems: isExpanded ? 'flex-start' : 'center',
        gap: 2,
        transition: 'all 0.3s ease-in-out',
        cursor: file.description ? 'pointer' : 'default',
      }}
    >
      {/* File Icon */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getFileIcon(file.type, theme)}
      </Box>

      {/* File Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* File Name */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 14,
            fontWeight: 500,
            color: isExpanded ? theme.palette.primary.main : theme.palette.text.primary,
            mb: 0.25,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          {file.name}
        </Typography>

        {/* File Meta */}
        <Typography
          sx={{
            fontFamily: 'Pretendard, sans-serif',
            fontSize: 12,
            color: theme.palette.text.secondary,
          }}
        >
          {(() => {
            const sizeInBytes = file.size;
            const sizeInKB = sizeInBytes / 1024;
            const sizeInMB = sizeInBytes / (1024 * 1024);

            if (sizeInMB >= 1) {
              return `${sizeInMB.toLocaleString(undefined, { maximumFractionDigits: 2 })}MB`;
            } else if (sizeInKB >= 1) {
              return `${sizeInKB.toLocaleString(undefined, { maximumFractionDigits: 2 })}KB`;
            } else {
              return `${sizeInBytes.toLocaleString()}B`;
            }
          })()} • {file.uploadedBy} • {formatDateShort(file.uploadedAt)}
        </Typography>

        {/* File Description - Only shown when expanded */}
        {file.description && isExpanded && (
          <Typography
            sx={{
              fontFamily: 'Pretendard, sans-serif',
              fontSize: 13,
              color: theme.palette.text.secondary,
              whiteSpace: 'normal',
              mt: 0.5,
              mb: 0.5,
              animation: 'fadeIn 0.3s ease-in-out',
              '@keyframes fadeIn': {
                from: {
                  opacity: 0,
                  transform: 'translateY(-10px)',
                },
                to: {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
            }}
          >
            {file.description}
          </Typography>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexShrink: 0,
          alignSelf: isExpanded ? 'flex-start' : 'center',
        }}
      >
        {/* Download Button */}
        <IconButton
          onClick={handleDownload}
          disabled={isDownloading || !canDownload}
          sx={{
            width: 32,
            height: 32,
            backgroundColor: theme.palette.background.paper,
            opacity: !canDownload ? 0.4 : 1,
            cursor: !canDownload ? 'not-allowed' : 'pointer',
          }}
        >
          {isDownloading ? (
            <LightningLoader size={18} color={theme.palette.text.secondary} />
          ) : (
            <FileDownloadOutlinedIcon
              sx={{
                fontSize: 18,
                color: theme.palette.text.secondary,
              }}
            />
          )}
        </IconButton>

        {/* Delete Button - Only visible to authorized users */}
        {canDelete && (
          <IconButton
            onClick={handleDelete}
            disabled={isDeleting}
            sx={{
              width: 32,
              height: 32,
              backgroundColor: theme.palette.background.paper,
              opacity: !canDelete ? 0.4 : 1,
              cursor: !canDelete ? 'not-allowed' : 'pointer',
            }}
          >
            {isDeleting ? (
              <LightningLoader size={18} color={theme.palette.text.secondary} />
            ) : (
              <DeleteOutlineOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: theme.palette.text.secondary,
                }}
              />
            )}
          </IconButton>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="파일 삭제"
        message="파일을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        isDestructive={true}
        loading={isDeleting}
        icon={<DeleteOutlineOutlinedIcon />}
      />
    </Box>
  );
}
