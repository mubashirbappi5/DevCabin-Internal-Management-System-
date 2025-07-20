import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Eye, Edit, FileImage, Link as LinkIcon, Calendar, User, Trash2 } from 'lucide-react';

interface WorkSubmission {
  id: string;
  title: string;
  description?: string;
  link_url?: string;
  screenshot_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_needed';
  submitted_by: string;
  project_id?: string;
  task_id?: string;
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  submitter?: { first_name: string; last_name: string };
  reviewer?: { first_name: string; last_name: string };
  projects?: { name: string };
  tasks?: { title: string };
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  project_id: string;
}

export default function WorkSubmissions() {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editingSubmission, setEditingSubmission] = useState<WorkSubmission | null>(null);
  const [reviewingSubmission, setReviewingSubmission] = useState<WorkSubmission | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link_url: '',
    project_id: '',
    task_id: ''
  });
  const [reviewData, setReviewData] = useState({
    status: 'pending' as 'pending' | 'approved' | 'rejected' | 'revision_needed',
    review_notes: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  useEffect(() => {
    fetchSubmissions();
    fetchProjects();
    fetchTasks();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .select(`
          *,
          submitter:profiles!work_submissions_submitted_by_fkey(first_name, last_name),
          reviewer:profiles!work_submissions_reviewed_by_fkey(first_name, last_name),
          projects(name),
          tasks(title)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fetch submissions error:', error);
        throw new Error(error.message || 'Failed to fetch work submissions');
      }
      
      setSubmissions((data as WorkSubmission[]) || []);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch work submissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .order('title');

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      setScreenshotFile(file);
    }
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.user_id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('work-screenshots')
        .upload(fileName, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('work-screenshots')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to submit work",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    console.log('Current profile:', profile);
    console.log('Profile ID being used:', profile.id);
    
    try {
      let screenshotUrl = null;
      if (screenshotFile) {
        screenshotUrl = await uploadScreenshot(screenshotFile);
        if (!screenshotUrl) return;
      }

      const submissionData: any = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        link_url: formData.link_url?.trim() || null,
        screenshot_url: screenshotUrl,
        project_id: formData.project_id || null,
        task_id: formData.task_id || null,
        submitted_by: profile.id,
      };

      // Only set submitted_by for updates, let the database trigger handle it for new submissions
      if (editingSubmission) {
        submissionData.submitted_by = profile.id;
      }

      console.log('Submitting work with data:', submissionData);

      if (editingSubmission) {
        const { data, error } = await supabase
          .from('work_submissions')
          .update(submissionData)
          .eq('id', editingSubmission.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          throw new Error(error.message || 'Failed to update work submission');
        }
        
        toast({
          title: "Success",
          description: "Work submission updated successfully",
        });
      } else {
        const { data, error } = await supabase
          .from('work_submissions')
          .insert([submissionData])
          .select();

        if (error) {
          console.error('Insert error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          
          // Special handling for RLS policy violations
          if (error.code === '42501' || error.message.includes('violates row-level security')) {
            throw new Error('Permission denied: Unable to submit work. Please contact your administrator.');
          }
          
          throw new Error(error.message || 'Failed to create work submission');
        }
        
        toast({
          title: "Success",
          description: "Work submission created successfully",
        });
      }

      setShowAddDialog(false);
      setEditingSubmission(null);
      resetForm();
      fetchSubmissions();
    } catch (error: any) {
      console.error('Work submission error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewingSubmission || !profile?.id) {
      toast({
        title: "Error",
        description: "Unable to submit review. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('work_submissions')
        .update({
          status: reviewData.status,
          review_notes: reviewData.review_notes?.trim() || null,
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reviewingSubmission.id)
        .select();

      if (error) {
        console.error('Review error:', error);
        throw new Error(error.message || 'Failed to submit review');
      }
      
      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      setShowReviewDialog(false);
      setReviewingSubmission(null);
      setReviewData({ status: 'pending', review_notes: '' });
      fetchSubmissions();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      link_url: '',
      project_id: '',
      task_id: ''
    });
    setScreenshotFile(null);
  };

  const handleEdit = (submission: WorkSubmission) => {
    setEditingSubmission(submission);
    setFormData({
      title: submission.title,
      description: submission.description || '',
      link_url: submission.link_url || '',
      project_id: submission.project_id || '',
      task_id: submission.task_id || ''
    });
    setShowAddDialog(true);
  };

  const openReviewDialog = (submission: WorkSubmission) => {
    setReviewingSubmission(submission);
    setReviewData({
      status: submission.status,
      review_notes: submission.review_notes || ''
    });
    setShowReviewDialog(true);
  };

  const handleDelete = async (submission: WorkSubmission) => {
    if (!isAdmin) {
      toast({
        title: "Error",
        description: "Only admins can delete work submissions",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${submission.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_submissions')
        .delete()
        .eq('id', submission.id);

      if (error) {
        console.error('Delete error:', error);
        throw new Error(error.message || 'Failed to delete work submission');
      }
      
      toast({
        title: "Success",
        description: "Work submission deleted successfully",
      });

      fetchSubmissions();
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete work submission. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'revision_needed': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredTasks = tasks.filter(task => 
    !formData.project_id || task.project_id === formData.project_id
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Work Submissions</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Review team work submissions' : 'Submit and track your work'}
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingSubmission(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Work
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSubmission ? 'Edit Submission' : 'Submit Work'}</DialogTitle>
              <DialogDescription>
                {editingSubmission ? 'Update your work submission' : 'Submit your completed work for review'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="link_url" className="text-right">Link</Label>
                  <Input
                    id="link_url"
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="col-span-3"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project_id" className="text-right">Project</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value, task_id: '' })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a project (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="task_id" className="text-right">Task</Label>
                  <Select value={formData.task_id} onValueChange={(value) => setFormData({ ...formData, task_id: value })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a task (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="screenshot" className="text-right">Screenshot</Label>
                  <div className="col-span-3">
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    {screenshotFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {screenshotFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={uploadingFile}>
                  {uploadingFile ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    editingSubmission ? 'Update' : 'Submit'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Review Dialog for Admins */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Submission</DialogTitle>
            <DialogDescription>
              Review and provide feedback on this work submission
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReview}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="review_status" className="text-right">Status</Label>
                <Select value={reviewData.status} onValueChange={(value: any) => setReviewData({ ...reviewData, status: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="revision_needed">Revision Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="review_notes" className="text-right">Notes</Label>
                <Textarea
                  id="review_notes"
                  value={reviewData.review_notes}
                  onChange={(e) => setReviewData({ ...reviewData, review_notes: e.target.value })}
                  className="col-span-3"
                  rows={3}
                  placeholder="Add review comments..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Submit Review</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {submissions.map((submission) => (
          <Card key={submission.id}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <div className="flex-1">
                <CardTitle className="text-lg">{submission.title}</CardTitle>
                <CardDescription className="mt-1">
                  {submission.submitter && (
                    <span className="flex items-center text-sm">
                      <User className="h-3 w-3 mr-1" />
                      {submission.submitter.first_name} {submission.submitter.last_name}
                    </span>
                  )}
                </CardDescription>
              </div>
               <div className="flex gap-2">
                {submission.submitted_by === profile?.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(submission)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {isAdmin && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openReviewDialog(submission)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(submission)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={`${getStatusColor(submission.status)}`}>
                  {submission.status.replace('_', ' ')}
                </Badge>
                <span className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(submission.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {submission.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {submission.description}
                </p>
              )}

              <div className="space-y-2">
                {submission.projects && (
                  <div className="text-sm">
                    <strong>Project:</strong> {submission.projects.name}
                  </div>
                )}
                {submission.tasks && (
                  <div className="text-sm">
                    <strong>Task:</strong> {submission.tasks.title}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {submission.screenshot_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={submission.screenshot_url} target="_blank" rel="noopener noreferrer">
                      <FileImage className="h-4 w-4 mr-1" />
                      Screenshot
                    </a>
                  </Button>
                )}
                {submission.link_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={submission.link_url} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Link
                    </a>
                  </Button>
                )}
              </div>

              {submission.review_notes && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Review Notes:</div>
                  <div className="text-sm text-muted-foreground">{submission.review_notes}</div>
                  {submission.reviewer && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Reviewed by {submission.reviewer.first_name} {submission.reviewer.last_name}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {submissions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No work submissions found</p>
        </div>
      )}
    </div>
  );
}