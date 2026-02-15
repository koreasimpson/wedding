'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface TrendData {
  date: string;
  price: number;
}

interface TrendChartProps {
  data: TrendData[];
  title?: string;
}

export function TrendChart({ data, title }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-card text-center text-sm text-neutral-500">
        시세 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-card">
      {title && <h3 className="mb-4 text-lg font-bold text-neutral-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}억`}
          />
          <Tooltip
            formatter={(value) => {
              const v = Number(value);
              const eok = Math.floor(v / 10000);
              const man = v % 10000;
              return man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;
            }}
            labelFormatter={(label) => `${label}`}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3B82F6' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
