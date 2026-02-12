import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import './index.css'
import 'react-toastify/dist/ReactToastify.css'

// MUI 테마 설정
// const theme = createTheme({
//   typography: {
//     fontFamily: [
//       'Pretendard',
//       '-apple-system',
//       'BlinkMacSystemFont',
//       'system-ui',
//       'Roboto',
//       '"Helvetica Neue"',
//       'Segoe UI',
//       'Apple SD Gothic Neo',
//       'Malgun Gothic',
//       'sans-serif',
//     ].join(','),
//   },
//   palette: {
//     mode: 'light',
//     primary: {
//       main: '#2563EB',
//       contrastText: '#ffffff',
//     },
//     text: {
//       primary: '#000000',
//       secondary: '#949196',
//     },
//     background: {
//       default: '#ffffff',
//       paper: '#ffffff',
//     },
//   },
// })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* <ThemeProvider theme={theme}> */}
    <CssBaseline />
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <BrowserRouter>
        <App />
        <ToastContainer position="top-center" autoClose={4000} hideProgressBar />
      </BrowserRouter>
    </QueryClientProvider>
    {/* </ThemeProvider> */}
  </React.StrictMode >,
)
