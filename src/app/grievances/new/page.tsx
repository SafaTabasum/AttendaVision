
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser } from '@/firebase';
import { useDataContext } from '@/context/data-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const grievanceSchema = z.object({
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters long.' }),
  category: z.enum(['attendance', 'technical', 'resources', 'other'], { required_error: 'Please select a category.' }),
  classId: z.string().optional(),
  description: z.string().min(20, { message: 'Description must be at least 20 characters long.' }),
});

type GrievanceFormValues = z.infer<typeof grievanceSchema>;

export default function NewGrievancePage() {
    const { user } = useUser();
    const router = useRouter();
    const { classes, addGrievance } = useDataContext();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    
    // For now, students can select from any class. A future improvement would be
    // to link students to their enrolled classes in Firestore.
    const studentClasses = useMemo(() => classes, [classes]);

    const form = useForm<GrievanceFormValues>({
        resolver: zodResolver(grievanceSchema),
        defaultValues: {
            subject: '',
            description: '',
        },
    });

    const onSubmit = async (data: GrievanceFormValues) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to submit a grievance.' });
            return;
        }
        setIsLoading(true);

        const grievancePayload = {
            studentId: user.uid,
            studentEmail: user.email,
            studentName: user.displayName || user.email?.split('@')[0] || 'Student',
            subject: data.subject,
            description: data.description,
            classId: data.classId,
            category: data.category,
            priority: (data.category === 'attendance' ? 'high' : 'medium') as 'low' | 'medium' | 'high',
        };

        try {
            await addGrievance(grievancePayload);

            toast({
                title: 'Grievance Submitted',
                description: `Your issue regarding "${data.subject}" has been received.`,
            });
            
            router.push('/grievances');

        } catch (error) {
            console.error('Error submitting grievance:', error);
             toast({
                variant: 'destructive',
                title: 'Submission Failed',
                description: 'Could not submit your grievance. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!user) {
        if (typeof window !== 'undefined') router.replace('/login');
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight">Submit a New Grievance</h2>
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Issue Details</CardTitle>
                    <CardDescription>Please provide as much detail as possible about the issue you are facing.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <FormControl><Input placeholder="e.g., Incorrect Attendance Mark" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="attendance">Attendance Issue</SelectItem>
                                                    <SelectItem value="resources">Notes & Resources</SelectItem>
                                                    <SelectItem value="technical">Technical Problem</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="classId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Related Class (Optional)</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {studentClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                             <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Detailed Description</FormLabel>
                                        <FormControl><Textarea placeholder="Please describe the issue, including dates, times, and any relevant details..." {...field} rows={6} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                           
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Grievance
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
