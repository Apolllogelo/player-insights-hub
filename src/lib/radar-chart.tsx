"use client";

import { memo } from "react";

type RadarChartProps = {
  values: number[];
  labels?: string[];
  size?: number;
  color?: string;
};

const defaultLabels = ["Reflexo", "1×1", "Jogo aéreo", "Reposição", "Posicionamento", "Defesas"];

function RadarChart({ values, labels = defaultLabels, size = 240, color = "var(--primary)" }: RadarChartProps) {
  const center = size / 2;
  const radius = (size / 2) * 0.68;
  const rings = [0.25, 0.5, 0.75, 1];

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
    const distance = radius * (value / 100);
    return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance] as [number, number];
  };

  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {rings.map((ring) => (
        <polygon
          key={ring}
          className="radar-ring"
          fill="none"
          stroke="var(--border)"
          strokeWidth="0.8"
          points={values.map((_, index) => point(index, ring * 100).join(",")).join(" ")}
        />
      ))}
      {values.map((_, index) => {
        const [x2, y2] = point(index, 100);
        return (
          <line
            key={index}
            className="radar-line"
            x1={center}
            y1={center}
            x2={x2}
            y2={y2}
            stroke="var(--muted)"
            strokeWidth="0.8"
          />
        );
      })}
      <polygon
        className="radar-shape"
        fill="rgba(47, 75, 192, 0.2)"
        stroke={color}
        strokeWidth="1.7"
        points={values.map((value, index) => point(index, value).join(",")).join(" ")}
      />
      {values.map((value, index) => {
        const [cx, cy] = point(index, value);
        return (
          <circle key={index} className="radar-dot" cx={cx} cy={cy} r="3" fill={color} stroke="var(--surface)" strokeWidth="1.5" />
        );
      })}
      {labels.map((label, index) => {
        const [x, y] = point(index, 1.22 * 100);
        return (
          <text
            key={label}
            className="radar-label"
            x={x}
            y={y}
            dominantBaseline="middle"
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontFamily="'IBM Plex Sans', sans-serif"
            fontSize={7}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export const RadarChartSvg = memo(RadarChart);
