export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          tenant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          tenant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          tenant_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          tenant_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          tenant_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dental_findings: {
        Row: {
          bbox_coordinates: Json | null
          confidence: number
          created_at: string
          dental_image_id: string
          description: string | null
          finding_type: string
          id: string
          severity: string
          tenant_id: string
          tooth_number: string | null
          updated_at: string
        }
        Insert: {
          bbox_coordinates?: Json | null
          confidence: number
          created_at?: string
          dental_image_id: string
          description?: string | null
          finding_type: string
          id?: string
          severity?: string
          tenant_id: string
          tooth_number?: string | null
          updated_at?: string
        }
        Update: {
          bbox_coordinates?: Json | null
          confidence?: number
          created_at?: string
          dental_image_id?: string
          description?: string | null
          finding_type?: string
          id?: string
          severity?: string
          tenant_id?: string
          tooth_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dental_findings_dental_image_id_fkey"
            columns: ["dental_image_id"]
            isOneToOne: false
            referencedRelation: "dental_images"
            referencedColumns: ["id"]
          },
        ]
      }
      dental_images: {
        Row: {
          ai_analysis: Json | null
          analysis_confidence: number | null
          analysis_types: string[] | null
          created_at: string
          exam_id: string
          file_path: string
          file_size: number
          findings: Json | null
          id: string
          image_type: string
          mime_type: string
          original_filename: string
          overlay_file_path: string | null
          processed_overlay_at: string | null
          processing_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_confidence?: number | null
          analysis_types?: string[] | null
          created_at?: string
          exam_id: string
          file_path: string
          file_size: number
          findings?: Json | null
          id?: string
          image_type?: string
          mime_type: string
          original_filename: string
          overlay_file_path?: string | null
          processed_overlay_at?: string | null
          processing_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_analysis?: Json | null
          analysis_confidence?: number | null
          analysis_types?: string[] | null
          created_at?: string
          exam_id?: string
          file_path?: string
          file_size?: number
          findings?: Json | null
          id?: string
          image_type?: string
          mime_type?: string
          original_filename?: string
          overlay_file_path?: string | null
          processed_overlay_at?: string | null
          processing_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dental_images_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          findings: Json | null
          id: string
          metadata: Json | null
          original_file_path: string | null
          overlay_file_path: string | null
          patient_id: string
          processed_at: string | null
          status: Database["public"]["Enums"]["exam_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          exam_type: Database["public"]["Enums"]["exam_type"]
          findings?: Json | null
          id?: string
          metadata?: Json | null
          original_file_path?: string | null
          overlay_file_path?: string | null
          patient_id: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          exam_type?: Database["public"]["Enums"]["exam_type"]
          findings?: Json | null
          id?: string
          metadata?: Json | null
          original_file_path?: string | null
          overlay_file_path?: string | null
          patient_id?: string
          processed_at?: string | null
          status?: Database["public"]["Enums"]["exam_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          integration_name: string
          integration_type: string
          is_active: boolean
          last_sync_at: string | null
          settings: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          integration_name: string
          integration_type: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          integration_name?: string
          integration_type?: string
          is_active?: boolean
          last_sync_at?: string | null
          settings?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          completed_steps: Json
          created_at: string
          id: string
          skipped_onboarding: boolean
          tenant_id: string
          tour_completed: boolean
          updated_at: string
          user_id: string
          videos_watched: Json
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          id?: string
          skipped_onboarding?: boolean
          tenant_id: string
          tour_completed?: boolean
          updated_at?: string
          user_id: string
          videos_watched?: Json
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          id?: string
          skipped_onboarding?: boolean
          tenant_id?: string
          tour_completed?: boolean
          updated_at?: string
          user_id?: string
          videos_watched?: Json
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          mime_type: string
          patient_id: string
          tenant_id: string
          updated_at: string
          upload_date: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          mime_type: string
          patient_id: string
          tenant_id: string
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          patient_id?: string
          tenant_id?: string
          updated_at?: string
          upload_date?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_history: {
        Row: {
          chief_complaint: string | null
          created_at: string
          dentist_notes: string | null
          diagnosis: string | null
          id: string
          next_appointment: string | null
          patient_id: string
          tenant_id: string
          treatment_performed: string | null
          treatment_plan: string | null
          updated_at: string
          visit_date: string
          visit_type: string
        }
        Insert: {
          chief_complaint?: string | null
          created_at?: string
          dentist_notes?: string | null
          diagnosis?: string | null
          id?: string
          next_appointment?: string | null
          patient_id: string
          tenant_id: string
          treatment_performed?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date: string
          visit_type?: string
        }
        Update: {
          chief_complaint?: string | null
          created_at?: string
          dentist_notes?: string | null
          diagnosis?: string | null
          id?: string
          next_appointment?: string | null
          patient_id?: string
          tenant_id?: string
          treatment_performed?: string | null
          treatment_plan?: string | null
          updated_at?: string
          visit_date?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          allergies: string | null
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string | null
          current_medications: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          last_visit: string | null
          medical_conditions: string | null
          metadata: Json | null
          notes: string | null
          patient_ref: string
          phone: string | null
          state: string | null
          tenant_id: string
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_visit?: string | null
          medical_conditions?: string | null
          metadata?: Json | null
          notes?: string | null
          patient_ref: string
          phone?: string | null
          state?: string | null
          tenant_id: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          allergies?: string | null
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string | null
          current_medications?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_visit?: string | null
          medical_conditions?: string | null
          metadata?: Json | null
          notes?: string | null
          patient_ref?: string
          phone?: string | null
          state?: string | null
          tenant_id?: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          template_data: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          template_data?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          template_data?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_primary: boolean | null
          ssl_certificate: string | null
          tenant_id: string
          verification_token: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_primary?: boolean | null
          ssl_certificate?: string | null
          tenant_id: string
          verification_token?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_primary?: boolean | null
          ssl_certificate?: string | null
          tenant_id?: string
          verification_token?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_plans: {
        Row: {
          billing_cycle_start: string
          created_at: string
          current_month_usage: number
          id: string
          is_active: boolean
          is_trial: boolean
          monthly_exam_limit: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle_start?: string
          created_at?: string
          current_month_usage?: number
          id?: string
          is_active?: boolean
          is_trial?: boolean
          monthly_exam_limit?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle_start?: string
          created_at?: string
          current_month_usage?: number
          id?: string
          is_active?: boolean
          is_trial?: boolean
          monthly_exam_limit?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          ai_preferences: Json
          branding_settings: Json
          created_at: string
          id: string
          notification_settings: Json
          report_settings: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_preferences?: Json
          branding_settings?: Json
          created_at?: string
          id?: string
          notification_settings?: Json
          report_settings?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_preferences?: Json
          branding_settings?: Json
          created_at?: string
          id?: string
          notification_settings?: Json
          report_settings?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          name: string
          secret: string
          tenant_id: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name: string
          secret: string
          tenant_id: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          name?: string
          secret?: string
          tenant_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_medical_data: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      check_exam_quota: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_role: {
        Args: { tenant_uuid: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_tenant_owner: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
      log_sensitive_data_access: {
        Args: {
          operation: string
          record_id: string
          table_name: string
          user_id?: string
        }
        Returns: undefined
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      validate_session_integrity: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_tenant_access: {
        Args: { target_tenant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      exam_status: "pending" | "processing" | "completed" | "failed"
      exam_type:
        | "panoramic"
        | "periapical"
        | "bitewing"
        | "cephalometric"
        | "cbct"
      plan_type: "basic" | "professional" | "enterprise"
      user_role:
        | "admin"
        | "dentist"
        | "assistant"
        | "viewer"
        | "owner"
        | "system_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      exam_status: ["pending", "processing", "completed", "failed"],
      exam_type: [
        "panoramic",
        "periapical",
        "bitewing",
        "cephalometric",
        "cbct",
      ],
      plan_type: ["basic", "professional", "enterprise"],
      user_role: [
        "admin",
        "dentist",
        "assistant",
        "viewer",
        "owner",
        "system_admin",
      ],
    },
  },
} as const
