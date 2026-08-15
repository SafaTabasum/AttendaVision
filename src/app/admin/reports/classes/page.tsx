'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { useDataContext } from '@/context/data-context';
import { Badge } from '@/components/ui/badge';

type DateFilter = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month';

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: 'All Time',
  this_week: 'This Week',
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
};

export default function ClassesReportPage() {
  const { attendance, classes, students } = useDataContext();
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.id || '');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const getDateRange = (filter: DateFilter): { from: Date; to: Date } | null => {
    const now = new Date();
    switch (filter) {
      case 'this_week':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'last_week': {
        const last = subWeeks(now, 1);
        return { from: startOfWeek(last, { weekStartsOn: 1 }), to: endOfWeek(last, { weekStartsOn: 1 }) };
      }
      case 'this_month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'last_month': {
        const last = subMonths(now, 1);
        return { from: startOfMonth(last), to: endOfMonth(last) };
      }
      default: return null;
    }
  };

  const filteredRecords = useMemo(() => {
    if (!selectedClass) return [];
    const range = getDateRange(dateFilter);
    return attendance
      .filter(a => {
        if (a.classId !== selectedClass) return false;
        if (!range) return true;
        const d = new Date(a.date + 'T00:00:00');
        return isWithinInterval(d, { start: range.from, end: range.to });
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedClass, dateFilter, attendance]);

  const presentCount = filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length;
  const absentCount = filteredRecords.filter(r => r.status === 'absent').length;
  const attendanceRate = filteredRecords.length > 0 ? ((presentCount / filteredRecords.length) * 100).toFixed(1) : '0.0';

  const handleExport = () => {
    const dataToExport = filteredRecords.map(r => ({
      studentName: students.find(s => s.id === r.studentId)?.name || 'Unknown',
      date: format(new Date(r.date + 'T00:00:00'), 'PPP'),
      status: r.status,
    }));
    exportToCsv(`${selectedClass}_${dateFilter}_report.csv`, dataToExport);
  };

  const handleWhatsApp = () => {
    const className = classes.find(c => c.id === selectedClass)?.name || selectedClass;
    const filterLabel = DATE_FILTER_LABELS[dateFilter];
    const lines = [
      `📊 *Attendance Report*`,
      `Class: ${className}`,
      `Period: ${filterLabel}`,
      ``,
      `✅ Present: ${presentCount}`,
      `❌ Absent: ${absentCount}`,
      `📈 Rate: ${attendanceRate}%`,
      ``,
      `*Details:*`,
      ...filteredRecords.slice(0, 20).map(r => {
        const student = students.find(s => s.id === r.studentId);
        const date = format(new Date(r.date + 'T00:00:00'), 'dd MMM');
        return `• ${student?.name || 'Unknown'} — ${date} — ${r.status}`;
      }),
      filteredRecords.length > 20 ? `... and ${filteredRecords.length - 20} more records` : '',
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Class Reports</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="last_week">Last Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport} disabled={!selectedClass || filteredRecords.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleWhatsApp} disabled={!selectedClass || filteredRecords.length === 0} className="text-green-600 border-green-600 hover:bg-green-50">
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{absentCount}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Detailed Log — {classes.find(c => c.id === selectedClass)?.name}
            <span className="ml-2 text-sm font-normal text-muted-foreground">({DATE_FILTER_LABELS[dateFilter]})</span>
          </CardTitle>
          <CardDescription>Attendance records for the selected class and period.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? filteredRecords.map((record) => {
                const student = students.find(s => s.id === record.studentId);
                if (!student) return null;
                return (
                  <TableRow key={record.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>{format(new Date(record.date + 'T00:00:00'), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'secondary' : 'destructive'} className="capitalize">
                        {record.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No records found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
