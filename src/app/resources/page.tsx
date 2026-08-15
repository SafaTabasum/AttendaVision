'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirebaseApp } from '@/firebase';
import { useDataContext } from '@/context/data-context';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Search, FileText, Video, ClipboardList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import type { Resource } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { SUBJECTS } from '@/lib/timetable';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

const ICONS = {
    note: <FileText className="h-6 w-6 text-muted-foreground" />,
    video: <Video className="h-6 w-6 text-muted-foreground" />,
    assignment: <ClipboardList className="h-6 w-6 text-muted-foreground" />,
};

function toDate(value: unknown): Date {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as any).toDate === 'function') {
        return (value as any).toDate();
    }
    if (value instanceof Date) return value;
    const parsed = new Date(String(value || ''));
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

const ResourceCard = ({ resource, onDownload }: { resource: Resource, onDownload: (id: string) => void }) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start gap-4">
                {ICONS[resource.type]}
                <div className="flex-1">
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Topic: <Badge variant="secondary">{resource.topic}</Badge></p>
                    <p>Uploaded: {format(toDate(resource.createdAt), 'PPP')}</p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Download className="mr-2 h-4 w-4" />
                    {resource.downloadCount} downloads
                </div>
                <Button variant="outline" size="sm" onClick={() => onDownload(resource.id)}>
                    <Download className="mr-2 h-4 w-4" /> Download
                </Button>
            </CardFooter>
        </Card>
    );
};

export default function ResourcesPage() {
    const { user } = useUser();
    const firebaseApp = useFirebaseApp();
    const router = useRouter();
    const { toast } = useToast();
    const { resources, classes, students, incrementDownloadCount } = useDataContext();
    const isTeacher = user?.email?.endsWith('@teacher.com') || user?.email?.endsWith('@faculty.com');

    const myClasses = useMemo(() => {
        if (!user) return [];
        if (isTeacher) return classes; // Assuming teacher has access to all classes for now
        
        const student = students.find(s => s.email?.toLowerCase() === user.email?.toLowerCase());
        if (!student) return [];

        return classes.filter(c => c.students.includes(student.id));

    }, [user, isTeacher, classes, students]);

    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredResources = useMemo(() => {
        return resources.filter(resource => {
            const classMatch = selectedClass === 'all' || resource.topic?.toLowerCase() === selectedClass.toLowerCase() || resource.classId === selectedClass;
            const myClassMatch = isTeacher ? true : (myClasses.some(c => c.id === resource.classId) || Boolean(resource.topic));
            const searchMatch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || resource.description.toLowerCase().includes(searchTerm.toLowerCase()) || resource.topic.toLowerCase().includes(searchTerm.toLowerCase());

            return classMatch && myClassMatch && searchMatch;
        }).sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
    }, [resources, selectedClass, searchTerm, myClasses]);

    const handleDownload = async (resourceId: string) => {
        const resource = resources.find(r => r.id === resourceId);
        if (!resource?.fileUrl) {
            toast({ variant: 'destructive', title: 'File unavailable', description: 'This resource does not have a downloadable file yet.' });
            return;
        }

        try {
            let downloadUrl = resource.fileUrl;
            // Firebase Storage uploads are already stored as downloadable URLs.
            // Keep a small compatibility path for resources that store a Storage path.
            if (!/^https?:\/\//i.test(downloadUrl)) {
                downloadUrl = await getDownloadURL(storageRef(getStorage(firebaseApp), downloadUrl));
            }

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = resource.title || 'resource';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            link.remove();
            incrementDownloadCount(resourceId);
        } catch (error) {
            console.error('Resource download error:', error);
            toast({ variant: 'destructive', title: 'Download failed', description: 'The file could not be downloaded. Please try again.' });
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Notes & Resources</h2>
                {isTeacher && (
                    <Button onClick={() => router.push('/resources/upload')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Upload Resource
                    </Button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {Object.values(SUBJECTS).map(s => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search resources..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredResources.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredResources.map(resource => (
                        <ResourceCard key={resource.id} resource={resource} onDownload={handleDownload} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg">
                    <h3 className="text-xl font-semibold">No Resources Found</h3>
                    <p className="text-muted-foreground mt-2">
                        {isTeacher ? 'Upload a resource to get started.' : 'No resources have been uploaded for this class yet.'}
                    </p>
                </div>
            )}
        </div>
    );
}
