import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, MessageCircle, Users, Calendar } from 'lucide-react';

interface Message {
  id: string;
  title: string;
  content: string;
  sender_id: string;
  recipient_id?: string;
  is_broadcast: boolean;
  created_at: string;
  read: boolean;
  sender?: { first_name: string; last_name: string };
  recipient?: { first_name: string; last_name: string };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function Messages() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('received');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    recipient_id: '',
    is_broadcast: false
  });

  useEffect(() => {
    fetchMessages();
    fetchProfiles();
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:profiles!notifications_user_id_fkey (first_name, last_name)
        `)
        .or(`user_id.eq.${profile?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform notifications to message format
      const transformedMessages = data?.map(notification => ({
        id: notification.id,
        title: notification.title,
        content: notification.message,
        sender_id: notification.user_id,
        recipient_id: notification.user_id,
        is_broadcast: notification.type === 'broadcast',
        created_at: notification.created_at,
        read: notification.read || false,
        sender: notification.sender
      })) || [];
      
      setMessages(transformedMessages);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .order('first_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (formData.is_broadcast && !isAdmin) {
        toast({
          title: "Error",
          description: "Only admins can send broadcast messages",
          variant: "destructive",
        });
        return;
      }

      const recipients = formData.is_broadcast ? profiles : [profiles.find(p => p.id === formData.recipient_id)].filter(Boolean);
      
      for (const recipient of recipients) {
        const { error } = await supabase
          .from('notifications')
          .insert([{
            user_id: recipient.id,
            title: formData.title,
            message: formData.content,
            type: formData.is_broadcast ? 'broadcast' : 'message'
          }]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Message sent to ${recipients.length} recipient(s)`,
      });

      setShowComposeDialog(false);
      resetForm();
      fetchMessages();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      recipient_id: '',
      is_broadcast: false
    });
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
      fetchMessages();
    } catch (error: any) {
      console.error('Error marking message as read:', error);
    }
  };

  const filterMessages = () => {
    return messages.filter(message => {
      if (activeTab === 'received') return message.recipient_id === profile?.id;
      if (activeTab === 'unread') return !message.read && message.recipient_id === profile?.id;
      return true;
    });
  };

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
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">Internal team communication and announcements</p>
        </div>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); }}>
              <Plus className="h-4 w-4 mr-2" />
              Compose Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Compose New Message</DialogTitle>
              <DialogDescription>
                Send a message to team members or broadcast to everyone
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Subject</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="content" className="text-right">Message</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="col-span-3"
                    rows={4}
                    required
                  />
                </div>
                {isAdmin && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Broadcast</Label>
                    <div className="col-span-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.is_broadcast}
                          onChange={(e) => setFormData({ ...formData, is_broadcast: e.target.checked })}
                          className="rounded"
                        />
                        <span>Send to all team members</span>
                      </label>
                    </div>
                  </div>
                )}
                {!formData.is_broadcast && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="recipient" className="text-right">Recipient</Label>
                    <Select value={formData.recipient_id} onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.filter(p => p.id !== profile?.id).map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name} ({profile.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={activeTab === 'received' ? 'default' : 'outline'}
          onClick={() => setActiveTab('received')}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Received
        </Button>
        <Button
          variant={activeTab === 'unread' ? 'default' : 'outline'}
          onClick={() => setActiveTab('unread')}
        >
          <Users className="h-4 w-4 mr-2" />
          Unread
        </Button>
      </div>

      <div className="space-y-4">
        {filterMessages().map((message) => (
          <Card key={message.id} className={`hover:shadow-md transition-shadow ${!message.read ? 'border-primary' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {message.title}
                    {!message.read && <Badge variant="secondary">New</Badge>}
                    {message.is_broadcast && <Badge variant="outline">Broadcast</Badge>}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    <span>From: {message.sender?.first_name} {message.sender?.last_name}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(message.created_at).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                {!message.read && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead(message.id)}
                  >
                    Mark as Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filterMessages().length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No messages found</p>
        </div>
      )}
    </div>
  );
}