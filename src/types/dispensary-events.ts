import { Timestamp } from 'firebase/firestore';

export interface DispensaryEvent {
  id?: string;
  dispensaryId: string;
  dispensaryName: string;
  title: string;
  description: string;
  flyerUrl?: string;
  eventDate: Timestamp;
  endDate?: Timestamp;
  location?: string;
  isVirtual: boolean;
  virtualLink?: string;
  category: 'workshop' | 'sale' | 'community' | 'education' | 'social' | 'wellness' | 'other';
  tags?: string[];
  maxAttendees?: number;
  currentAttendees: number;
  isPublished: boolean;
  isFeatured: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

export interface EventLike {
  id?: string;
  eventId: string;
  dispensaryId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  createdAt: Timestamp;
}

export interface EventComment {
  id?: string;
  eventId: string;
  dispensaryId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  comment: string;
  parentCommentId?: string; // For replies
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isEdited: boolean;
  likesCount: number;
}

export interface EventAttendee {
  id?: string;
  eventId: string;
  dispensaryId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhotoUrl?: string;
  status: 'going' | 'interested' | 'maybe' | 'not-going';
  registeredAt: Timestamp;
  checkedIn: boolean;
  checkedInAt?: Timestamp;
}

export interface EventNotification {
  id?: string;
  eventId: string;
  dispensaryId: string;
  type: 'new_comment' | 'new_like' | 'new_attendee' | 'event_reminder' | 'event_update';
  message: string;
  read: boolean;
  createdAt: Timestamp;
  relatedUserId?: string;
  relatedUserName?: string;
}
