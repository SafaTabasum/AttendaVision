# AttendaVision Attendance Security Model

## QR proxy-attendance protection

A QR attendance submission is accepted only after:

- Firebase account authentication
- Trusted-device/session verification
- Dynamic QR/session validation
- Existing classroom geolocation/geofence validation
- One attendance per student per class/period

### Device mismatch

If a student account is already enrolled on Device A and someone tries to use the same account from Device B:

- Attendance is rejected.
- No Present record is created.
- A `securityAlerts` document is written.
- The Dean can review it in **Security & Audit Log**.

### IP address

The current public IP is captured by the Vercel/Next.js `/api/client-network` route and stored as an audit signal.

IP is **not** used as the only identity check. Multiple students can legitimately share one public IP through the same Wi-Fi/hotspot. A network-IP change on a trusted device is therefore logged but does not automatically reject attendance.

### Geolocation

The existing geolocation/geofence calculation remains part of QR validation. It was not replaced by IP checking.

### QR photo sent from college to a student at home

The student at home should fail the existing geofence check and receive no attendance record. The attempt can be investigated through the security/audit system if other security checks also flag it.

### Manual attendance fallback

After the teacher submits a period:

- QR-scanned students are Present.
- Students who did not scan remain Absent.
- The teacher can manually mark a genuinely present student Present before submitting.
- The same class/date/period cannot be submitted again after the one-time submission lock is created.


## OTP fallback and same-session device protection

Students can use the 4-digit Manual Entry Code displayed in the teacher's active QR session when the camera/QR scan is unavailable. The same session checks the active session, expiry, teacher location/geofence, trusted account device, and network IP audit signal before recording attendance.

A session claim is stored in `attendanceSessionClaims`. One physical browser/device can claim a teacher session for only one student identity. If another student account attempts to use the same device for the same session, attendance is rejected and a `securityAlerts` record is created for the Dean. Public IP is recorded as an additional audit signal but is not treated as a hard identity check because multiple legitimate students may share one public IP through Wi-Fi or a hotspot.
