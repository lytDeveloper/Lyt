import { useRef, useState, type DragEvent } from 'react';
import { Box, Typography, IconButton, useTheme } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import CloseIcon from '@mui/icons-material/Close';

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileDropzone({ files, onFilesChange }: FileDropzoneProps) {
  const theme = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(Array.from(droppedFiles));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const combined = [...files, ...newFiles];
    if (combined.length > 3) {
      alert('최대 3개의 파일까지 업로드 가능합니다.');
      onFilesChange(combined.slice(0, 3));
    } else {
      onFilesChange(combined);
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <Box>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => files.length < 3 && fileInputRef.current?.click()}
        sx={{
          border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
          borderRadius: '12px',
          p: 3,
          mb: 2,
          backgroundColor: theme.palette.background.default,
          cursor: files.length < 3 ? 'pointer' : 'default',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          opacity: files.length >= 3 ? 0.6 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={files.length >= 3}
        />
        <CloudUploadOutlinedIcon sx={{ fontSize: 26, color: theme.palette.icon.inner }} />
        <Typography sx={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>
          {files.length >= 3 ? '최대 개수 초과' : '파일을 드래그하거나 클릭하여 업로드'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: '#9CA3AF' }}>
          최대 10MB, PDF/이미지 등 (선택사항)
        </Typography>
      </Box>

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {files.map((file, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                backgroundColor: theme.palette.grey[50],
              }}
            >
              <InsertDriveFileOutlinedIcon sx={{ color: '#6B7280', mr: 1.5 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  {file.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => removeFile(index)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

