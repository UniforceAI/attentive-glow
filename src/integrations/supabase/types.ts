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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      eventos: {
        Row: {
          acao_recomendada_1: string | null
          acao_recomendada_2: string | null
          acao_recomendada_3: string | null
          alerta_tipo: string | null
          assunto: string | null
          atendimento_id: number | null
          atendimento_status: string | null
          categoria: string | null
          churn_risk_bucket: string | null
          churn_risk_score: number | null
          cliente_celular: string | null
          cliente_cidade: string | null
          cliente_data_cadastro: string | null
          cliente_documento: string | null
          cliente_email: string | null
          cliente_id: number
          cliente_nome: string
          cliente_segmento: string | null
          cliente_tipo_pessoa: string | null
          cliente_uf: string | null
          cobranca_id: number | null
          cobranca_status: string | null
          cobranca_status_codigo: number | null
          created_at: string
          data_gerado: string | null
          data_instalacao: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          dia_vencimento: number | null
          dias_atraso: number | null
          downtime_min_24h: number | null
          event_datetime: string
          event_id: number
          event_type: string
          id: string
          inadimplencia_bucket: string | null
          inadimplencia_risk_score: number | null
          jitter_ms: number | null
          latency_ms: number | null
          mes_referencia: string | null
          metodo_cobranca: string | null
          motivo_contato: string | null
          nps_comment: string | null
          nps_score: number | null
          origem: string | null
          packet_loss_pct: number | null
          plano_nome: string | null
          protocolo: string | null
          reincidente_30d: boolean | null
          resolvido_primeiro_contato: boolean | null
          rx_dbm: number | null
          servico_id: number | null
          servico_status: string | null
          servico_status_codigo: number | null
          setor: string | null
          snr_db: number | null
          tempo_atendimento_min: number | null
          tipo_servico: string | null
          tx_dbm: number | null
          updated_at: string
          urgencia: string | null
          valor_cobranca: number | null
          valor_mensalidade: number | null
          valor_pago: number | null
          velocidade_down_mbps: number | null
          velocidade_up_mbps: number | null
          vencido: boolean | null
        }
        Insert: {
          acao_recomendada_1?: string | null
          acao_recomendada_2?: string | null
          acao_recomendada_3?: string | null
          alerta_tipo?: string | null
          assunto?: string | null
          atendimento_id?: number | null
          atendimento_status?: string | null
          categoria?: string | null
          churn_risk_bucket?: string | null
          churn_risk_score?: number | null
          cliente_celular?: string | null
          cliente_cidade?: string | null
          cliente_data_cadastro?: string | null
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_id: number
          cliente_nome: string
          cliente_segmento?: string | null
          cliente_tipo_pessoa?: string | null
          cliente_uf?: string | null
          cobranca_id?: number | null
          cobranca_status?: string | null
          cobranca_status_codigo?: number | null
          created_at?: string
          data_gerado?: string | null
          data_instalacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          dia_vencimento?: number | null
          dias_atraso?: number | null
          downtime_min_24h?: number | null
          event_datetime: string
          event_id: number
          event_type: string
          id?: string
          inadimplencia_bucket?: string | null
          inadimplencia_risk_score?: number | null
          jitter_ms?: number | null
          latency_ms?: number | null
          mes_referencia?: string | null
          metodo_cobranca?: string | null
          motivo_contato?: string | null
          nps_comment?: string | null
          nps_score?: number | null
          origem?: string | null
          packet_loss_pct?: number | null
          plano_nome?: string | null
          protocolo?: string | null
          reincidente_30d?: boolean | null
          resolvido_primeiro_contato?: boolean | null
          rx_dbm?: number | null
          servico_id?: number | null
          servico_status?: string | null
          servico_status_codigo?: number | null
          setor?: string | null
          snr_db?: number | null
          tempo_atendimento_min?: number | null
          tipo_servico?: string | null
          tx_dbm?: number | null
          updated_at?: string
          urgencia?: string | null
          valor_cobranca?: number | null
          valor_mensalidade?: number | null
          valor_pago?: number | null
          velocidade_down_mbps?: number | null
          velocidade_up_mbps?: number | null
          vencido?: boolean | null
        }
        Update: {
          acao_recomendada_1?: string | null
          acao_recomendada_2?: string | null
          acao_recomendada_3?: string | null
          alerta_tipo?: string | null
          assunto?: string | null
          atendimento_id?: number | null
          atendimento_status?: string | null
          categoria?: string | null
          churn_risk_bucket?: string | null
          churn_risk_score?: number | null
          cliente_celular?: string | null
          cliente_cidade?: string | null
          cliente_data_cadastro?: string | null
          cliente_documento?: string | null
          cliente_email?: string | null
          cliente_id?: number
          cliente_nome?: string
          cliente_segmento?: string | null
          cliente_tipo_pessoa?: string | null
          cliente_uf?: string | null
          cobranca_id?: number | null
          cobranca_status?: string | null
          cobranca_status_codigo?: number | null
          created_at?: string
          data_gerado?: string | null
          data_instalacao?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          dia_vencimento?: number | null
          dias_atraso?: number | null
          downtime_min_24h?: number | null
          event_datetime?: string
          event_id?: number
          event_type?: string
          id?: string
          inadimplencia_bucket?: string | null
          inadimplencia_risk_score?: number | null
          jitter_ms?: number | null
          latency_ms?: number | null
          mes_referencia?: string | null
          metodo_cobranca?: string | null
          motivo_contato?: string | null
          nps_comment?: string | null
          nps_score?: number | null
          origem?: string | null
          packet_loss_pct?: number | null
          plano_nome?: string | null
          protocolo?: string | null
          reincidente_30d?: boolean | null
          resolvido_primeiro_contato?: boolean | null
          rx_dbm?: number | null
          servico_id?: number | null
          servico_status?: string | null
          servico_status_codigo?: number | null
          setor?: string | null
          snr_db?: number | null
          tempo_atendimento_min?: number | null
          tipo_servico?: string | null
          tx_dbm?: number | null
          updated_at?: string
          urgencia?: string | null
          valor_cobranca?: number | null
          valor_mensalidade?: number | null
          valor_pago?: number | null
          velocidade_down_mbps?: number | null
          velocidade_up_mbps?: number | null
          vencido?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "support_staff" | "user"
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
      app_role: ["admin", "support_staff", "user"],
    },
  },
} as const
