"use client";

import { memo } from "react";

type RadarChartProps = {
  values: number[];
  labels?: string[];
  size?: number;
  color?: string;
};

const defaultLabels = ["Reflexo", "1×1", "Jogo aéreo", "Reposição", "Posicionamento", "Defesas"];

function RadarChart({ values, labels = defaultLabels, size = 320, color = "#2F4BC0" }: RadarChartProps) {
  const viewBoxSize = 320;
  const center = viewBoxSize / 2;
  const radius = (viewBoxSize / 2) * 0.72;
  const rings = [0.25, 0.5, 0.75, 1];

  // Normaliza valores: se estiverem em 0-1, multiplica por 100; se NaN/undefined, usa 50
  const normValues = values.map((v) => {
    const n = v == null || Number.isNaN(v) ? 50 : v;
    return n <= 1 ? n * 100 : n;
  });

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / normValues.length - Math.PI / 2;
    const distance = radius * (value / 100);
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as [number, number];
  };

  return (
    <svg className="radar" viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} width="100%" height={280}>
      {rings.map((ring) => (
        <polygon
          key={ring}
          className="radar-ring"
          fill="none"
          stroke="#E3E1DA"
          strokeWidth="1"
          points={normValues.map((_, index) => point(index, ring * 100).join(",")).join(" ")}
        />
      ))}
      {normValues.map((_, index) => {
        const [x2, y2] = point(index, 100);
        return (
          <line
            key={index}
            className="radar-line"
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="#E3E1DA"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        className="radar-shape"
        fill="rgba(47, 75, 192, 0.2)"
        stroke={color}
        strokeWidth="2"
        points={normValues.map((value, index) => point(index, value).join(",")).join(" ")}
      />
      {normValues.map((value, index) => {
        const [cx, cy] = point(index, value);
        return (
          <circle key={index} className="radar-dot" cx={cx} cy={cy} r="3" fill={color} stroke="#ffffff" strokeWidth="1.5" />
        );
      })}
      {labels.map((label, index) => {
        const [x, y] = point(index, 1.18 * 100);
        return (
          <text
            key={label}
            className="radar-label"
            x={x}
            y={y}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="#6F7379"
            fontFamily="'IBM Plex Sans', sans-serif"
            fontSize={12}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export const RadarChartSvg = memo(RadarChart);
