import { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    IconButton,
    styled
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

const ModalContent = styled(Box)({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '350px',
    backgroundColor: '#fff',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
    outline: 'none'
});

interface MonthPickerModalProps {
    open: boolean;
    onClose: () => void;
    value: string; // YYYY-MM
    onChange: (value: string) => void;
    title?: string;
    minDate?: string; // YYYY-MM 형식, 이 날짜 이전은 선택 불가
}

export default function MonthPickerModal({ open, onClose, value, onChange, title = '기간 선택', minDate }: MonthPickerModalProps) {
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    useEffect(() => {
        if (open && value) {
            const [y, m] = value.split('-').map(Number);
            if (y && m) {
                setSelectedYear(y);
                setSelectedMonth(m);
                setViewYear(y);
            }
        }
    }, [open, value]);

    const handleMonthClick = (month: number) => {
        const monthStr = String(month).padStart(2, '0');
        const selectedDate = `${viewYear}-${monthStr}`;

        // minDate 체크
        if (minDate && selectedDate < minDate) {
            return;
        }

        onChange(selectedDate);
        onClose();
    };

    const months = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];

    return (
        <Modal open={open} onClose={onClose}>
            <ModalContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => setViewYear(prev => prev - 1)} size="small">
                        <ArrowBackIosIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
                    </IconButton>
                    <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>{viewYear}년</Typography>
                    <IconButton onClick={() => setViewYear(prev => prev + 1)} size="small">
                        <ArrowForwardIosIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
                    {months.map((m, idx) => {
                        const monthNum = idx + 1;
                        const monthStr = String(monthNum).padStart(2, '0');
                        const currentDate = `${viewYear}-${monthStr}`;
                        const isSelected = viewYear === selectedYear && monthNum === selectedMonth;
                        const isDisabled = minDate ? currentDate < minDate : false;

                        return (
                            <Button
                                key={m}
                                onClick={() => handleMonthClick(monthNum)}
                                disabled={isDisabled}
                                sx={{
                                    height: '50px',
                                    borderRadius: '12px',
                                    fontSize: '1rem',
                                    fontWeight: isSelected ? 700 : 500,
                                    color: isDisabled ? '#D1D5DB' : (isSelected ? '#fff' : '#4B5563'),
                                    bgcolor: isSelected ? 'primary.main' : 'transparent',
                                    '&:hover': {
                                        bgcolor: isDisabled ? 'transparent' : (isSelected ? 'primary.main' : '#F3F4F6')
                                    },
                                    '&:disabled': {
                                        color: '#D1D5DB',
                                        cursor: 'not-allowed'
                                    }
                                }}
                            >
                                {m}
                            </Button>
                        );
                    })}
                </Box>
            </ModalContent>
        </Modal>
    );
}
