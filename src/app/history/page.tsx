'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '@/firebase';
import { useDataContext } from '@/context/data-context';
import { format, addDays, startOfWeek, isSameDay, getDaysInMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, BarChart2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';


// --- TEACHER VIEW ---
const TeacherHistoryView = () => {
    const { attendance, students, classes } = useDataContext();
    const [allRecords, setAllRecords] = useState([...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    const [filteredRecords, setFilteredRecords] = useState(allRecords);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
        present: 'default',
        late: 'secondary',
        absent: 'destructive',
    };

    useEffect(() => {
        setAllRecords([...attendance].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [attendance]);

    useEffect(() => {
        let records = allRecords;
        
        if (searchTerm) {
        records = records.filter(record => {
            const student = students.find(s => s.id === record.studentId);
            if (!student) return false;
            return student.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
        }
        
        if (dateRange?.from) {
            records = records.filter(record => {
                const recordDate = new Date(record.date + 'T00:00:00');
                
                if (dateRange.to) {
                    // Range selection
                    const from = dateRange.from!;
                    const to = dateRange.to!;
                    return recordDate >= from && recordDate <= to;
                } else {
                    // Single day selection
                    return isSameDay(recordDate, dateRange.from!);
                }
            });
        }


        setFilteredRecords(records);
    }, [searchTerm, dateRange, allRecords, students]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="text-3xl font-bold tracking-tight">Attendance History</h2>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search student..."
                    className="pl-9 w-full sm:w-[200px] lg:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                <Popover>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className="w-full sm:w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                        dateRange.to ? (
                        <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(dateRange.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date range</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    />
                </PopoverContent>
                </Popover>
            </div>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>All Records</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map((record) => {
                    const student = students.find(s => s.id === record.studentId);
                    const course = classes.find(c => c.id === record.classId);
                    // Use studentEmail/studentName from record if student not found in local data
                    const studentName = student?.name || (record as any).studentName || (record as any).studentEmail || record.studentId;
                    const studentInitials = studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                    const courseName = course?.name || (record as any).className || record.classId;
                    if (!courseName) return null;

                    return (
                    <TableRow key={record.id}>
                        <TableCell>
                            <div className="flex items-center gap-3">
                            <Avatar className="hidden h-9 w-9 sm:flex">
                                <AvatarImage src={student?.avatarUrl || ''} alt={studentName} />
                                <AvatarFallback>{studentInitials}</AvatarFallback>
                            </Avatar>
                            <div className="font-medium">{studentName}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                        <div className="text-sm text-muted-foreground">
                            {courseName}
                        </div>
                        </TableCell>
                        <TableCell>
                        {format(new Date(record.date + 'T00:00:00'), "PPP")}
                        </TableCell>
                        <TableCell className="text-right">
                        <Badge className="capitalize" variant={statusVariant[record.status]}>{record.status}</Badge>
                        </TableCell>
                    </TableRow>
                    );
                }) : (
                    <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No records found.
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

// --- STUDENT VIEW ---

type AttendanceStatusInfo = {
  text: string;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
};

const getStatusInfo = (percentage: number): AttendanceStatusInfo => {
  if (percentage >= 90) return { text: "Excellent!", color: "text-green-600", badgeVariant: 'default' };
  if (percentage >= 75) return { text: "Good", color: "text-yellow-600", badgeVariant: 'secondary' };
  if (percentage >= 60) return { text: "Needs Improvement", color: "text-orange-500", badgeVariant: 'outline' };
  return { text: "Critical - Meet Advisor", color: "text-red-600", badgeVariant: 'destructive' };
};


const StudentAttendanceScreen = () => {
    const { attendance, classes, students } = useDataContext();
    const { user } = useUser();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const studentId = useMemo(() => {
        if (!user) return null;
        let student = students.find(s => s.email?.toLowerCase() === user.email?.toLowerCase());
        if (!student) {
            student = students.find(s => s.name.toLowerCase().includes(user.displayName?.toLowerCase() || ''));
        }
        return student?.id;
    }, [user, students]);

    const monthData = useMemo(() => {
        if (!studentId) return { overall: { percentage: 0, present: 0, total: 0, absent: 0 }, bySubject: [] };

        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const recordsInMonth = attendance.filter(a => {
            const recordDate = new Date(a.date);
            return a.studentId === studentId && isSameMonth(recordDate, currentMonth);
        });
        
        const enrolledClasses = classes.filter(c => c.students.includes(studentId));
        
        // This is a simplified calculation. A real-world app would need to know the exact number of scheduled classes.
        const scheduledDaysInMonth = eachDayOfInterval({start: monthStart, end: monthEnd}).filter(day => day.getDay() !== 0 && day.getDay() !== 6); // Mon-Fri
        const totalClassesInMonth = enrolledClasses.length * scheduledDaysInMonth.length;

        const presentCount = recordsInMonth.filter(a => a.status === 'present' || a.status === 'late').length;
        const overallPercentage = totalClassesInMonth > 0 ? (presentCount / totalClassesInMonth) * 100 : 0;

        const bySubject = enrolledClasses.map(c => {
            const subjectRecords = recordsInMonth.filter(a => a.classId === c.id);
            const present = subjectRecords.filter(a => a.status === 'present' || a.status === 'late').length;
            const totalScheduled = scheduledDaysInMonth.length; // Simplified
            const percentage = totalScheduled > 0 ? (present / totalScheduled) * 100 : 0;
            return {
                id: c.id,
                name: c.name,
                time: '9:00 AM - 10:30 AM', // Mock
                percentage,
                present,
                total: totalScheduled,
                statusInfo: getStatusInfo(percentage)
            };
        });

        return {
            overall: {
                percentage: overallPercentage,
                present: presentCount,
                total: totalClassesInMonth,
                absent: totalClassesInMonth - presentCount,
            },
            bySubject
        };

    }, [currentMonth, attendance, classes, studentId]);

    const overallStatus = getStatusInfo(monthData.overall.percentage);

    const handleMonthChange = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'prev' ? -1 : 1), 1));
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-6 bg-muted/20">
             <div className="flex items-center justify-between">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                        <ChevronLeft className="h-6 w-6" />
                        <span className="sr-only">Back</span>
                    </Button>
                </Link>
                <h2 className="text-xl font-bold">Attendance</h2>
                <div className="w-10" />
            </div>

             <Card>
                <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={() => handleMonthChange('prev')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h3 className="text-center font-semibold uppercase tracking-wider">{format(currentMonth, 'MMM yyyy')}</h3>
                        <Button variant="ghost" size="icon" onClick={() => handleMonthChange('next')}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
             </Card>

            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-base font-semibold'><BarChart2 className='h-5 w-5' />Overall Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className='text-center'>
                         <p className="text-4xl font-bold">{monthData.overall.percentage.toFixed(1)}%</p>
                         <p className={cn("font-semibold", overallStatus.color)}>{overallStatus.text}</p>
                     </div>
                     <Progress value={monthData.overall.percentage} className='h-2' />
                     <div className='flex justify-around text-center'>
                        <div>
                            <p className='font-bold text-lg flex items-center justify-center gap-1'><Check className='text-green-500 h-5 w-5'/> {monthData.overall.present}</p>
                            <p className='text-xs text-muted-foreground'>Present</p>
                        </div>
                        <div>
                            <p className='font-bold text-lg flex items-center justify-center gap-1'><X className='text-red-500 h-5 w-5'/> {monthData.overall.absent}</p>
                            <p className='text-xs text-muted-foreground'>Absent</p>
                        </div>
                     </div>
                </CardContent>
            </Card>
            
            <div className="space-y-3 pt-4">
                 <h3 className="px-2 text-lg font-semibold tracking-tight">Subject-wise Attendance</h3>
                {monthData.bySubject.map(subject => (
                <Card key={subject.id}>
                    <CardContent className="p-4 space-y-3">
                        <div>
                            <p className="font-semibold">{subject.name}</p>
                            <p className="text-xs text-muted-foreground">{subject.time} | Class</p>
                        </div>
                        <Progress value={subject.percentage} className='h-2' />
                        <div className='flex justify-between items-center text-sm'>
                            <p className='font-semibold'>{subject.percentage.toFixed(1)}%</p>
                            <p className='text-muted-foreground'>
                                <span className={cn("font-semibold", subject.statusInfo.color)}>{subject.present}</span>/{subject.total} classes
                            </p>
                            <Badge variant={subject.statusInfo.badgeVariant}>{subject.statusInfo.text}</Badge>
                        </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        </div>
    );
};

export default function HistoryPage() {
    const { user } = useUser();
    const isTeacherOrDean = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com') || user?.email?.endsWith('@dean.com');
  
    if (isTeacherOrDean) {
      return <TeacherHistoryView />;
    }
  
    return <StudentAttendanceScreen />;
}
