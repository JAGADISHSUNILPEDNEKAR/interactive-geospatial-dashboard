// src/app/providers.tsx
'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from '@/store/store';
import { theme } from '@/styles/theme';
import { usePerformanceMonitoring } from '@/hooks';

export function Providers({ children }: { children: React.ReactNode }) {
  usePerformanceMonitoring();

  return (
    <ReduxProvider store={store}>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </ReduxProvider>
  );
}
