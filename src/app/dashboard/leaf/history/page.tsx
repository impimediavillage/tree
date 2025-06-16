
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import type { AIInteractionLog, User } from '@/types'; // Ensure AIInteractionLog is defined in types
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export default function LeafHistoryPage() {
  const [interactions, setInteractions] = useState<AIInteractionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing current user from localStorage", e);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          const logsCollectionRef = collection(db, 'aiInteractionsLog');
          const q = query(
            logsCollectionRef, 
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
          );
          const querySnapshot = await getDocs(q);
          const fetchedLogs: AIInteractionLog[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedLogs.push({
              id: doc.id,
              ...data,
              timestamp: (data.timestamp as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
            } as AIInteractionLog);
          });
          setInteractions(fetchedLogs);
        } catch (error) {
          console.error("Error fetching interaction history:", error);
          // Handle error display to user if necessary
        } finally {
          setIsLoading(false);
        }
      };
      fetchHistory();
    }
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle 
            className="text-2xl text-foreground"
            style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
          >AI Interaction History</CardTitle>
          <CardDescription 
            className="text-foreground"
            style={{ textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #fff' }}
          >
            Review your past interactions with our AI advisors and the credits used for each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading history...</p>}
          {!isLoading && interactions.length === 0 && (
            <p>You have no interaction history yet.</p>
          )}
          {!isLoading && interactions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Advisor</TableHead>
                  <TableHead className="text-right">Credits Used</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interactions.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.timestamp ? format(new Date(log.timestamp), 'PPpp') : 'N/A'}
                    </TableCell>
                    <TableCell>{log.advisorSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                    <TableCell className="text-right">{log.creditsUsed}</TableCell>
                    <TableCell>
                      <Badge variant={log.wasFreeInteraction ? "secondary" : "outline"}>
                        {log.wasFreeInteraction ? 'Free' : 'Paid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

