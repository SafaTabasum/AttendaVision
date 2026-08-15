'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Name is required'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ['confirmPassword'],
});

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [theme, setTheme] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('theme') || 'light' : 'light'
  );
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      displayName: user?.displayName || '',
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleThemeChange = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', isDark);
  };

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      await updateProfile(user, { displayName: data.displayName });
      toast({
        title: 'Success',
        description: 'Your profile has been updated.',
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile.',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    if (!user || !user.email) return;
    setIsLoadingPassword(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      toast({
        title: 'Success',
        description: 'Your password has been changed.',
      });
      passwordForm.reset();
    } catch (error: any) {
      console.error('Error changing password:', error);
      let description = 'Failed to change password. Please try again.';
      if (error.code === 'auth/wrong-password') {
        description = 'The current password you entered is incorrect.';
      }
      toast({
        variant: 'destructive',
        title: 'Error',
        description,
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };
  
  const handleLogout = () => {
    auth.signOut();
    router.push('/login');
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>Update your name and password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoadingProfile}>
                  {isLoadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>

            <Separator />

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" variant="secondary" disabled={isLoadingPassword}>
                  {isLoadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize your theme preferences.</CardDescription>
            </CardHeader>
            <CardContent>
                <div>
                    <h3 className="text-lg font-medium mb-2">Theme</h3>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="theme-mode"
                            checked={theme === 'dark'}
                            onCheckedChange={handleThemeChange}
                        />
                        <Label htmlFor="theme-mode">Dark Mode</Label>
                    </div>
                </div>
            </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Smart Notifications</CardTitle>
                <CardDescription>Manage your notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {!isTeacher && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="class-reminders" className="flex flex-col space-y-1">
                          <span>Class Reminders</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Get notified 10 minutes before a class starts.
                          </span>
                        </Label>
                        <Switch id="class-reminders" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="qr-active-alerts" className="flex flex-col space-y-1">
                          <span>QR Active Alerts</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Know when a faculty starts a QR session for your class.
                          </span>
                        </Label>
                        <Switch id="qr-active-alerts" defaultChecked />
                      </div>
                    </>
                  )}
                   <div className="flex items-center justify-between">
                      <Label htmlFor="attendance-confirmation" className="flex flex-col space-y-1">
                          <span>Attendance Confirmation</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                            Get instant feedback after marking your attendance.
                          </span>
                      </Label>
                      <Switch id="attendance-confirmation" defaultChecked disabled />
                  </div>
                  <div className="flex items-center justify-between">
                      <Label htmlFor="low-attendance-notifications" className="flex flex-col space-y-1">
                          <span>Low Attendance Alerts</span>
                          <span className="font-normal leading-snug text-muted-foreground">
                          {isTeacher
                            ? "Get notified when class attendance drops below a threshold."
                            : "Get notified when your attendance drops below 80%."
                          }
                          </span>
                      </Label>
                      <Switch id="low-attendance-notifications" />
                  </div>
                  {isTeacher && (
                    <div className="flex items-center justify-between">
                        <Label htmlFor="summary-notifications" className="flex flex-col space-y-1">
                            <span>Daily Summary</span>
                            <span className="font-normal leading-snug text-muted-foreground">
                            Receive a daily summary report for your classes.
                            </span>
                        </Label>
                        <Switch id="summary-notifications" defaultChecked />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Button variant="destructive" className="w-full" onClick={handleLogout}>Log Out</Button>
        </div>
      </div>
    </div>
  );
}
