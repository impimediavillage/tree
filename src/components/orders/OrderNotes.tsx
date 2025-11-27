'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { MessageSquare, Send } from 'lucide-react';

interface OrderNote {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userEmail: string;
  note: string;
  createdAt: Timestamp;
  isInternal: boolean;
}

interface OrderNotesProps {
  orderId: string;
  orderNumber: string;
}

export function OrderNotes({ orderId, orderNumber }: OrderNotesProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener for notes
  useEffect(() => {
    const notesRef = collection(db, 'orderNotes');
    const q = query(
      notesRef,
      where('orderId', '==', orderId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as OrderNote[];
        
        setNotes(fetchedNotes);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching notes:', error);
        toast({
          title: 'Error',
          description: 'Failed to load order notes',
          variant: 'destructive'
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNote.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const notesRef = collection(db, 'orderNotes');
      await addDoc(notesRef, {
        orderId,
        orderNumber,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'Staff Member',
        userEmail: currentUser.email,
        note: newNote.trim(),
        createdAt: serverTimestamp(),
        isInternal: true // All notes are internal staff notes
      });

      setNewNote('');
      toast({
        title: 'Note Added',
        description: 'Your note has been added to this order'
      });
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Add Internal Note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              placeholder="Add a note for your team (visible to staff only)..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm"
                disabled={!newNote.trim() || isSubmitting}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Order History & Notes ({notes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet. Add the first note above.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {notes.map((note) => (
                <div key={note.id} className="flex gap-3 pb-3 border-b last:border-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10">
                      {getInitials(note.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{note.userName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {note.createdAt && note.createdAt.toDate().toLocaleString('en-ZA', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {note.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
