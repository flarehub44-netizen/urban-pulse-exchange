export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MarketStatus =
  | "draft"
  | "live"
  | "closing"
  | "closed"
  | "resolving"
  | "dispute"
  | "settled"
  | "void"
  | "resolved";

export type BetSide = "YES" | "NO";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      markets: {
        Row: {
          id: string;
          question: string;
          region: string;
          target: number;
          category: string;
          ends_at: string;
          pool_yes: number;
          pool_no: number;
          participants: number;
          trend: number;
          ai_side: BetSide;
          ai_value: number;
          ai_confidence: number;
          status: MarketStatus;
          resolved: BetSide | null;
          accept_bets: boolean;
          region_id: string | null;
          frozen: boolean;
          house_fee_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
      };
      profiles: {
        Row: {
          id: string;
          is_admin: boolean;
          balance: number;
          handle: string;
          name: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
      };
      market_resolutions: {
        Row: {
          id: string;
          market_id: string;
          status: string;
          raw_value: number | null;
          derived_side: BetSide | null;
          confidence: number | null;
          created_at: string;
        };
        Insert: Record<string, never>;
        Update: Record<string, never>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      place_bet: {
        Args: { p_market_id: string; p_side: BetSide; p_stake: number };
        Returns: Json;
      };
      refresh_market_lifecycle: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_resolve_market: {
        Args: { p_market_id: string; p_winning_side: BetSide; p_note?: string | null };
        Returns: Json;
      };
      open_market: {
        Args: { p_market_id: string; p_min_minority_ratio?: number };
        Returns: Json;
      };
      get_market_audit: { Args: { p_market_id: string }; Returns: Json };
      admin_set_market_frozen: {
        Args: { p_market_id: string; p_frozen: boolean; p_note?: string | null };
        Returns: Json;
      };
      wallet_deposit: { Args: { p_amount: number }; Returns: Json };
      wallet_withdraw: { Args: { p_amount: number }; Returns: Json };
      get_lifecycle_health: { Args: Record<string, never>; Returns: Json };
      get_platform_ledger_summary: { Args: Record<string, never>; Returns: Json };
      claim_admin_invite: { Args: { p_code: string }; Returns: Json };
      try_sync_admin_allowlist: { Args: Record<string, never>; Returns: Json };
      create_market: {
        Args: {
          p_id: string;
          p_question: string;
          p_region: string;
          p_target: number;
          p_category: string;
          p_ends_at: string;
          p_region_id: string;
        };
        Returns: Json;
      };
      get_admin_dashboard_metrics: { Args: Record<string, never>; Returns: Json };
      get_admin_volume_by_hour: { Args: Record<string, never>; Returns: Json };
      get_admin_settlement_queue: { Args: Record<string, never>; Returns: Json };
      get_admin_finance_breakdown: { Args: Record<string, never>; Returns: Json };
      get_admin_oracle_health: { Args: Record<string, never>; Returns: Json };
      get_admin_users_list: { Args: Record<string, never>; Returns: Json };
      get_admin_risk_alerts: { Args: Record<string, never>; Returns: Json };
      get_admin_live_feed: { Args: { p_limit?: number }; Returns: Json };
      admin_force_close: { Args: { p_market_id: string; p_note?: string | null }; Returns: Json };
      admin_reprocess_market: { Args: { p_market_id: string }; Returns: Json };
      admin_update_setting: { Args: { p_key: string; p_value: Json }; Returns: Json };
      admin_freeze_account: { Args: { p_user_id: string; p_frozen: boolean }; Returns: Json };
      admin_set_bet_limit: { Args: { p_user_id: string; p_limit: number }; Returns: Json };
      admin_list_cameras: { Args: Record<string, never>; Returns: Json };
      admin_upsert_camera: {
        Args: {
          p_id: string | null;
          p_region_id: string;
          p_name: string;
          p_location?: string | null;
          p_status?: string | null;
          p_stream_url?: string | null;
          p_count_line?: Json | null;
        };
        Returns: Json;
      };
      get_platform_settings_admin: { Args: Record<string, never>; Returns: Json };
      admin_extend_market: { Args: { p_market_id: string; p_extra_hours?: number }; Returns: Json };
      admin_pause_bets: { Args: { p_market_id: string; p_paused?: boolean }; Returns: Json };
      admin_trigger_lifecycle: { Args: Record<string, never>; Returns: Json };
      admin_apply_simulator_scenario: {
        Args: { p_rush?: boolean; p_rain?: boolean };
        Returns: Json;
      };
      get_admin_volume_by_region: { Args: Record<string, never>; Returns: Json };
      get_admin_open_exposure: { Args: Record<string, never>; Returns: Json };
      get_admin_actions_log: { Args: { p_limit?: number }; Returns: Json };
      admin_update_kyc_status: {
        Args: { p_user_id: string; p_status: string; p_notes?: string | null };
        Returns: Json;
      };
      admin_set_camera_status: { Args: { p_camera_id: string; p_status: string }; Returns: Json };
      list_live_cameras: { Args: { p_region_id?: string | null }; Returns: Json };
      get_region_camera_status: { Args: { p_region_id: string }; Returns: Json };
      get_camera_health: { Args: Record<string, never>; Returns: Json };
      ingest_camera_metrics: {
        Args: {
          p_camera_id: string;
          p_vehicle_count: number;
          p_confidence?: number;
          p_avg_speed_estimate?: number | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      market_status: MarketStatus;
      bet_side: BetSide;
    };
    CompositeTypes: Record<string, never>;
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;
