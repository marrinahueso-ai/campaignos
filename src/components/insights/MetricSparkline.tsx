interface MetricSparklineProps {
  values: number[];
  className?: string;
  stroke?: string;
}

export function MetricSparkline({
  values,
  className,
  stroke = "var(--cos-accent, #5f735f)",
}: MetricSparklineProps) {
  const width = 96;
  const height = 36;
  const padding = 2;

  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      >
        <line
          x1={padding}
          x2={width - padding}
          y1={height / 2}
          y2={height / 2}
          stroke={stroke}
          strokeOpacity={0.35}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(maxValue - minValue, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0;

  const path = values
    .map((value, index) => {
      const x = padding + index * step;
      const y =
        padding + innerHeight - ((value - minValue) / range) * innerHeight;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
