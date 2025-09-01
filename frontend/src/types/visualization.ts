// src/types/visualization.ts
export type ChartType = 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'area' | 'bubble';

export interface ChartConfig {
  type: ChartType;
  title?: string;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  animation?: AnimationConfig;
}

export interface AxisConfig {
  label: string;
  scale?: 'linear' | 'log' | 'time' | 'band';
  min?: number;
  max?: number;
  tickFormat?: (value: any) => string;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  orientation?: 'horizontal' | 'vertical';
}

export interface TooltipConfig {
  show: boolean;
  format?: (data: any) => string;
  trigger?: 'hover' | 'click';
}

export interface AnimationConfig {
  duration: number;
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
}

export interface DataPoint {
  x: number | string | Date;
  y: number;
  z?: number;
  label?: string;
  color?: string;
  size?: number;
}

export interface Dataset {
  id: string;
  label: string;
  data: DataPoint[];
  color?: string;
  type?: ChartType;
}

export interface VisualizationData {
  datasets: Dataset[];
  labels?: string[];
  categories?: string[];
}

export interface StatisticalPlot {
  type: 'distribution' | 'correlation' | 'regression' | 'boxplot';
  data: any;
  imageUrl?: string;
  statistics: Record<string, number>;
}

export interface RealTimeDataStream {
  id: string;
  type: 'sensor' | 'analytics' | 'alert';
  data: any;
  timestamp: Date;
  source: string;
}

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: number;
}

export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}