
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useDataContext } from '@/context/data-context';


export default function StudentsReportPage() {
    const { attendance, classes, students } = useDataContext();
    const [selectedStudent, setSelectedStudent] = useState<string>(students[0]?.id || '');

    const studentData = useMemo(() => {
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return null;
        
        const records = attendance.filter(a => a.studentId === selectedStudent);
        const present = records.filter(a => a.status === 'present' || a.status === 'late').length;
        const total = records.length;
        const attendancePercentage = total > 0 ? (present / total) * 100 : 0;
        
        const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { student, attendancePercentage, records: sortedRecords };
    }, [selectedStudent, attendance, students]);

    const handleExport = () => {
        if (!studentData) return;
        const dataToExport = studentData.records.map(r => ({
            className: classes.find(c => c.id === r.classId)?.name,
            date: format(new Date(r.date + 'T00:00:00'), "PPP"),
            status: r.status,
        }));
        exportToCsv(`${studentData.student.name}_report.csv`, dataToExport);
    }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Student Reports</h2>
        <div className='flex items-center gap-4'>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport} disabled={!studentData}>
                <Download className='mr-2 h-4 w-4' />
                Export CSV
            </Button>
        </div>
      </div>
      {studentData && (
        <div className='grid gap-6 lg:grid-cols-3'>
            <Card className='lg:col-span-1'>
                <CardHeader className='items-center'>
                     <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={studentData.student.avatarUrl} alt={studentData.student.name} data-ai-hint={studentData.student.aiHint} />
                        <AvatarFallback>{studentData.student.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <CardTitle>{studentData.student.name}</CardTitle>
                    <CardDescription>{studentData.student.email}</CardDescription>
                </CardHeader>
                <CardContent className='text-center'>
                    <div className='text-4xl font-bold'>{studentData.attendancePercentage.toFixed(1)}%</div>
                    <p className='text-sm text-muted-foreground'>Overall Attendance</p>
                    <Progress value={studentData.attendancePercentage} className='mt-4 h-2' />
                </CardContent>
            </Card>
            <Card className='lg:col-span-2'>
                <CardHeader>
                <CardTitle>Detailed Attendance Log</CardTitle>
                <CardDescription>A complete history of attendance for {studentData.student.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {studentData.records.map((record) => {
                        const course = classes.find(c => c.id === record.classId);
                        if (!course) return null;
                        return (
                            <TableRow key={record.id}>
                                    <TableCell>{course.name}</TableCell>
                                    <TableCell>{format(new Date(record.date + 'T00:00:00'), "PPP")}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={record.status === 'absent' ? 'destructive' : record.status === 'late' ? 'secondary' : 'default'} className='capitalize'>
                                            {record.status}
                                        </Badge>
                                    </TableCell>
                            </TableRow>
                        )
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
