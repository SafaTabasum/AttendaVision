// II-A Class Timetable - Lords Institute of Engineering and Technology
// Academic Year 2026-2027, Odd Semester
// Effective from 03-08-2026 | Room No. 423

export type Subject = {
  code: string;
  name: string;
  shortName: string;
  teacherEmail: string;
  teacherName: string;
  isLab: boolean;
};

export type Period = {
  periodNo: number;
  startTime: string;
  endTime: string;
  subjectCode: string | null; // null = lunch/break
};

export type DaySchedule = {
  day: string;
  periods: Period[];
};

export const SUBJECTS: Record<string, Subject> = {
  ETC: {
    code: 'ETC',
    name: 'English for Technical Communication',
    shortName: 'ETC',
    teacherEmail: 'afshan@teacher.com',
    teacherName: 'Ms. Afshan Jabeen',
    isLab: false,
  },
  DECO: {
    code: 'DECO',
    name: 'Digital Electronics and Computer Organization',
    shortName: 'DECO',
    teacherEmail: 'surender@teacher.com',
    teacherName: 'Mrs. Surender Kaur',
    isLab: false,
  },
  'M-III': {
    code: 'M-III',
    name: 'Mathematics-III (Probability and Statistics)',
    shortName: 'M-III',
    teacherEmail: 'saleem@teacher.com',
    teacherName: 'Mr. Saleem Yousuf Lone',
    isLab: false,
  },
  DM: {
    code: 'DM',
    name: 'Discrete Mathematics',
    shortName: 'DM',
    teacherEmail: 'nimrah@teacher.com',
    teacherName: 'Ms. Nimrah Parveen',
    isLab: false,
  },
  DS: {
    code: 'DS',
    name: 'Data Structures',
    shortName: 'DS',
    teacherEmail: 'bhargavi@teacher.com',
    teacherName: 'Ms. B. Bhargavi',
    isLab: false,
  },
  'DS-LAB': {
    code: 'DS-LAB',
    name: 'Data Structures Lab',
    shortName: 'DS LAB',
    teacherEmail: 'bhargavi@teacher.com',
    teacherName: 'Ms. B. Bhargavi',
    isLab: true,
  },
  'SS&ES-LAB': {
    code: 'SS&ES-LAB',
    name: 'Soft Skills and Employability Skills Lab',
    shortName: 'SS&ES LAB',
    teacherEmail: 'afshan@teacher.com',
    teacherName: 'Ms. Afshan Jabeen',
    isLab: true,
  },
  'DE-LAB': {
    code: 'DE-LAB',
    name: 'Digital Electronics Lab',
    shortName: 'DE LAB',
    teacherEmail: 'surender@teacher.com',
    teacherName: 'Mrs. Surender Kaur',
    isLab: true,
  },
  NPTEL: {
    code: 'NPTEL',
    name: 'NPTEL',
    shortName: 'NPTEL',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
  'DEPT-MEETING': {
    code: 'DEPT-MEETING',
    name: 'Department Meeting',
    shortName: 'Dept Meeting',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
  SPORTS: {
    code: 'SPORTS',
    name: 'Sports',
    shortName: 'Sports',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
  MENTORING: {
    code: 'MENTORING',
    name: 'Mentoring',
    shortName: 'Mentoring',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
  NAMAZ: {
    code: 'NAMAZ',
    name: 'Namaz Break',
    shortName: 'Namaz',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
  LIBRARY: {
    code: 'LIBRARY',
    name: 'Library',
    shortName: 'Library',
    teacherEmail: '',
    teacherName: '',
    isLab: false,
  },
};

// Period timings from the new II-A timetable.
export const PERIOD_TIMES = [
  { periodNo: 1, startTime: '09:30', endTime: '10:30' },
  { periodNo: 2, startTime: '10:30', endTime: '11:30' },
  { periodNo: 3, startTime: '11:30', endTime: '12:30' },
  { periodNo: 0, startTime: '12:30', endTime: '13:30' }, // Lunch
  { periodNo: 4, startTime: '13:30', endTime: '14:30' },
  { periodNo: 5, startTime: '14:30', endTime: '15:30' },
  { periodNo: 6, startTime: '15:30', endTime: '16:30' },
];

// Full timetable for II-A, as shown in the new timetable image.
export const TIMETABLE: Record<string, (string | null)[]> = {
  MON: ['DS-LAB', 'DS-LAB', 'DS-LAB', null, 'DECO', 'DS', 'DEPT-MEETING'],
  TUE: ['ETC', 'DM', 'M-III', null, 'DS', 'DS', 'SPORTS'],
  WED: ['SS&ES-LAB', 'SS&ES-LAB', 'SS&ES-LAB', null, 'DE-LAB', 'DE-LAB', 'DE-LAB'],
  THU: ['DS', 'DECO', 'DECO', null, 'DM', 'NPTEL', 'MENTORING'],
  FRI: ['DS', 'M-III', 'ETC', null, 'NAMAZ', 'DM', 'M-III'],
  SAT: ['DM', 'DECO', 'M-III', null, 'ETC', 'NPTEL', 'LIBRARY'],
};

export const DAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

// Get today's schedule
export function getTodaySchedule(): { subject: Subject; period: typeof PERIOD_TIMES[0] }[] {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = days[new Date().getDay()];
  const todaySlots = TIMETABLE[today] || [];

  const schedule: { subject: Subject; period: typeof PERIOD_TIMES[0] }[] = [];

  todaySlots.forEach((code, index) => {
    if (code && SUBJECTS[code] && PERIOD_TIMES[index]) {
      schedule.push({
        subject: SUBJECTS[code],
        period: PERIOD_TIMES[index],
      });
    }
  });

  return schedule;
}

// Get teacher's today schedule
// Accounts are provisioned directly in Firebase Auth without a signup flow,
// so a teacher's Auth displayName is usually never set and every screen
// fell back to the generic word "Faculty" instead of an actual name (e.g.
// the dashboard greeting read "Good Morning" / "Hi Faculty," for everyone).
// The real names already live in SUBJECTS as teacherName/teacherEmail, so
// this looks a logged-in teacher's email up against that list as a fallback
// whenever Auth has no displayName set.
export function getTeacherNameByEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  const normalized = email.toLowerCase();
  return Object.values(SUBJECTS).find(s => s.teacherEmail?.toLowerCase() === normalized)?.teacherName;
}

export function getTeacherTodaySchedule(teacherEmail: string): { subject: Subject; period: typeof PERIOD_TIMES[0] }[] {
  return getTodaySchedule().filter(s => s.subject.teacherEmail === teacherEmail);
}

// Check if a period is currently active
export function isCurrentPeriod(startTime: string, endTime: string): boolean {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= start && current < end;
}

// Get period status
export function getPeriodStatus(startTime: string, endTime: string): 'done' | 'active' | 'upcoming' {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const current = now.getHours() * 60 + now.getMinutes();
  if (current >= end) return 'done';
  if (current >= start) return 'active';
  return 'upcoming';
}
