
import { SUBJECTS } from './timetable';

export type Student = {
  id: string;
  name: string;
  avatarUrl: string;
  aiHint: string;
  email?: string;
};

export type Class = {
  id: string;
  name: string;
  students: string[];
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number; // in meters
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  studentLatitude?: number;
  studentLongitude?: number;
};

export type Resource = {
  id: string;
  classId: string;
  title: string;
  description: string;
  type: 'note' | 'video' | 'assignment';
  fileUrl: string;
  topic: string;
  createdAt: string;
  uploaderId: string; // teacher's user ID
  downloadCount: number;
};

export type Grievance = {
  id: string;
  studentId: string;
  classId?: string;
  category: 'attendance' | 'technical' | 'resources' | 'other';
  priority: 'low' | 'medium' | 'high';
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolvedNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  type: 'resource' | 'general' | 'attendance';
  title: string;
  body: string;
  classId?: string;
  resourceId?: string;
  studentId?: string;
  uploaderId: string;
  uploaderName?: string;
  audience?: 'all_students' | 'year' | 'class' | 'section' | 'teachers' | 'department';
  createdAt: any;
};

export const studentsData: Student[] = [];

// Class list is derived directly from the real II-A timetable subjects
// (src/lib/timetable.ts) so the QR-generation dropdown, attendance page,
// and everywhere else that reads `classes` always matches the actual
// timetable — instead of the old placeholder subjects that used to live here.
export const classesData: Class[] = Object.values(SUBJECTS).map(subject => ({
  id: subject.code,
  name: subject.name,
  students: studentsData.map(s => s.id),
  geofenceRadius: 30,
}));


// Attendance is sourced from Firestore only. No fabricated attendance records are seeded.
export const attendanceData: AttendanceRecord[] = [];
