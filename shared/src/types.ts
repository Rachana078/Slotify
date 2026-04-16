// Domain entities

export interface Coach {
  id: string;
  name: string;
  email: string;
  phone?: string;
  timezone: string;
  created_at: string;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  coach_id: string;
  created_at: string;
}

export interface Student {
  id: string;
  name: string;
  parent_id: string;
  coach_id: string;
  created_at: string;
}

export interface Availability {
  id: string;
  coach_id: string;
  date: string; // ISO date: YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  slot_duration_min: number;
  created_at: string;
}

export type SessionStatus = 'open' | 'booked' | 'cancelled' | 'blocked';

export interface Session {
  id: string;
  coach_id: string;
  student_id?: string;
  availability_id?: string;
  start_time: string; // ISO timestamptz
  end_time: string;
  status: SessionStatus;
  created_at: string;
  // joined fields
  student?: Student;
  parent?: Parent;
}

export interface Waitlist {
  id: string;
  session_id: string;
  parent_id: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  recipient_type: 'coach' | 'parent';
  type: string;
  message: string;
  read: boolean;
  sent_at: string;
}

export interface FcmToken {
  id: string;
  user_id: string;
  user_type: 'coach' | 'parent';
  token: string;
  created_at: string;
}

// API request/response types

export interface CreateAvailabilityRequest {
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  slot_duration_min?: number; // default 60
}

export interface CreateAvailabilityResponse {
  availability: Availability;
  sessions_created: number;
}

export interface GetSessionsQuery {
  coach_id?: string;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
}

export interface BookSessionRequest {
  student_id: string;
}

export interface BookSessionResponse {
  session: Session;
}

export interface SaveFcmTokenRequest {
  token: string;
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface CoachInvite {
  id: string;
  coach_id: string;
  token: string;
  email?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

export interface GenerateInviteResponse {
  invite: CoachInvite;
  invite_url: string;
}

export interface RedeemInviteRequest {
  name: string;
  student_name: string;
}

export interface RedeemInviteResponse {
  parent: Parent;
  student: Student;
}

export interface CancelSessionRequest {
  reason?: string;
}

export interface CancelSessionResponse {
  session: Session;
  promoted: boolean;
}

export interface WaitlistEntry {
  id: string;
  session_id: string;
  parent_id: string;
  position: number;
  notified_at?: string;
  created_at: string;
  parent?: Parent;
}

export interface JoinWaitlistResponse {
  entry: WaitlistEntry;
  position: number;
}

export interface Message {
  id: string;
  coach_id: string;
  parent_id?: string;
  subject: string;
  body: string;
  sent_at: string;
}

export interface MessageWithReadStatus extends Message {
  is_read?: boolean;
  read_count?: number;
  total_recipients?: number;
  parent?: Pick<Parent, 'id' | 'name'>;
}

export interface SendMessageRequest {
  parent_id?: string;
  subject: string;
  body: string;
}

export interface SendMessageResponse {
  message: Message;
}
