// src/components/DataVisualization/ChartTypes.ts
import * as d3 from 'd3';
import type { VisualizationData } from '@/types';

export class ChartTypes {
  // Bar Chart
  static renderBarChart(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: VisualizationData,
    width: number,
    height: number
  ): void {
    if (!data.datasets[0]) return;

    const dataset = data.datasets[0];
    const xScale = d3
      .scaleBand()
      .domain(dataset.data.map(d => String(d.x)))
      .range([0, width])
      .padding(0.1);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(dataset.data, d => d.y) || 0])
      .nice()
      .range([height, 0]);

    // Create bars with animation
    const bars = g
      .selectAll('.bar')
      .data(dataset.data)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(String(d.x)) || 0)
      .attr('width', xScale.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('fill', dataset.color || '#4299E1');

    // Animate bars
    bars
      .transition()
      .duration(750)
      .attr('y', d => yScale(d.y))
      .attr('height', d => height - yScale(d.y));

    // Add interactivity
    bars
      .on('mouseover', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', '#2B6CB0');

        // Show tooltip
        const tooltip = d3
          .select('body')
          .append('div')
          .attr('class', 'chart-tooltip')
          .style('position', 'absolute')
          .style('padding', '8px')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('border-radius', '4px')
          .style('pointer-events', 'none')
          .style('opacity', 0);

        tooltip
          .transition()
          .duration(200)
          .style('opacity', 0.9);

        tooltip
          .html(`<strong>${d.label || d.x}</strong><br/>Value: ${d.y}`)
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('fill', dataset.color || '#4299E1');

        d3.selectAll('.chart-tooltip').remove();
      });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em')
      .attr('transform', 'rotate(-45)');
  }
  static renderLineChart(
    _g: d3.Selection<SVGGElement, unknown, null, undefined>,
    _data: VisualizationData,
    _width: number,
    _height: number
  ): void {
    console.warn('Line chart not implemented');
  }

  static renderScatterPlot(
    _g: d3.Selection<SVGGElement, unknown, null, undefined>,
    _data: VisualizationData,
    _width: number,
    _height: number
  ): void {
    console.warn('Scatter plot not implemented');
  }

  static renderHeatmap(
    _g: d3.Selection<SVGGElement, unknown, null, undefined>,
    _data: VisualizationData,
    _width: number,
    _height: number
  ): void {
    console.warn('Heatmap not implemented');
  }

  static renderPieChart(
    _g: d3.Selection<SVGGElement, unknown, null, undefined>,
    _data: VisualizationData,
    _width: number,
    _height: number
  ): void {
    console.warn('Pie chart not implemented');
  }

  static renderAreaChart(
    _g: d3.Selection<SVGGElement, unknown, null, undefined>,
    _data: VisualizationData,
    _width: number,
    _height: number
  ): void {
    console.warn('Area chart not implemented');
  }
}