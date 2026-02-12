import { styled, Typography } from "@mui/material";


export const PageSubtitle = styled(Typography)(({ theme }) => ({
  fontFamily: 'Pretendard, sans-serif',
  fontSize: 'clamp(16px, 3.5vw, 18px)',
  lineHeight: 1.5,
  fontWeight: 500,
  color: theme.palette.subText?.default,
  marginBottom: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    fontSize: 16,
  },
  marginTop: theme.spacing(1),
}));
