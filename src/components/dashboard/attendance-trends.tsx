'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { useDataContext } from '@/context/data-context';

export default function AttendanceTrends() {
  const { attendance, classes } = useDataContext();
  const [data, setData] = useState<{name: string; attendance: number}[]>([]);

  useEffect(() => {
    const getWeeklyData = () => {
      const data = [];
      const today = new Date();
      const classSize = classes.find(c => c.id === 'cs101')?.students.length || 1;
    
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
        const dailyAttendance = attendance.filter(
          (a) => a.date === dateString && a.classId === 'cs101'
        );
        const present = dailyAttendance.filter(
          (a) => a.status === 'present' || a.status === 'late'
        ).length;
        const percentage = classSize > 0 ? (present / classSize) * 100 : 0;
        
        data.push({ name: dayName, attendance: parseFloat(percentage.toFixed(1)) });
      }
      return data;
    };
    setData(getWeeklyData());
  }, [attendance, classes]);

  if (data.length === 0) {
    return <div className="w-full h-[350px] flex items-center justify-center text-muted-foreground">Loading chart...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}%`}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--background))' }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
        />
        <Bar dataKey="attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
