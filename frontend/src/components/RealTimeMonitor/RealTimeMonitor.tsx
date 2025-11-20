// src/components/RealTimeMonitor/RealTimeMonitor.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { useWebSocket } from '@/hooks';
import type { RealTimeDataStream } from '@/types';

interface MetricData {
  label: string;
  value: number;
  unit?: string;
  trend?: 'increase' | 'decrease';
  percentage?: number;
}

export const RealTimeMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [dataStream, setDataStream] = useState<RealTimeDataStream[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const streamRef = useRef<HTMLDivElement>(null);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // WebSocket connection
  const { data, isConnected, error } = useWebSocket('/stream/metrics');

  // SSE connection for backup
  useEffect(() => {
    if (!isConnected) {
      const eventSource = new EventSource('/api/node/stream/realtime');
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleNewData(data);
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus('disconnected');
      };

      return () => {
        eventSource.close();
      };
    }
  }, [isConnected]);

  // Update connection status
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (error) {
      setConnectionStatus('disconnected');
    } else {
      setConnectionStatus('connecting');
    }
  }, [isConnected, error]);

  // Handle incoming data
  const handleNewData = (newData: any) => {
    // Update metrics
    if (newData.metrics) {
      setMetrics(newData.metrics);
    }

    // Add to data stream
    if (newData.stream) {
      setDataStream(prev => {
        const updated = [...prev, newData.stream];
        // Keep only last 50 items
        return updated.slice(-50);
      });

      // Auto-scroll to bottom
      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    }
  };

  // Process WebSocket data
  useEffect(() => {
    if (data) {
      handleNewData(data);
    }
  }, [data]);

  // Generate sample metrics for demo
  useEffect(() => {
    const interval = setInterval(() => {
      const sampleMetrics: MetricData[] = [
        {
          label: 'Active Users',
          value: Math.floor(Math.random() * 1000) + 500,
          trend: Math.random() > 0.5 ? 'increase' : 'decrease',
          percentage: Math.random() * 10,
        },
        {
          label: 'Data Points',
          value: Math.floor(Math.random() * 10000) + 5000,
          unit: 'pts',
          trend: 'increase',
          percentage: Math.random() * 5,
        },
        {
          label: 'Processing Speed',
          value: Math.floor(Math.random() * 100) + 50,
          unit: 'ms',
          trend: Math.random() > 0.5 ? 'increase' : 'decrease',
          percentage: Math.random() * 15,
        },
        {
          label: 'Memory Usage',
          value: Math.floor(Math.random() * 30) + 60,
          unit: '%',
          trend: Math.random() > 0.5 ? 'increase' : 'decrease',
          percentage: Math.random() * 8,
        },
      ];

      setMetrics(sampleMetrics);

      // Add sample stream data
      const streamData: RealTimeDataStream = {
        id: `stream-${Date.now()}`,
        type: Math.random() > 0.7 ? 'alert' : Math.random() > 0.5 ? 'analytics' : 'sensor',
        data: {
          message: `Sample event at ${new Date().toLocaleTimeString()}`,
          value: Math.random() * 100,
        },
        timestamp: new Date(),
        source: 'demo',
      };

      setDataStream(prev => [...prev.slice(-49), streamData]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'disconnected':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStreamItemColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'red.100';
      case 'analytics':
        return 'blue.100';
      case 'sensor':
        return 'green.100';
      default:
        return 'gray.100';
    }
  };

  return (
    <VStack spacing={4} align="stretch" h="100%">
      {/* Connection Status */}
      <HStack justify="space-between">
        <Text fontWeight="bold">Real-Time Monitor</Text>
        <Badge colorScheme={getStatusColor()}>
          {connectionStatus === 'connected' ? '● Connected' : 
           connectionStatus === 'connecting' ? '◐ Connecting...' : 
           '○ Disconnected'}
        </Badge>
      </HStack>

      {/* Metrics Grid */}
      <SimpleGrid columns={2} spacing={3}>
        {metrics.map((metric, index) => (
          <Stat
            key={index}
            p={3}
            bg={bgColor}
            borderRadius="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <StatLabel fontSize="xs">{metric.label}</StatLabel>
            <StatNumber fontSize="lg">
              {metric.value.toLocaleString()}
              {metric.unit && (
                <Text as="span" fontSize="sm" ml={1}>
                  {metric.unit}
                </Text>
              )}
            </StatNumber>
            {metric.trend && metric.percentage && (
              <StatHelpText>
                <StatArrow type={metric.trend} />
                {metric.percentage.toFixed(1)}%
              </StatHelpText>
            )}
          </Stat>
        ))}
      </SimpleGrid>

      {/* Data Stream */}
      <Box flex={1}>
        <Text fontSize="sm" fontWeight="bold" mb={2}>
          Live Data Stream
        </Text>
        <Box
          ref={streamRef}
          h="150px"
          overflowY="auto"
          bg={bgColor}
          borderRadius="md"
          border="1px solid"
          borderColor={borderColor}
          p={2}
        >
          {dataStream.length === 0 ? (
            <Alert status="info" size="sm">
              <AlertIcon />
              Waiting for data...
            </Alert>
          ) : (
            <VStack spacing={1} align="stretch">
              {dataStream.map((item) => (
                <HStack
                  key={item.id}
                  p={1}
                  bg={useColorModeValue(getStreamItemColor(item.type), 'gray.700')}
                  borderRadius="sm"
                  fontSize="xs"
                >
                  <Badge size="xs" colorScheme={
                    item.type === 'alert' ? 'red' :
                    item.type === 'analytics' ? 'blue' : 'green'
                  }>
                    {item.type}
                  </Badge>
                  <Text flex={1} noOfLines={1}>
                    {item.data.message || JSON.stringify(item.data)}
                  </Text>
                  <Text color="gray.500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      </Box>

      {/* Progress Indicator */}
      <Box>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs">Data Processing</Text>
          <Text fontSize="xs">85%</Text>
        </HStack>
        <Progress
          value={85}
          size="sm"
          colorScheme="blue"
          isAnimated
          hasStripe
        />
      </Box>
    </VStack>
  );
};
