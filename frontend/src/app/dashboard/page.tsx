// src/app/dashboard/page.tsx
'use client';

import { Suspense, lazy } from 'react';
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Spinner,
  VStack,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { Header, Sidebar } from '@/components/Layout';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy components
const GeospatialMap = dynamic(
  () => import('@/components/GeospatialMap').then(mod => mod.GeospatialMap),
  { 
    ssr: false,
    loading: () => <Spinner size="xl" />
  }
);

const DataVisualization = dynamic(
  () => import('@/components/DataVisualization').then(mod => mod.DataVisualization),
  { 
    ssr: false,
    loading: () => <Spinner size="lg" />
  }
);

const RealTimeMonitor = dynamic(
  () => import('@/components/RealTimeMonitor').then(mod => mod.RealTimeMonitor),
  { 
    ssr: false,
    loading: () => <Spinner size="md" />
  }
);

export default function DashboardPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box minH="100vh" bg={bgColor}>
      <Header />
      <Grid
        templateColumns="250px 1fr"
        gap={0}
        minH="calc(100vh - 64px)"
      >
        <GridItem>
          <Sidebar />
        </GridItem>
        <GridItem p={4}>
          <VStack spacing={6} align="stretch">
            {/* Main Map View */}
            <Box
              h="500px"
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
              overflow="hidden"
              bg="white"
              shadow="md"
            >
              <Suspense fallback={<Spinner size="xl" />}>
                <GeospatialMap
                  center={[51.505, -0.09]}
                  zoom={13}
                />
              </Suspense>
            </Box>

            {/* Visualization Grid */}
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <GridItem>
                <Box
                  h="400px"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  bg="white"
                  shadow="md"
                  p={4}
                >
                  <Heading size="md" mb={4}>
                    Data Analytics
                  </Heading>
                  <Suspense fallback={<Spinner />}>
                    <DataVisualization
                      dataEndpoint="geospatial"
                      chartType="bar"
                    />
                  </Suspense>
                </Box>
              </GridItem>
              <GridItem>
                <Box
                  h="400px"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  bg="white"
                  shadow="md"
                  p={4}
                >
                  <Heading size="md" mb={4}>
                    Real-Time Monitor
                  </Heading>
                  <Suspense fallback={<Spinner />}>
                    <RealTimeMonitor />
                  </Suspense>
                </Box>
              </GridItem>
            </Grid>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
}