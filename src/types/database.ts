// DisptchMama — Type definitions matching supabase/schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TeamMemberRole = 'admin' | 'dispatcher' | 'field_tech'
export type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type DispatchStatus = 'unscheduled' | 'scheduled' | 'dispatched' | 'en_route'

export type Database = {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: TeamMemberRole
          phone: string | null
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: TeamMemberRole
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          role?: TeamMemberRole
          phone?: string | null
          is_active?: boolean
          avatar_url?: string | null
        }
      }
      inspectors: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          email: string | null
          is_active: boolean
          region: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone?: string | null
          email?: string | null
          is_active?: boolean
          region?: string
          notes?: string | null
        }
        Update: {
          full_name?: string
          phone?: string | null
          email?: string | null
          is_active?: boolean
          region?: string
          notes?: string | null
        }
      }
      jobs: {
        Row: {
          id: string
          title: string
          description: string | null
          client_name: string
          client_phone: string | null
          client_email: string | null
          address: string
          city: string
          state: string
          zip_code: string
          status: JobStatus
          assigned_to: string | null
          requested_date: string | null
          requested_time_preference: 'morning' | 'afternoon' | 'anytime' | 'flexible' | null
          scheduled_date: string | null
          scheduled_time: string | null
          scheduled_end: string | null
          estimated_duration_minutes: number
          dispatch_status: DispatchStatus
          has_lockbox: boolean
          notes: string | null
          last_reassigned_by: string | null
          last_reassigned_at: string | null
          schedule_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string
          description?: string | null
          client_name?: string
          client_phone?: string | null
          client_email?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          status?: JobStatus
          assigned_to?: string | null
          requested_date?: string | null
          requested_time_preference?: 'morning' | 'afternoon' | 'anytime' | 'flexible' | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          estimated_duration_minutes?: number
          dispatch_status?: DispatchStatus
          has_lockbox?: boolean
          notes?: string | null
          schedule_notes?: string | null
        }
        Update: {
          title?: string
          description?: string | null
          client_name?: string
          client_phone?: string | null
          client_email?: string | null
          address?: string
          city?: string
          state?: string
          zip_code?: string
          status?: JobStatus
          assigned_to?: string | null
          requested_date?: string | null
          requested_time_preference?: 'morning' | 'afternoon' | 'anytime' | 'flexible' | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          estimated_duration_minutes?: number
          dispatch_status?: DispatchStatus
          has_lockbox?: boolean
          notes?: string | null
          last_reassigned_by?: string | null
          last_reassigned_at?: string | null
          schedule_notes?: string | null
        }
      }
      job_status_history: {
        Row: {
          id: string
          job_id: string
          changed_by: string | null
          from_status: string | null
          to_status: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          changed_by?: string | null
          from_status?: string | null
          to_status: string
          note?: string | null
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type aliases
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Inspector = Database['public']['Tables']['inspectors']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type JobStatusHistory = Database['public']['Tables']['job_status_history']['Row']
