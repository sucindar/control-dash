'use client';
import { Roboto } from 'next/font/google';
import { createTheme } from '@mui/material/styles';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    ...(mode === 'dark'
      ? {
          // palette values for dark mode
          primary: {
            main: '#90caf9',
          },
          background: {
            default: '#121212',
            paper: '#1e1e1e',
          },
        }
      : {
          // palette values for light mode
          primary: {
            main: '#1976d2',
          },
        }),
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
});

export default getTheme;
