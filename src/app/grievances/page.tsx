'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@/firebase';
import { useDataContext } from '@/context/data-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, MessageSquare, ShieldAlert, CheckCircle, Clock, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  open: 'destructive',
  in_progress: 'secondary',
  resolved: 'default',
  closed: 'outline',
};

const statusIcon: { [key: string]: React.ReactNode } = {
  open: <ShieldAlert className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  closed: <MessageSquare className="h-4 w-4" />,
};

const priorityVariant: { [key: string]: 'destructive' | 'secondary' | 'default' } = {
  high: 'destructive',
  medium: 'secondary',
  low: 'default',
};

export default function GrievancesPage() {
  const { user } = useUser();
  const router = useRouter();
  const { grievances, students, classes, updateGrievanceStatus } = useDataContext();

  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');
  const isDean = user?.email?.endsWith('@dean.com');

  const [statusFilter, setStatusFilter] = useState('all');

  // Reply dialog state
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyGrievanceId, setReplyGrievanceId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string>('resolved');

  // Teachers should not see grievances — redirect away
  if (isTeacher) {
    router.replace('/dashboard');
    return null;
  }

  const myGrievances = useMemo(() => {
    if (!user) return [];
    let filtered = grievances;

    if (isDean) {
      if (statusFilter !== 'all') filtered = filtered.filter(g => g.status === statusFilter);
    } else {
      // Match by Firebase UID (studentId saved as user.uid)
      filtered = filtered.filter(g => g.studentId === user.uid);
      if (statusFilter !== 'all') filtered = filtered.filter(g => g.status === statusFilter);
    }

    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt && (a.createdAt as any).toDate ? (a.createdAt as any).toDate() : new Date(a.createdAt);
      const dateB = b.createdAt && (b.createdAt as any).toDate ? (b.createdAt as any).toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [user, isDean, grievances, students, statusFilter]);

  const handleStatusChange = (grievanceId: string, newStatus: string) => {
    if (newStatus === 'resolved') {
      setReplyGrievanceId(grievanceId);
      setPendingStatus(newStatus);
      setReplyText('');
      setReplyDialogOpen(true);
    } else {
      updateGrievanceStatus(grievanceId, newStatus as any);
    }
  };

  const handleReplySubmit = () => {
    updateGrievanceStatus(replyGrievanceId, pendingStatus as any, replyText.trim() || undefined);
    setReplyDialogOpen(false);
    setReplyText('');
  };

  const getFormattedDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : parseISO(date);
    return format(d, 'PPP');
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">
          {isDean ? 'Student Grievances' : 'My Grievances'}
        </h2>
        {!isDean && (
          <Button onClick={() => router.push('/grievances/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Submit New Grievance
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Grievance Log</CardTitle>
            <CardDescription>
              {isDean ? 'Review and manage student-submitted issues.' : 'Track the status of your submitted issues.'}
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Solved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {isDean && <TableHead>Student</TableHead>}
                <TableHead>Subject / Class</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myGrievances.length > 0 ? myGrievances.map((grievance) => {
                const student = students.find(s => s.id === grievance.studentId);
                const course = classes.find(c => c.id === grievance.classId);
                const isResolved = grievance.status === 'resolved';

                return (
                  <TableRow key={grievance.id}>
                    {isDean && (
                      <TableCell>
                        <div className="font-medium">{student?.name || (grievance as any).studentName || grievance.studentId}</div>
                        <div className="text-sm text-muted-foreground">{student?.email || (grievance as any).studentEmail || ''}</div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="font-semibold">{grievance.subject}</div>
                      {course && <div className="text-sm text-muted-foreground">{course.name}</div>}
                      {!isDean && isResolved && grievance.resolvedNote && (
                        <div className="mt-1 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded p-1.5">
                          💬 Dean: {grievance.resolvedNote}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell capitalize">{grievance.category}</TableCell>
                    <TableCell className="hidden sm:table-cell">{getFormattedDate(grievance.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={priorityVariant[grievance.priority]} className="capitalize">{grievance.priority}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isDean ? (
                        <Select value={grievance.status} onValueChange={(val) => handleStatusChange(grievance.id, val)}>
                          <SelectTrigger className="w-[140px] capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Solved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isResolved ? 'default' : statusVariant[grievance.status]} className="capitalize flex items-center gap-1">
                          {isResolved ? <CheckCircle className="h-4 w-4" /> : statusIcon[grievance.status]}
                          {isResolved ? 'Solved ✓' : grievance.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={isDean ? 6 : 5} className="h-24 text-center">
                    No grievances found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Solved</DialogTitle>
            <DialogDescription>
              Optionally add a reply message for the student before marking this grievance as solved.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Type your reply to the student (optional)..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReplySubmit}>
              <Send className="mr-2 h-4 w-4" />
              Mark as Solved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
