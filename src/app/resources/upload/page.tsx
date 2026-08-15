'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirebaseApp } from '@/firebase';
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
import type { Resource } from '@/lib/data';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const resourceSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().optional(),
  classId: z.string({ required_error: 'Please select a class.' }),
  topic: z.string().min(2, { message: 'Topic is required.' }),
  type: z.enum(['note', 'video', 'assignment'], { required_error: 'Please select a resource type.' }),
  file: z.any()
    .refine((files) => files?.length == 1, 'File is required.')
});

type ResourceFormValues = z.infer<typeof resourceSchema>;

export default function UploadResourcePage() {
  const { user } = useUser();
  const firebaseApp = useFirebaseApp();
  const router = useRouter();
  const { classes, addResource } = useDataContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: { title: '', description: '', topic: '' },
  });

  if (!isTeacher) {
    if (typeof window !== 'undefined') router.replace('/resources');
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  const onSubmit = async (data: ResourceFormValues) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const file = data.file?.[0] as File | undefined;
      if (!file) throw new Error('FILE_REQUIRED');

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `resources/${user.uid}/${Date.now()}-${safeName}`;
      const fileRef = storageRef(getStorage(firebaseApp), storagePath);
      const snapshot = await uploadBytes(fileRef, file, {
        contentType: file.type || 'application/octet-stream',
        contentDisposition: `attachment; filename=\"${safeName}\"`,
      });
      const fileUrl = await getDownloadURL(snapshot.ref);

      const newResource: Resource = {
        id: `res-${Date.now()}`,
        title: data.title,
        description: data.description || '',
        classId: data.classId,
        topic: data.topic,
        type: data.type,
        fileUrl,
        createdAt: new Date().toISOString(),
        uploaderId: user.uid,
        downloadCount: 0,
      };

      await addResource(newResource);

      toast({
        title: 'Resource Uploaded! 🎉',
        description: `${data.title} is now available for students to download.`,
      });

      router.push('/resources');
    } catch (error: any) {
      console.error('Resource upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error?.message === 'FILE_REQUIRED' ? 'Please choose a file to upload.' : 'The file could not be uploaded. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Upload New Resource</h2>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Resource Details</CardTitle>
          <CardDescription>Fill out the form to add a new resource for your students. Resource uploads do not create Dean notices.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Lecture 1 Slides" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea placeholder="A brief summary of the resource..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="classId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="topic" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl><Input placeholder="e.g., Algorithms" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="note">Lecture Note / Slide</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="assignment">Assignment / Worksheet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="file" render={({ field }) => (
                  <FormItem>
                    <FormLabel>File</FormLabel>
                    <FormControl>
                      <Input type="file" onChange={e => field.onChange(e.target.files)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Resource
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
