// src/components/DataVisualization/DataVisualization.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Select,
  Button,
  HStack,
  VStack,
  Spinner,
  Text,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { ChartTypes } from './ChartTypes';
import { useWebSocket } from '@/hooks';
import { api } from '@/services';
import type { ChartType, VisualizationData } from '@/types';

interface DataVisualizationProps {
  dataEndpoint: string;
  chartType: ChartType;
  realTime?: boolean;
  height?: number;
  width?: number;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  dataEndpoint,
  chartType: initialChartType,
  realTime = false,
  height = 350,
  width = 600,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<VisualizationData | null>(null);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const [loading, setLoading] = useState(false);
  const [seabornPlot, setSeabornPlot] = useState<string | null>(null);
  const toast = useToast();

  // WebSocket connection for real-time updates
  const { data: wsData, isConnected } = useWebSocket(
    realTime ? `/visualizations/${dataEndpoint}` : null
  );

  // Fetch data from Flask backend
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getVisualizationData(dataEndpoint) as any;
      setData(response.data);

      // If response includes Seaborn plot
      if (response.statistical_plot) {
        setSeabornPlot(response.statistical_plot);
      }

      toast({
        title: 'Data Updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Data fetch error:', error);
      toast({
        title: 'Failed to fetch data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [dataEndpoint, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle WebSocket data updates
  useEffect(() => {
    if (wsData && realTime) {
      setData(prevData => ({
        ...prevData,
        datasets: wsData.datasets || prevData?.datasets || [],
      }));
    }
  }, [wsData, realTime]);

  // Render D3 chart
  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Render based on chart type
    switch (chartType) {
      case 'bar':
        ChartTypes.renderBarChart(g, data, innerWidth, innerHeight);
        break;
      case 'line':
        ChartTypes.renderLineChart(g, data, innerWidth, innerHeight);
        break;
      case 'scatter':
        ChartTypes.renderScatterPlot(g, data, innerWidth, innerHeight);
        break;
      case 'heatmap':
        ChartTypes.renderHeatmap(g, data, innerWidth, innerHeight);
        break;
      case 'pie':
        ChartTypes.renderPieChart(g, data, innerWidth, innerHeight);
        break;
      case 'area':
        ChartTypes.renderAreaChart(g, data, innerWidth, innerHeight);
        break;
      default:
        ChartTypes.renderBarChart(g, data, innerWidth, innerHeight);
    }

    // Add responsive behavior
    const handleResize = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        svg.attr('width', containerWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, chartType, height, width]);

  // Export chart as image
  const exportChart = useCallback((format: 'png' | 'svg') => {
    if (!svgRef.current) return;

    if (format === 'svg') {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chart-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `chart-${Date.now()}.png`;
            link.click();
            URL.revokeObjectURL(url);
          }
        });
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  }, []);

  return (
    <VStack spacing={4} align="stretch" h="100%">
      {/* Controls */}
      <HStack spacing={2}>
        <Select
          size="sm"
          value={chartType}
          onChange={(e) => setChartType(e.target.value as ChartType)}
          w="150px"
        >
          <option value="bar">Bar Chart</option>
          <option value="line">Line Chart</option>
          <option value="scatter">Scatter Plot</option>
          <option value="heatmap">Heatmap</option>
          <option value="pie">Pie Chart</option>
          <option value="area">Area Chart</option>
        </Select>

        <Button size="sm" onClick={fetchData} isLoading={loading}>
          Refresh
        </Button>

        <Menu>
          <MenuButton as={Button} size="sm">
            Export
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => exportChart('png')}>Export as PNG</MenuItem>
            <MenuItem onClick={() => exportChart('svg')}>Export as SVG</MenuItem>
          </MenuList>
        </Menu>

        {realTime && (
          <Text fontSize="sm" color={isConnected ? 'green.500' : 'red.500'}>
            {isConnected ? '● Live' : '○ Disconnected'}
          </Text>
        )}
      </HStack>

      {/* Chart Container */}
      <Box ref={containerRef} flex={1} position="relative">
        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            h="100%"
          >
            <Spinner size="xl" />
          </Box>
        ) : (
          <>
            {/* D3 Chart */}
            <svg
              ref={svgRef}
              width={width}
              height={height}
              style={{
                display: 'block',
                margin: '0 auto',
              }}
            />

            {/* Seaborn Plot (if available) */}
            {seabornPlot && (
              <Box
                position="absolute"
                top={0}
                right={0}
                p={2}
                bg="white"
                borderRadius="md"
                shadow="md"
                maxW="200px"
              >
                <Text fontSize="xs" mb={1}>
                  Statistical Plot
                </Text>
                <img
                  src={seabornPlot}
                  alt="Statistical visualization"
                  style={{ width: '100%', height: 'auto' }}
                />
              </Box>
            )}
          </>
        )}
      </Box>
    </VStack>
  );
};
