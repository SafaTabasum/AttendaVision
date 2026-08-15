'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck, MailCheck } from 'lucide-react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { registerOrCheckDevice } from '@/lib/attendance-security';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function roleFromAccount(email: string, storedRole?: string) {
  if (storedRole === 'dean' || email.toLowerCase().endsWith('@dean.com')) return 'dean';
  if (storedRole === 'teacher' || email.toLowerCase().endsWith('@teacher.com') || email.toLowerCase().endsWith('@faculty.com')) return 'teacher';
  return 'student';
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [show, setShow] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      const db = getFirestore();
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      const role = roleFromAccount(data.email, snap.exists() ? (snap.data() as any).role : undefined);
      // Register the first trusted device for this account. A later login from
      // another device is flagged at attendance time instead of silently
      // allowing proxy attendance.
      try { await registerOrCheckDevice(db, cred.user); } catch (securityError) {
        console.warn('Device registration could not be completed:', securityError);
      }
      router.push(role === 'dean' ? '/admin/dashboard' : '/dashboard');
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Login failed', description: e?.code?.startsWith('auth/') ? 'Invalid email or password.' : 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    const email = form.getValues('email').trim();
    if (!email) {
      toast({ variant: 'destructive', title: 'Enter your email first', description: 'Enter the college email address, then choose Forgot Password.' });
      return;
    }
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Password reset email sent', description: 'Check your email and use the secure Firebase reset link to create a new password.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Could not send reset email', description: e?.code === 'auth/user-not-found' ? 'No account exists for that email address.' : 'Please check the email address and try again.' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] p-5">
      <div className="w-full max-w-[430px]">
        <div className="mb-8">
          <div className="mb-7 text-3xl font-black tracking-tight text-[#171827]">Attenda<span className="text-[#4b4680]">Vision</span></div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9e8f2] text-[#37336e]"><ShieldCheck className="h-7 w-7" /></div>
          <h1 className="text-3xl font-extrabold text-[#171827]">Sign in to your Account</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your login credentials provided by the College</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel className="text-slate-500">Email<span className="text-[#d95878]">*</span></FormLabel><FormControl><Input {...field} className="h-14 rounded-2xl border-0 bg-white shadow-sm" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem><FormLabel className="text-slate-500">Password<span className="text-[#d95878]">*</span></FormLabel><FormControl><div className="relative"><Input type={show ? 'text' : 'password'} {...field} className="h-14 rounded-2xl border-0 bg-white pr-12 shadow-sm" /><button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-4 text-[#37336e]">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex items-center justify-between text-xs font-semibold text-[#171827]">
              <span>Trouble logging in?</span>
              <button type="button" disabled={resetting} onClick={forgotPassword} className="inline-flex items-center gap-1 text-[#37336e] disabled:opacity-60">{resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MailCheck className="h-3.5 w-3.5" />} Forgot Password?</button>
            </div>
            <p className="rounded-xl bg-[#f0eefb] px-3 py-2 text-xs text-[#4b4680]">Your account type is detected automatically from your college account. No Student / Teacher / Dean selection is required.</p>
            <Button type="submit" disabled={loading} className="h-14 w-full rounded-2xl bg-[#37336e] text-base font-bold hover:bg-[#2f2b60]">{loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Login</Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
