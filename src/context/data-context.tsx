'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { 
  classesData as initialClassesData, 
  type Student, 
  type Class, 
  type AttendanceRecord,
  type Resource,
  type Grievance,
  type AppNotification,
} from '@/lib/data';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore';

export type CampusEvent = {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  description: string;
  createdAt?: any;
  createdBy?: string;
  createdByName?: string;
};

interface DataContextProps {
  students: Student[];
  classes: Class[];
  attendance: AttendanceRecord[];
  resources: Resource[];
  grievances: Grievance[];
  notifications: AppNotification[];
  campusEvents: CampusEvent[];
  addAttendanceRecord: (record: AttendanceRecord) => void;
  updateClassGeofence: (classId: string, lat: number, lon: number, radius: number) => void;
  addResource: (resource: Resource) => Promise<void>;
  incrementDownloadCount: (resourceId: string) => void;
  addGrievance: (grievance: Omit<Grievance, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateGrievanceStatus: (grievanceId: string, status: Grievance['status'], resolvedNote?: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
  addCampusEvent: (event: Omit<CampusEvent, 'id' | 'createdAt'>) => Promise<void>;
}

const DataContext = createContext<DataContextProps | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();
  const { user } = useUser();
  const isDean = user?.email?.endsWith('@dean.com');
  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');

  // Students — live from Firestore for dean/teacher
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    if (isDean || isTeacher) return query(collection(firestore, 'users'), where('role', '==', 'student'));
    return null;
  }, [firestore, user, isDean, isTeacher]);
  const { data: liveStudents } = useCollection<Student>(studentsQuery);
  const students = useMemo(() => {
    if (isDean || isTeacher) return (liveStudents || []) as Student[];
    return [];
  }, [liveStudents, isDean, isTeacher]);
  const [classes, setClasses] = useState<Class[]>(initialClassesData);

  // Attendance — live from Firestore
  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const col = collection(firestore, 'attendance');
    if (isDean || isTeacher) {
      return query(col);
    } else {
      return query(col, where('studentId', '==', user.uid));
    }
  }, [firestore, user, isDean, isTeacher]);

  const { data: liveAttendance } = useCollection<AttendanceRecord>(attendanceQuery);
  const attendance = useMemo(() => liveAttendance || [], [liveAttendance]);

  // Grievances — live from Firestore, dean-only for full list
  const grievancesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const grievancesCol = collection(firestore, 'grievances');
    if (isDean) {
      return query(grievancesCol);
    } else {
      return query(grievancesCol, where('studentId', '==', user.uid));
    }
  }, [firestore, user, isDean, isTeacher]);

  const { data: liveGrievances } = useCollection<Grievance>(grievancesQuery);
  const grievances = useMemo(() => liveGrievances || [], [liveGrievances]);

  // Resources — live from Firestore (all users see the same data)
  const resourcesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'resources');
  }, [firestore, user]);

  const { data: liveResources } = useCollection<Resource>(resourcesQuery);
  const resources = useMemo(() => liveResources || [], [liveResources]);

  // Notifications — live from Firestore (all users see them)
  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'notifications');
  }, [firestore, user]);

  const { data: liveNotifications } = useCollection<AppNotification>(notificationsQuery);
  const notifications = useMemo(() => {
    const n = liveNotifications || [];
    return [...n].sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const db = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return db.getTime() - da.getTime();
    });
  }, [liveNotifications]);

  const campusEventsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'campusEvents');
  }, [firestore, user]);

  const { data: liveCampusEvents } = useCollection<CampusEvent>(campusEventsQuery);
  const campusEvents = useMemo(() => {
    const events = liveCampusEvents || [];
    return [...events].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [liveCampusEvents]);

  const addAttendanceRecord = useCallback((record: AttendanceRecord) => {
    // Used for manual/local updates; QR scans write directly to Firestore
  }, []);

  const updateClassGeofence = useCallback((classId: string, latitude: number, longitude: number, geofenceRadius: number) => {
    setClasses(prevClasses => 
        prevClasses.map(c => 
            c.id === classId ? { ...c, latitude, longitude, geofenceRadius } : c
        )
    );
  }, []);

  const addResource = useCallback(async (resource: Resource) => {
    if (!firestore) return;
    const resourcesCol = collection(firestore, 'resources');
    await addDoc(resourcesCol, {
      ...resource,
      createdAt: serverTimestamp(),
    });
  }, [firestore]);

  const incrementDownloadCount = useCallback((resourceId: string) => {
    if (!firestore) return;
    const resourceRef = doc(firestore, 'resources', resourceId);
    updateDoc(resourceRef, { downloadCount: (resources.find(r => r.id === resourceId)?.downloadCount || 0) + 1 })
      .catch(e => console.error('incrementDownloadCount error:', e));
  }, [firestore, resources]);

  const addGrievance = useCallback(async (grievance: Omit<Grievance, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    if (!firestore) return;
    const grievancesCol = collection(firestore, 'grievances');
    await addDoc(grievancesCol, {
        ...grievance,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
  }, [firestore]);

  const updateGrievanceStatus = useCallback(async (grievanceId: string, status: Grievance['status'], resolvedNote?: string) => {
    if (!firestore) return;
    const grievanceRef = doc(firestore, 'grievances', grievanceId);
    const updateData: any = { status, updatedAt: serverTimestamp() };
    if (resolvedNote !== undefined) updateData.resolvedNote = resolvedNote;
    await updateDoc(grievanceRef, updateData);
  }, [firestore]);

  const addNotification = useCallback(async (notification: Omit<AppNotification, 'id' | 'createdAt'>) => {
    if (!firestore) return;
    await addDoc(collection(firestore, 'notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
    });
  }, [firestore]);

  const addCampusEvent = useCallback(async (event: Omit<CampusEvent, 'id' | 'createdAt'>) => {
    if (!firestore) return;
    await addDoc(collection(firestore, 'campusEvents'), {
      ...event,
      createdAt: serverTimestamp(),
    });
  }, [firestore]);

  return (
    <DataContext.Provider value={{ students, classes, attendance, resources, grievances, notifications, campusEvents, addAttendanceRecord, updateClassGeofence, addResource, incrementDownloadCount, addGrievance, updateGrievanceStatus, addNotification, addCampusEvent }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};
