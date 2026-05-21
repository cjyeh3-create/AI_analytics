import { useState, useMemo } from 'react';
import { ChartType } from '../types';

interface InteractiveChartProps {
  headers: string[];
  rows: Record<string, string>[];
  selectedX: string;
  selectedY: string;
  chartType: ChartType;
}

export default function InteractiveChart({
  rows,
  selectedX,
  selectedY,
  chartType,
}: InteractiveChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Parse Y values safely to numbers
  const chartData = useMemo(() => {
    return rows.map((row, idx) => {
      const xVal = row[selectedX] || `列 ${idx + 1}`;
      const rawY = row[selectedY] || '0';
      const parsedY = parseFloat(rawY.replace(/[\$,%\s]/g, ''));
      return {
        x: xVal,
        y: isNaN(parsedY) ? 0 : parsedY,
        originalIndex: idx
      };
    });
  }, [rows, selectedX, selectedY]);

  // Find statistical range for Y
  const yValues = chartData.map(d => d.y);
  const maxY = Math.max(...yValues, 1) * 1.15; // padding top
  const minY = Math.min(...yValues, 0) < 0 ? Math.min(...yValues) * 1.15 : 0;
  const rangeY = maxY - minY;

  // Render variables
  const padding = { top: 40, right: 30, bottom: 65, left: 75 };
  const width = 600;
  const height = 350;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scales helpers
  const getXCoord = (index: number) => {
    if (chartData.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (chartData.length - 1)) * plotWidth;
  };

  const getYCoord = (val: number) => {
    const ratio = (val - minY) / rangeY;
    return padding.top + plotHeight * (1 - ratio);
  };

  // Generate grid marks
  const gridTicks = 5;
  const yTicks = Array.from({ length: gridTicks }, (_, i) => {
    return minY + (rangeY / (gridTicks - 1)) * i;
  });

  // Calculate coordinates for SVGs
  const linePath = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getXCoord(i)} ${getYCoord(d.y)}`).join(' ');
  }, [chartData, minY, maxY]);

  const areaPath = useMemo(() => {
    if (chartData.length === 0) return '';
    const baseLine = getYCoord(0); // baseline Y (zero or min)
    const points = chartData.map((d, i) => `L ${getXCoord(i)} ${getYCoord(d.y)}`);
    return `M ${getXCoord(0)} ${baseLine} ${points.join(' ')} L ${getXCoord(chartData.length - 1)} ${baseLine} Z`;
  }, [chartData, minY, maxY]);

  // Pie chart calculation
  const pieSlices = useMemo(() => {
    const total = yValues.reduce((a, b) => a + Math.max(b, 0), 0);
    if (total === 0) return [];
    
    let accumulatedAngle = -Math.PI / 2; // start from top
    const centerX = width / 2;
    const centerY = height / 2 - 10;
    const radius = 100;

    return chartData.map((d) => {
      const value = Math.max(d.y, 0);
      const percentage = total > 0 ? (value / total) : 0;
      const angle = percentage * 2 * Math.PI;
      
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle = endAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const largeArcFlag = angle > Math.PI ? 1 : 0;

      // Slice path
      const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return {
        path,
        percentage,
        label: d.x,
        value: d.y,
        originalIndex: d.originalIndex
      };
    });
  }, [chartData]);

  // Color rotation
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#a855f7'
  ];

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <span className="text-slate-400">目前無可視化數據</span>
      </div>
    );
  }

  // Render specific charts
  const renderVisual = () => {
    switch (chartType) {
      case 'bar': {
        const barWidth = Math.max(4, Math.min(60, (plotWidth / chartData.length) * 0.7));
        const zeroY = getYCoord(0);

        return chartData.map((d, i) => {
          const x = getXCoord(i) - barWidth / 2;
          const y = d.y >= 0 ? getYCoord(d.y) : zeroY;
          const barHeight = Math.abs(getYCoord(d.y) - zeroY);
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(1, barHeight)}
                fill={isHovered ? '#2563eb' : colors[i % colors.length]}
                rx={Math.min(4, barWidth / 2)}
                className="transition-all duration-200 cursor-pointer hover:brightness-105"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {isHovered && (
                <rect
                  x={x + barWidth / 2 - 50}
                  y={Math.max(10, y - 35)}
                  width="100"
                  height="26"
                  rx="6"
                  fill="#0f172a"
                  className="opacity-90 shadow-lg pointer-events-none"
                />
              )}
              {isHovered && (
                <text
                  x={x + barWidth / 2}
                  y={Math.max(26, y - 18)}
                  fill="#ffffff"
                  fontSize="11"
                  textAnchor="middle"
                  className="font-medium font-sans pointer-events-none"
                >
                  {d.y.toLocaleString()}
                </text>
              )}
            </g>
          );
        });
      }

      case 'line': {
        return (
          <g>
            {/* Outline path */}
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm transition-all duration-300"
            />
            {/* Interactive dots */}
            {chartData.map((d, i) => {
              const cx = getXCoord(i);
              const cy = getYCoord(d.y);
              const isHovered = hoveredIndex === i;

              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 7 : 4}
                    fill={isHovered ? '#1e40af' : '#3b82f6'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {isHovered && (
                    <g className="pointer-events-none">
                      <rect
                        x={cx - 50}
                        y={Math.max(10, cy - 35)}
                        width="100"
                        height="26"
                        rx="6"
                        fill="#0f172a"
                        className="opacity-95"
                      />
                      <text
                        x={cx}
                        y={Math.max(26, cy - 18)}
                        fill="#ffffff"
                        fontSize="11"
                        textAnchor="middle"
                        className="font-sans font-medium"
                      >
                        {d.y.toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      }

      case 'area': {
        return (
          <g>
            <path
              d={areaPath}
              className="fill-blue-500/15"
            />
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartData.map((d, i) => {
              const cx = getXCoord(i);
              const cy = getYCoord(d.y);
              const isHovered = hoveredIndex === i;

              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 6.5 : 3.5}
                    fill={isHovered ? '#1d4ed8' : '#3b82f6'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {isHovered && (
                    <g className="pointer-events-none">
                      <rect
                        x={cx - 50}
                        y={Math.max(10, cy - 35)}
                        width="100"
                        height="26"
                        rx="6"
                        fill="#0f172a"
                        className="opacity-95"
                      />
                      <text
                        x={cx}
                        y={Math.max(26, cy - 18)}
                        fill="#ffffff"
                        fontSize="11"
                        textAnchor="middle"
                        className="font-sans font-medium"
                      >
                        {d.y.toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      }

      case 'scatter': {
        return chartData.map((d, i) => {
          const cx = getXCoord(i);
          const cy = getYCoord(d.y);
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? 9 : 6}
                fill={colors[i % colors.length]}
                fillOpacity={isHovered ? 1.0 : 0.75}
                stroke="#ffffff"
                strokeWidth={isHovered ? 2.5 : 1.5}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {isHovered && (
                <g className="pointer-events-none">
                  <rect
                    x={cx - 60}
                    y={Math.max(10, cy - 43)}
                    width="120"
                    height="34"
                    rx="6"
                    fill="#0f172a"
                    className="opacity-95"
                  />
                  <text
                    x={cx}
                    y={Math.max(24, cy - 28)}
                    fill="#ffffff"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-sans font-semibold"
                  >
                    {d.x}
                  </text>
                  <text
                    x={cx}
                    y={Math.max(38, cy - 14)}
                    fill="#94a3b8"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-sans font-mono"
                  >
                    {d.y.toLocaleString()}
                  </text>
                </g>
              )}
            </g>
          );
        });
      }

      case 'pie': {
        const centerX = width / 2;
        const centerY = height / 2 - 10;

        return (
          <g>
            {pieSlices.map((slice, i) => {
              const isHovered = hoveredIndex === i;
              const hoverOffset = isHovered ? 6 : 0;
              
              // Compute centroid angle to nudge out hovered slices slightly
              const angleSlice = slice.percentage * Math.PI;
              const centroidAngle = -Math.PI / 2 + (pieSlices.slice(0, i).reduce((sum, s) => sum + s.percentage, 0) * 2 * Math.PI) + angleSlice;
              const transX = hoverOffset * Math.cos(centroidAngle);
              const transY = hoverOffset * Math.sin(centroidAngle);

              return (
                <g 
                  key={i} 
                  transform={`translate(${transX}, ${transY})`}
                  className="transition-transform duration-200"
                >
                  <path
                    d={slice.path}
                    fill={colors[i % colors.length]}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:brightness-105"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                  {isHovered && (
                    <g className="pointer-events-none">
                      <rect
                        x={centerX - 80}
                        y={centerY + 115}
                        width="160"
                        height="38"
                        rx="6"
                        fill="#0f172a"
                        className="opacity-95"
                      />
                      <text
                        x={centerX}
                        y={centerY + 130}
                        fill="#ffffff"
                        fontSize="10"
                        textAnchor="middle"
                        className="font-sans font-medium"
                      >
                        {slice.label}
                      </text>
                      <text
                        x={centerX}
                        y={centerY + 145}
                        fill="#60a5fa"
                        fontSize="10"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {slice.value.toLocaleString()} ({(slice.percentage * 100).toFixed(1)}%)
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      }
      default:
        return null;
    }
  };

  // Skip rendering axes for Pie Chart
  const showAxes = chartType !== 'pie';

  return (
    <div className="w-full flex flex-col md:flex-row gap-6 items-center">
      <div className="flex-1 bg-white p-4 rounded-xl border border-slate-100 flex justify-center items-center shadow-xs w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[350px] select-none"
        >
          {showAxes && (
            <g>
              {/* Grid Lines */}
              {yTicks.map((tickValue, i) => {
                const yCoord = getYCoord(tickValue);
                // Avoid drawing multiple overlapping bottom lines
                if (isNaN(yCoord)) return null;

                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={yCoord}
                      x2={width - padding.right}
                      y2={yCoord}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 12}
                      y={yCoord + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="10"
                      className="font-mono"
                    >
                      {parseFloat(tickValue.toFixed(2)).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* X axis lines / ticks */}
              {chartData.map((d, i) => {
                const xCoord = getXCoord(i);
                if (isNaN(xCoord)) return null;
                const isEven = i % Math.max(1, Math.ceil(chartData.length / 8)) === 0;

                return (
                  <g key={i}>
                    <line
                      x1={xCoord}
                      y1={height - padding.bottom}
                      x2={xCoord}
                      y2={height - padding.bottom + 5}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />
                    {isEven && (
                      <text
                        x={xCoord}
                        y={height - padding.bottom + 20}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                        className="font-sans truncate max-w-[50px] block"
                        transform={`rotate(-25, ${xCoord}, ${height - padding.bottom + 20})`}
                      >
                        {d.x.length > 8 ? `${d.x.substring(0, 6)}..` : d.x}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Base Axis Line */}
              <line
                x1={padding.left}
                y1={height - padding.bottom}
                x2={width - padding.right}
                y2={height - padding.bottom}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={height - padding.bottom}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Render Actual Visual Elements */}
          {renderVisual()}
        </svg>
      </div>

      {/* Legend Block */}
      <div className="w-full md:w-48 max-h-[300px] overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs flex flex-col gap-2">
        <span className="font-semibold text-slate-700 pb-1 border-b border-slate-200">
          資料項目對照
        </span>
        <div className="flex flex-col gap-1.5">
          {chartData.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 p-1.5 rounded-md transition-colors cursor-pointer ${
                hoveredIndex === idx ? 'bg-white shadow-xs font-semibold' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {chartType === 'pie' || chartType === 'bar' || chartType === 'scatter' ? (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
              ) : (
                <span className="w-2.5 h-0.5 bg-blue-500 shrink-0" />
              )}
              <span className="truncate text-slate-600 flex-1">{item.x}</span>
              <span className="font-mono text-slate-500">{item.y.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
