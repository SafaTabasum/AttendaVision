import { doc, getDoc, updateDoc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

const DEVICE_KEY = 'attendavision-device-id';

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = createId();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function getPublicIp() {
  try {
    const response = await fetch('/api/client-network', { cache: 'no-store' });
    if (!response.ok) return 'unknown';
    const data = await response.json();
    return typeof data.ip === 'string' ? data.ip : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function registerOrCheckDevice(firestore: Firestore, user: User) {
  const deviceId = getDeviceId();
  const ip = await getPublicIp();
  const userRef = doc(firestore, 'users', user.uid);
  const snap = await getDoc(userRef);
  const data = snap.exists() ? snap.data() : {};
  const trustedDeviceId = typeof data.trustedDeviceId === 'string' ? data.trustedDeviceId : '';
  const trustedIp = typeof data.trustedIp === 'string' ? data.trustedIp : '';

  if (!trustedDeviceId) {
    await updateDoc(userRef, {
      trustedDeviceId: deviceId,
      trustedIp: ip,
      securityDeviceRegisteredAt: serverTimestamp(),
    });
    return { allowed: true, deviceId, ip, trustedIp: ip, deviceMismatch: false, ipChanged: false };
  }

  // A device mismatch (new phone, reinstalled app, cleared browser storage,
  // private/incognito mode generating a fresh local id, etc.) is logged as a
  // signal for the Dean, but no longer hard-blocks attendance. Previously
  // this permanently locked a student out the moment their device id
  // changed for ANY reason, with no way to self-recover — which looked
  // exactly like "the scanner/4-digit code stopped working" even though the
  // student was standing in class. The trusted device is refreshed to the
  // current one so repeat use from the new device won't keep re-flagging.
  const deviceMismatch = trustedDeviceId !== deviceId;
  if (deviceMismatch) {
    await updateDoc(userRef, {
      trustedDeviceId: deviceId,
      trustedIp: ip,
      securityDeviceRegisteredAt: serverTimestamp(),
    });
  }

  return {
    allowed: true,
    deviceId,
    ip,
    trustedIp,
    deviceMismatch,
    ipChanged: !!trustedIp && ip !== 'unknown' && trustedIp !== ip,
  };
}

export async function claimAttendanceSession(
  firestore: Firestore,
  user: User,
  sessionId: string,
  details: { classId: string; periodKey?: string; ip?: string; deviceId?: string }
) {
  const deviceId = details.deviceId || getDeviceId();
  const claimId = `${sessionId}_${deviceId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  const claimRef = doc(firestore, 'attendanceSessionClaims', claimId);

  return runTransaction(firestore, async transaction => {
    const snap = await transaction.get(claimRef);
    if (snap.exists()) {
      const data = snap.data() as any;
      // The same device was already used to mark a different student
      // present in this session. This is still surfaced to the Dean as a
      // "shared device" signal (see the caller's logSecurityAttempt call),
      // but it no longer blocks attendance outright — a hard block here
      // made the QR/code flow look completely broken for every student
      // after the very first one scanned from a shared or classroom
      // device (e.g. a teacher demoing with one phone, or students
      // legitimately sharing a single device to scan one after another).
      return {
        allowed: true,
        claimId,
        existingStudentId: data.studentId || '',
        sharedDevice: data.studentId !== user.uid,
      };
    }

    transaction.set(claimRef, {
      sessionId,
      studentId: user.uid,
      classId: details.classId,
      periodKey: details.periodKey || null,
      deviceId,
      ip: details.ip || 'unknown',
      claimedAt: serverTimestamp(),
    });
    return { allowed: true, claimId, existingStudentId: '', sharedDevice: false };
  });
}

export async function logSecurityAttempt(
  firestore: Firestore,
  user: User,
  details: {
    classId?: string;
    className?: string;
    periodKey?: string;
    sessionId?: string;
    currentIp: string;
    trustedIp?: string;
    deviceMismatch: boolean;
    ipChanged: boolean;
    reason: string;
  }
) {
  const id = `${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(firestore, 'securityAlerts', id), {
    id,
    studentId: user.uid,
    studentEmail: user.email || null,
    studentName: user.displayName || user.email || user.uid,
    ...details,
    createdAt: serverTimestamp(),
    status: 'open',
  });
}
