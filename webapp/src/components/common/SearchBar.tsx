import { TextField, InputAdornment, useTheme } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '다양한 프로젝트를 찾아보세요'
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <TextField
      fullWidth
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 19, color: theme.palette.icon.inner }} />
          </InputAdornment>
        ),
      }}
      sx={{
        mb: 2.5,
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 1px 1px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          height: 44,
          fontFamily: 'Pretendard, sans-serif',
          fontSize: 14,
          '& fieldset': {
            border: 'none',
          },
          '& input::placeholder': {
            color: theme.palette.text.secondary,
            opacity: 1,
          },
        },
      }}
    />
  );
}
