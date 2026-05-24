export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string;
          description: string;
          icon: string;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          category?: string;
          description: string;
          icon?: string;
          id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          category?: string;
          description?: string;
          icon?: string;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          action: string;
          admin_id: string;
          created_at: string;
          id: number;
          payload: Json | null;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          admin_id: string;
          created_at?: string;
          id?: number;
          payload?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string;
          created_at?: string;
          id?: number;
          payload?: Json | null;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_allowlist: {
        Row: {
          created_at: string;
          email: string;
          note: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          note?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          note?: string | null;
        };
        Relationships: [];
      };
      admin_invites: {
        Row: {
          code: string;
          created_at: string;
          note: string | null;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          note?: string | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          note?: string | null;
          used_at?: string | null;
          used_by?: string | null;
        };
        Relationships: [];
      };
      bets: {
        Row: {
          created_at: string;
          id: string;
          market_id: string;
          note: string | null;
          payout: number | null;
          share: number | null;
          side: Database["public"]["Enums"]["bet_side"];
          stake: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          market_id: string;
          note?: string | null;
          payout?: number | null;
          share?: number | null;
          side: Database["public"]["Enums"]["bet_side"];
          stake: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          market_id?: string;
          note?: string | null;
          payout?: number | null;
          share?: number | null;
          side?: Database["public"]["Enums"]["bet_side"];
          stake?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bets_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      camera_metrics: {
        Row: {
          avg_speed_estimate: number | null;
          camera_id: string;
          confidence: number;
          flow_estimate: number;
          id: number;
          recorded_at: string;
          region_id: string;
          vehicle_count: number;
        };
        Insert: {
          avg_speed_estimate?: number | null;
          camera_id: string;
          confidence?: number;
          flow_estimate?: number;
          id?: number;
          recorded_at?: string;
          region_id: string;
          vehicle_count?: number;
        };
        Update: {
          avg_speed_estimate?: number | null;
          camera_id?: string;
          confidence?: number;
          flow_estimate?: number;
          id?: number;
          recorded_at?: string;
          region_id?: string;
          vehicle_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "camera_metrics_camera_id_fkey";
            columns: ["camera_id"];
            isOneToOne: false;
            referencedRelation: "cameras";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "camera_metrics_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      camera_upstreams: {
        Row: {
          allowed_hosts: string[];
          created_at: string;
          created_by: string | null;
          headers: Json;
          kind: string;
          label: string | null;
          provider: string;
          slug: string;
          upstream_url: string;
        };
        Insert: {
          allowed_hosts: string[];
          created_at?: string;
          created_by?: string | null;
          headers?: Json;
          kind?: string;
          label?: string | null;
          provider: string;
          slug: string;
          upstream_url: string;
        };
        Update: {
          allowed_hosts?: string[];
          created_at?: string;
          created_by?: string | null;
          headers?: Json;
          kind?: string;
          label?: string | null;
          provider?: string;
          slug?: string;
          upstream_url?: string;
        };
        Relationships: [];
      };
      cameras: {
        Row: {
          count_line: Json | null;
          detection_ok: boolean;
          fps: number | null;
          id: string;
          location: string | null;
          name: string;
          region_id: string | null;
          status: string;
          stream_url: string | null;
          updated_at: string;
        };
        Insert: {
          count_line?: Json | null;
          detection_ok?: boolean;
          fps?: number | null;
          id?: string;
          location?: string | null;
          name: string;
          region_id?: string | null;
          status?: string;
          stream_url?: string | null;
          updated_at?: string;
        };
        Update: {
          count_line?: Json | null;
          detection_ok?: boolean;
          fps?: number | null;
          id?: string;
          location?: string | null;
          name?: string;
          region_id?: string | null;
          status?: string;
          stream_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cameras_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_check_ins: {
        Row: {
          check_in_date: string;
          created_at: string;
          insight: string | null;
          user_id: string;
          xp_awarded: number;
        };
        Insert: {
          check_in_date?: string;
          created_at?: string;
          insight?: string | null;
          user_id: string;
          xp_awarded?: number;
        };
        Update: {
          check_in_date?: string;
          created_at?: string;
          insight?: string | null;
          user_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_check_ins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_check_ins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_missions: {
        Row: {
          description: string;
          icon: string;
          id: string;
          kind: string;
          label: string;
          xp_reward: number;
        };
        Insert: {
          description: string;
          icon?: string;
          id: string;
          kind: string;
          label: string;
          xp_reward?: number;
        };
        Update: {
          description?: string;
          icon?: string;
          id?: string;
          kind?: string;
          label?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      daily_polls: {
        Row: {
          created_at: string | null;
          id: string;
          no_count: number;
          poll_date: string;
          question: string;
          yes_count: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          no_count?: number;
          poll_date?: string;
          question: string;
          yes_count?: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          no_count?: number;
          poll_date?: string;
          question?: string;
          yes_count?: number;
        };
        Relationships: [];
      };
      deposit_impulse_log: {
        Row: {
          amount: number;
          context: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          context: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          context?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deposit_impulse_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deposit_impulse_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_comments: {
        Row: {
          created_at: string;
          id: string;
          post_id: string;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          post_id: string;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          post_id?: string;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "feed_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "feed_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_likes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_posts: {
        Row: {
          comments: number;
          created_at: string;
          id: string;
          likes: number;
          market_id: string | null;
          reposts: number;
          tag: Database["public"]["Enums"]["feed_tag"] | null;
          text: string;
          user_id: string;
        };
        Insert: {
          comments?: number;
          created_at?: string;
          id?: string;
          likes?: number;
          market_id?: string | null;
          reposts?: number;
          tag?: Database["public"]["Enums"]["feed_tag"] | null;
          text: string;
          user_id: string;
        };
        Update: {
          comments?: number;
          created_at?: string;
          id?: string;
          likes?: number;
          market_id?: string | null;
          reposts?: number;
          tag?: Database["public"]["Enums"]["feed_tag"] | null;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_posts_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_reposts: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feed_reposts_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "feed_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_reposts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_reposts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      league_members: {
        Row: {
          joined_at: string | null;
          league_id: string;
          user_id: string;
        };
        Insert: {
          joined_at?: string | null;
          league_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string | null;
          league_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "league_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      leagues: {
        Row: {
          created_at: string | null;
          created_by: string;
          id: string;
          invite_code: string;
          is_public: boolean;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          created_by: string;
          id?: string;
          invite_code: string;
          is_public?: boolean;
          name: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string;
          id?: string;
          invite_code?: string;
          is_public?: boolean;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lifecycle_tick_runs: {
        Row: {
          closed: number;
          closing_promoted: number;
          error_message: string | null;
          id: number;
          payload: Json | null;
          processed: number;
          ran_at: string;
          snapshots: number;
        };
        Insert: {
          closed?: number;
          closing_promoted?: number;
          error_message?: string | null;
          id?: number;
          payload?: Json | null;
          processed?: number;
          ran_at?: string;
          snapshots?: number;
        };
        Update: {
          closed?: number;
          closing_promoted?: number;
          error_message?: string | null;
          id?: number;
          payload?: Json | null;
          processed?: number;
          ran_at?: string;
          snapshots?: number;
        };
        Relationships: [];
      };
      market_history: {
        Row: {
          id: number;
          market_id: string;
          p: number;
          recorded_at: string;
        };
        Insert: {
          id?: number;
          market_id: string;
          p: number;
          recorded_at?: string;
        };
        Update: {
          id?: number;
          market_id?: string;
          p?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "market_history_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      market_resolutions: {
        Row: {
          confidence: number | null;
          created_at: string;
          derived_side: Database["public"]["Enums"]["bet_side"] | null;
          id: string;
          inputs: Json;
          market_id: string;
          model_version: string;
          payout_summary: Json | null;
          raw_value: number | null;
          source: string;
          status: string;
          validation: Json;
        };
        Insert: {
          confidence?: number | null;
          created_at?: string;
          derived_side?: Database["public"]["Enums"]["bet_side"] | null;
          id?: string;
          inputs?: Json;
          market_id: string;
          model_version?: string;
          payout_summary?: Json | null;
          raw_value?: number | null;
          source?: string;
          status: string;
          validation?: Json;
        };
        Update: {
          confidence?: number | null;
          created_at?: string;
          derived_side?: Database["public"]["Enums"]["bet_side"] | null;
          id?: string;
          inputs?: Json;
          market_id?: string;
          model_version?: string;
          payout_summary?: Json | null;
          raw_value?: number | null;
          source?: string;
          status?: string;
          validation?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "market_resolutions_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      market_views: {
        Row: {
          market_id: string;
          user_id: string;
          viewed_at: string;
        };
        Insert: {
          market_id: string;
          user_id: string;
          viewed_at?: string;
        };
        Update: {
          market_id?: string;
          user_id?: string;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "market_views_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "market_views_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "market_views_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      markets: {
        Row: {
          accept_bets: boolean;
          ai_confidence: number;
          ai_side: Database["public"]["Enums"]["bet_side"];
          ai_value: number;
          archived: boolean;
          category: Database["public"]["Enums"]["market_category"];
          comparison_op: string | null;
          created_at: string;
          data_source: string;
          ends_at: string;
          frozen: boolean;
          house_fee_pct: number;
          id: string;
          participants: number;
          pool_no: number;
          pool_yes: number;
          question: string;
          region: string;
          region_id: string | null;
          resolution_metric: string | null;
          resolution_rule: Json;
          resolved: Database["public"]["Enums"]["bet_side"] | null;
          resolved_at: string | null;
          settled_at: string | null;
          starts_at: string | null;
          status: Database["public"]["Enums"]["market_status"];
          target: number;
          trend: number;
          updated_at: string;
        };
        Insert: {
          accept_bets?: boolean;
          ai_confidence: number;
          ai_side?: Database["public"]["Enums"]["bet_side"];
          ai_value: number;
          archived?: boolean;
          category: Database["public"]["Enums"]["market_category"];
          comparison_op?: string | null;
          created_at?: string;
          data_source?: string;
          ends_at: string;
          frozen?: boolean;
          house_fee_pct?: number;
          id: string;
          participants?: number;
          pool_no?: number;
          pool_yes?: number;
          question: string;
          region: string;
          region_id?: string | null;
          resolution_metric?: string | null;
          resolution_rule?: Json;
          resolved?: Database["public"]["Enums"]["bet_side"] | null;
          resolved_at?: string | null;
          settled_at?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["market_status"];
          target: number;
          trend?: number;
          updated_at?: string;
        };
        Update: {
          accept_bets?: boolean;
          ai_confidence?: number;
          ai_side?: Database["public"]["Enums"]["bet_side"];
          ai_value?: number;
          archived?: boolean;
          category?: Database["public"]["Enums"]["market_category"];
          comparison_op?: string | null;
          created_at?: string;
          data_source?: string;
          ends_at?: string;
          frozen?: boolean;
          house_fee_pct?: number;
          id?: string;
          participants?: number;
          pool_no?: number;
          pool_yes?: number;
          question?: string;
          region?: string;
          region_id?: string | null;
          resolution_metric?: string | null;
          resolution_rule?: Json;
          resolved?: Database["public"]["Enums"]["bet_side"] | null;
          resolved_at?: string | null;
          settled_at?: string | null;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["market_status"];
          target?: number;
          trend?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "markets_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["notif_kind"];
          market_id: string | null;
          read: boolean;
          text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["notif_kind"];
          market_id?: string | null;
          read?: boolean;
          text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["notif_kind"];
          market_id?: string | null;
          read?: boolean;
          text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      oracle_snapshots: {
        Row: {
          id: number;
          market_id: string;
          metric: string;
          raw_value: number;
          recorded_at: string;
          region_id: string | null;
          source: string;
        };
        Insert: {
          id?: number;
          market_id: string;
          metric: string;
          raw_value: number;
          recorded_at?: string;
          region_id?: string | null;
          source?: string;
        };
        Update: {
          id?: number;
          market_id?: string;
          metric?: string;
          raw_value?: number;
          recorded_at?: string;
          region_id?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "oracle_snapshots_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "oracle_snapshots_region_id_fkey";
            columns: ["region_id"];
            isOneToOne: false;
            referencedRelation: "regions";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_accounts: {
        Row: {
          balance: number;
          commission_boost_pct: number;
          commission_boost_until: string | null;
          created_at: string;
          parent_partner_id: string | null;
          pending_balance: number;
          revenue_share_pct: number;
          slug: string;
          status: Database["public"]["Enums"]["partner_status"];
          sub_invite_code: string | null;
          tier: string;
          updated_at: string;
          user_id: string;
          verified: boolean;
        };
        Insert: {
          balance?: number;
          commission_boost_pct?: number;
          commission_boost_until?: string | null;
          created_at?: string;
          parent_partner_id?: string | null;
          pending_balance?: number;
          revenue_share_pct?: number;
          slug: string;
          status?: Database["public"]["Enums"]["partner_status"];
          sub_invite_code?: string | null;
          tier?: string;
          updated_at?: string;
          user_id: string;
          verified?: boolean;
        };
        Update: {
          balance?: number;
          commission_boost_pct?: number;
          commission_boost_until?: string | null;
          created_at?: string;
          parent_partner_id?: string | null;
          pending_balance?: number;
          revenue_share_pct?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["partner_status"];
          sub_invite_code?: string | null;
          tier?: string;
          updated_at?: string;
          user_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "partner_accounts_parent_partner_id_fkey";
            columns: ["parent_partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "partner_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_applications: {
        Row: {
          bio: string;
          created_at: string;
          focus_city: string | null;
          id: string;
          note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          social_links: Json;
          status: string;
          user_id: string;
        };
        Insert: {
          bio?: string;
          created_at?: string;
          focus_city?: string | null;
          id?: string;
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          social_links?: Json;
          status?: string;
          user_id: string;
        };
        Update: {
          bio?: string;
          created_at?: string;
          focus_city?: string | null;
          id?: string;
          note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          social_links?: Json;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_applications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_applications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partner_campaigns: {
        Row: {
          clicks: number;
          conversions: number;
          created_at: string;
          id: string;
          name: string;
          partner_id: string;
          slug_suffix: string | null;
          target: Json;
        };
        Insert: {
          clicks?: number;
          conversions?: number;
          created_at?: string;
          id?: string;
          name: string;
          partner_id: string;
          slug_suffix?: string | null;
          target?: Json;
        };
        Update: {
          clicks?: number;
          conversions?: number;
          created_at?: string;
          id?: string;
          name?: string;
          partner_id?: string;
          slug_suffix?: string | null;
          target?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "partner_campaigns_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_commission_ledger: {
        Row: {
          amount: number;
          created_at: string;
          id: number;
          kind: string;
          market_id: string | null;
          meta: Json;
          partner_id: string;
          rake_base: number;
          referred_volume: number;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: number;
          kind?: string;
          market_id?: string | null;
          meta?: Json;
          partner_id: string;
          rake_base?: number;
          referred_volume?: number;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: number;
          kind?: string;
          market_id?: string | null;
          meta?: Json;
          partner_id?: string;
          rake_base?: number;
          referred_volume?: number;
        };
        Relationships: [
          {
            foreignKeyName: "partner_commission_ledger_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_commission_ledger_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_events: {
        Row: {
          created_at: string;
          id: number;
          kind: string;
          message: string;
          meta: Json;
          partner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          kind: string;
          message: string;
          meta?: Json;
          partner_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          kind?: string;
          message?: string;
          meta?: Json;
          partner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_events_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_leaderboard_snapshots: {
        Row: {
          metric: string;
          partner_id: string;
          rank: number;
          score: number;
          snapshot_date: string;
        };
        Insert: {
          metric?: string;
          partner_id: string;
          rank: number;
          score: number;
          snapshot_date: string;
        };
        Update: {
          metric?: string;
          partner_id?: string;
          rank?: number;
          score?: number;
          snapshot_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_leaderboard_snapshots_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_mission_progress: {
        Row: {
          completed_at: string | null;
          mission_id: string;
          partner_id: string;
          progress: number;
          week_start: string;
        };
        Insert: {
          completed_at?: string | null;
          mission_id: string;
          partner_id: string;
          progress?: number;
          week_start?: string;
        };
        Update: {
          completed_at?: string | null;
          mission_id?: string;
          partner_id?: string;
          progress?: number;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_mission_progress_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "partner_missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "partner_mission_progress_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      partner_missions: {
        Row: {
          active: boolean;
          description: string;
          id: string;
          metric: string;
          reward_boost_pct: number;
          target_value: number;
          title: string;
        };
        Insert: {
          active?: boolean;
          description: string;
          id: string;
          metric: string;
          reward_boost_pct?: number;
          target_value: number;
          title: string;
        };
        Update: {
          active?: boolean;
          description?: string;
          id?: string;
          metric?: string;
          reward_boost_pct?: number;
          target_value?: number;
          title?: string;
        };
        Relationships: [];
      };
      partner_payouts: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          method: string;
          partner_id: string;
          status: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          method?: string;
          partner_id: string;
          status?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          method?: string;
          partner_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      payment_intents: {
        Row: {
          amount: number;
          created_at: string;
          expires_at: string | null;
          id: string;
          meta: Json;
          pix_key: string | null;
          provider_id: string | null;
          qr_code: string | null;
          qr_code_img: string | null;
          settled_at: string | null;
          status: string;
          type: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          meta?: Json;
          pix_key?: string | null;
          provider_id?: string | null;
          qr_code?: string | null;
          qr_code_img?: string | null;
          settled_at?: string | null;
          status?: string;
          type: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          expires_at?: string | null;
          id?: string;
          meta?: Json;
          pix_key?: string | null;
          provider_id?: string | null;
          qr_code?: string | null;
          qr_code_img?: string | null;
          settled_at?: string | null;
          status?: string;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      platform_events: {
        Row: {
          badge_icon: string | null;
          created_at: string | null;
          description: string | null;
          ends_at: string;
          id: string;
          name: string;
          slug: string;
          starts_at: string;
          xp_boost: number | null;
        };
        Insert: {
          badge_icon?: string | null;
          created_at?: string | null;
          description?: string | null;
          ends_at: string;
          id?: string;
          name: string;
          slug: string;
          starts_at: string;
          xp_boost?: number | null;
        };
        Update: {
          badge_icon?: string | null;
          created_at?: string | null;
          description?: string | null;
          ends_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          starts_at?: string;
          xp_boost?: number | null;
        };
        Relationships: [];
      };
      platform_ledger: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          kind: string;
          market_id: string;
          meta: Json;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          kind?: string;
          market_id: string;
          meta?: Json;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          kind?: string;
          market_id?: string;
          meta?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "platform_ledger_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_votes: {
        Row: {
          created_at: string | null;
          poll_id: string;
          user_id: string;
          vote: boolean;
        };
        Insert: {
          created_at?: string | null;
          poll_id: string;
          user_id: string;
          vote: boolean;
        };
        Update: {
          created_at?: string | null;
          poll_id?: string;
          user_id?: string;
          vote?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey";
            columns: ["poll_id"];
            isOneToOne: false;
            referencedRelation: "daily_polls";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          accuracy: number;
          avatar: string;
          balance: number;
          casino_opt_out: boolean;
          city: string;
          created_at: string;
          division: Database["public"]["Enums"]["division_tier"];
          email_bonus_claimed: boolean;
          handle: string;
          id: string;
          is_admin: boolean;
          is_ai: boolean;
          kyc_status: string;
          last_active_at: string | null;
          last_check_in_date: string | null;
          name: string;
          neighborhood: string;
          notification_prefs: Json;
          pix_key: string | null;
          pnl: number;
          recovery_days_left: number;
          recovery_mode: boolean;
          roi: number;
          streak: number;
          streak_freezes_left: number;
          streak_multiplier: number;
          volume_24h: number;
          xp: number;
          xp_to_next: number;
        };
        Insert: {
          accuracy?: number;
          avatar: string;
          balance?: number;
          casino_opt_out?: boolean;
          city?: string;
          created_at?: string;
          division?: Database["public"]["Enums"]["division_tier"];
          email_bonus_claimed?: boolean;
          handle: string;
          id: string;
          is_admin?: boolean;
          is_ai?: boolean;
          kyc_status?: string;
          last_active_at?: string | null;
          last_check_in_date?: string | null;
          name?: string;
          neighborhood?: string;
          notification_prefs?: Json;
          pix_key?: string | null;
          pnl?: number;
          recovery_days_left?: number;
          recovery_mode?: boolean;
          roi?: number;
          streak?: number;
          streak_freezes_left?: number;
          streak_multiplier?: number;
          volume_24h?: number;
          xp?: number;
          xp_to_next?: number;
        };
        Update: {
          accuracy?: number;
          avatar?: string;
          balance?: number;
          casino_opt_out?: boolean;
          city?: string;
          created_at?: string;
          division?: Database["public"]["Enums"]["division_tier"];
          email_bonus_claimed?: boolean;
          handle?: string;
          id?: string;
          is_admin?: boolean;
          is_ai?: boolean;
          kyc_status?: string;
          last_active_at?: string | null;
          last_check_in_date?: string | null;
          name?: string;
          neighborhood?: string;
          notification_prefs?: Json;
          pix_key?: string | null;
          pnl?: number;
          recovery_days_left?: number;
          recovery_mode?: boolean;
          roi?: number;
          streak?: number;
          streak_freezes_left?: number;
          streak_multiplier?: number;
          volume_24h?: number;
          xp?: number;
          xp_to_next?: number;
        };
        Relationships: [];
      };
      referral_clicks: {
        Row: {
          campaign_id: string | null;
          converted_user_id: string | null;
          created_at: string;
          id: string;
          ip_hash: string | null;
          partner_id: string;
          utm: Json | null;
        };
        Insert: {
          campaign_id?: string | null;
          converted_user_id?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          partner_id: string;
          utm?: Json | null;
        };
        Update: {
          campaign_id?: string | null;
          converted_user_id?: string | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          partner_id?: string;
          utm?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "referral_clicks_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "partner_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_clicks_converted_user_id_fkey";
            columns: ["converted_user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_clicks_converted_user_id_fkey";
            columns: ["converted_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "referral_clicks_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
        ];
      };
      regions: {
        Row: {
          avg_speed: number;
          congestion: number;
          flow: number;
          id: string;
          name: string;
          r: number;
          updated_at: string;
          x: number;
          y: number;
        };
        Insert: {
          avg_speed?: number;
          congestion?: number;
          flow?: number;
          id: string;
          name: string;
          r: number;
          updated_at?: string;
          x: number;
          y: number;
        };
        Update: {
          avg_speed?: number;
          congestion?: number;
          flow?: number;
          id?: string;
          name?: string;
          r?: number;
          updated_at?: string;
          x?: number;
          y?: number;
        };
        Relationships: [];
      };
      trader_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trader_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trader_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trader_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trader_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          after_balance: number | null;
          amount: number;
          before_balance: number | null;
          created_at: string;
          id: string;
          market_id: string | null;
          market_label: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          user_id: string;
        };
        Insert: {
          after_balance?: number | null;
          amount: number;
          before_balance?: number | null;
          created_at?: string;
          id?: string;
          market_id?: string | null;
          market_label?: string | null;
          type: Database["public"]["Enums"]["tx_type"];
          user_id: string;
        };
        Update: {
          after_balance?: number | null;
          amount?: number;
          before_balance?: number | null;
          created_at?: string;
          id?: string;
          market_id?: string | null;
          market_label?: string | null;
          type?: Database["public"]["Enums"]["tx_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_ai_memory: {
        Row: {
          archetype_en: string | null;
          avg_stake: number | null;
          best_accuracy_region: string | null;
          bets_vs_ai: number;
          favorite_category: string | null;
          favorite_region: string | null;
          last_market_id: string | null;
          last_side: Database["public"]["Enums"]["bet_side"] | null;
          total_bets: number;
          updated_at: string;
          user_id: string;
          wins_vs_ai: number;
          worst_accuracy_region: string | null;
        };
        Insert: {
          archetype_en?: string | null;
          avg_stake?: number | null;
          best_accuracy_region?: string | null;
          bets_vs_ai?: number;
          favorite_category?: string | null;
          favorite_region?: string | null;
          last_market_id?: string | null;
          last_side?: Database["public"]["Enums"]["bet_side"] | null;
          total_bets?: number;
          updated_at?: string;
          user_id: string;
          wins_vs_ai?: number;
          worst_accuracy_region?: string | null;
        };
        Update: {
          archetype_en?: string | null;
          avg_stake?: number | null;
          best_accuracy_region?: string | null;
          bets_vs_ai?: number;
          favorite_category?: string | null;
          favorite_region?: string | null;
          last_market_id?: string | null;
          last_side?: Database["public"]["Enums"]["bet_side"] | null;
          total_bets?: number;
          updated_at?: string;
          user_id?: string;
          wins_vs_ai?: number;
          worst_accuracy_region?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_ai_memory_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_ai_memory_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_mission_progress: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          date: string;
          mission_id: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          date?: string;
          mission_id: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          date?: string;
          mission_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_mission_progress_mission_id_fkey";
            columns: ["mission_id"];
            isOneToOne: false;
            referencedRelation: "daily_missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_mission_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_mission_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_near_miss_events: {
        Row: {
          created_at: string;
          id: number;
          kind: string;
          market_id: string | null;
          meta: Json;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          kind?: string;
          market_id?: string | null;
          meta?: Json;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          kind?: string;
          market_id?: string | null;
          meta?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_near_miss_events_market_id_fkey";
            columns: ["market_id"];
            isOneToOne: false;
            referencedRelation: "markets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_near_miss_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_near_miss_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_referrals: {
        Row: {
          campaign_id: string | null;
          created_at: string;
          first_bet_at: string | null;
          first_deposit_at: string | null;
          partner_id: string;
          sub_partner_id: string | null;
          user_id: string;
        };
        Insert: {
          campaign_id?: string | null;
          created_at?: string;
          first_bet_at?: string | null;
          first_deposit_at?: string | null;
          partner_id: string;
          sub_partner_id?: string | null;
          user_id: string;
        };
        Update: {
          campaign_id?: string | null;
          created_at?: string;
          first_bet_at?: string | null;
          first_deposit_at?: string | null;
          partner_id?: string;
          sub_partner_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_referrals_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "partner_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_referrals_partner_id_fkey";
            columns: ["partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_referrals_sub_partner_id_fkey";
            columns: ["sub_partner_id"];
            isOneToOne: false;
            referencedRelation: "partner_accounts";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "user_referrals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_referrals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_risk_profiles: {
        Row: {
          bet_limit: number | null;
          frozen: boolean;
          kyc_status: string;
          notes: string | null;
          risk_score: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bet_limit?: number | null;
          frozen?: boolean;
          kyc_status?: string;
          notes?: string | null;
          risk_score?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bet_limit?: number | null;
          frozen?: boolean;
          kyc_status?: string;
          notes?: string | null;
          risk_score?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_risk_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_risk_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_spins: {
        Row: {
          created_at: string;
          id: string;
          is_near_miss: boolean;
          outcome_key: string;
          reward_amount: number;
          reward_xp: number;
          source: Database["public"]["Enums"]["spin_source"];
          spin_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_near_miss?: boolean;
          outcome_key: string;
          reward_amount?: number;
          reward_xp?: number;
          source: Database["public"]["Enums"]["spin_source"];
          spin_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_near_miss?: boolean;
          outcome_key?: string;
          reward_amount?: number;
          reward_xp?: number;
          source?: Database["public"]["Enums"]["spin_source"];
          spin_date?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_spins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "leaderboard";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_spins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      leaderboard: {
        Row: {
          accuracy: number | null;
          avatar: string | null;
          city: string | null;
          division: Database["public"]["Enums"]["division_tier"] | null;
          global_rank: number | null;
          handle: string | null;
          id: string | null;
          is_ai: boolean | null;
          name: string | null;
          neighborhood: string | null;
          roi: number | null;
          streak: number | null;
          volume: number | null;
          weekly_growth: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _casino_execute_spin: {
        Args: { p_source: Database["public"]["Enums"]["spin_source"] };
        Returns: Json;
      };
      activate_recovery_mode: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      admin_apply_simulator_scenario: {
        Args: { p_rain?: boolean; p_rush?: boolean };
        Returns: Json;
      };
      admin_approve_partner: {
        Args: { p_slug?: string; p_tier?: string; p_user_id: string };
        Returns: Json;
      };
      admin_create_camera_upstream: {
        Args: {
          p_kind?: string;
          p_label?: string;
          p_provider: string;
          p_upstream_url: string;
        };
        Returns: Json;
      };
      admin_extend_market: {
        Args: { p_extra_hours?: number; p_market_id: string };
        Returns: Json;
      };
      admin_force_close: {
        Args: { p_market_id: string; p_note?: string };
        Returns: Json;
      };
      admin_freeze_account: {
        Args: { p_frozen: boolean; p_user_id: string };
        Returns: Json;
      };
      admin_list_cameras: { Args: never; Returns: Json };
      admin_list_partner_applications: { Args: never; Returns: Json };
      admin_pause_bets: {
        Args: { p_market_id: string; p_paused?: boolean };
        Returns: Json;
      };
      admin_reject_partner: {
        Args: { p_note?: string; p_user_id: string };
        Returns: Json;
      };
      admin_reprocess_market: { Args: { p_market_id: string }; Returns: Json };
      admin_resolve_market: {
        Args: {
          p_market_id: string;
          p_note?: string;
          p_winning_side: Database["public"]["Enums"]["bet_side"];
        };
        Returns: Json;
      };
      admin_set_bet_limit: {
        Args: { p_limit: number; p_user_id: string };
        Returns: Json;
      };
      admin_set_camera_status: {
        Args: { p_camera_id: string; p_status: string };
        Returns: Json;
      };
      admin_set_market_frozen: {
        Args: { p_frozen: boolean; p_market_id: string; p_note?: string };
        Returns: Json;
      };
      admin_trigger_lifecycle: { Args: never; Returns: Json };
      admin_update_kyc_status: {
        Args: { p_notes?: string; p_status: string; p_user_id: string };
        Returns: Json;
      };
      admin_update_setting: {
        Args: { p_key: string; p_value: Json };
        Returns: Json;
      };
      admin_upsert_camera: {
        Args: {
          p_count_line?: Json;
          p_id: string;
          p_location?: string;
          p_name: string;
          p_region_id: string;
          p_status?: string;
          p_stream_url?: string;
        };
        Returns: Json;
      };
      allocate_partner_commissions: {
        Args: { p_house_fee: number; p_market_id: string };
        Returns: undefined;
      };
      apply_partner_program: {
        Args: { p_bio: string; p_focus_city?: string; p_social?: Json };
        Returns: Json;
      };
      apply_user_progress: {
        Args: { p_event: string; p_user_id: string; p_xp_delta?: number };
        Returns: Json;
      };
      assert_admin: { Args: never; Returns: undefined };
      bind_referral_attribution: {
        Args: { p_campaign_id?: string; p_slug: string };
        Returns: Json;
      };
      buy_streak_freeze: { Args: never; Returns: Json };
      casino_daily_spin: { Args: never; Returns: Json };
      casino_deposit_bonus_spin: { Args: never; Returns: Json };
      casino_quick_deposit: {
        Args: { p_amount: number; p_context?: string };
        Returns: Json;
      };
      casino_spin_status: { Args: never; Returns: Json };
      check_user_achievements: { Args: { p_user_id: string }; Returns: Json };
      claim_admin_invite: { Args: { p_code: string }; Returns: Json };
      claim_sub_partner_invite: { Args: { p_code: string }; Returns: Json };
      collect_oracle_reading: { Args: { p_market_id: string }; Returns: Json };
      comment_feed_post: {
        Args: { p_post_id: string; p_text: string };
        Returns: number;
      };
      complete_mission: { Args: { p_mission_id: string }; Returns: Json };
      create_league: { Args: { p_name: string }; Returns: Json };
      create_market: {
        Args: {
          p_ai_confidence?: number;
          p_ai_side?: Database["public"]["Enums"]["bet_side"];
          p_ai_value?: number;
          p_category: Database["public"]["Enums"]["market_category"];
          p_comparison_op?: string;
          p_data_source?: string;
          p_ends_at: string;
          p_id: string;
          p_question: string;
          p_region: string;
          p_region_id: string;
          p_resolution_metric?: string;
          p_target: number;
        };
        Returns: Json;
      };
      create_partner_campaign: {
        Args: { p_name: string; p_slug_suffix?: string; p_target?: Json };
        Returns: Json;
      };
      daily_check_in: { Args: never; Returns: Json };
      division_for_xp: {
        Args: { p_xp: number };
        Returns: Database["public"]["Enums"]["division_tier"];
      };
      emit_partner_event: {
        Args: {
          p_kind: string;
          p_message: string;
          p_meta?: Json;
          p_partner_id: string;
        };
        Returns: undefined;
      };
      get_active_events: { Args: never; Returns: Json };
      get_admin_actions_log: { Args: { p_limit?: number }; Returns: Json };
      get_admin_dashboard_metrics: { Args: never; Returns: Json };
      get_admin_finance_breakdown: { Args: never; Returns: Json };
      get_admin_live_feed: { Args: { p_limit?: number }; Returns: Json };
      get_admin_open_exposure: { Args: never; Returns: Json };
      get_admin_oracle_health: { Args: never; Returns: Json };
      get_admin_risk_alerts: { Args: never; Returns: Json };
      get_admin_settlement_queue: { Args: never; Returns: Json };
      get_admin_users_list: { Args: never; Returns: Json };
      get_admin_volume_by_hour: { Args: never; Returns: Json };
      get_admin_volume_by_region: { Args: never; Returns: Json };
      get_camera_health: { Args: never; Returns: Json };
      get_camera_region_raw: {
        Args: { p_metric: string; p_region_id: string };
        Returns: number;
      };
      get_camera_upstream: {
        Args: { p_slug: string };
        Returns: {
          allowed_hosts: string[];
          headers: Json;
          kind: string;
          provider: string;
          slug: string;
          upstream_url: string;
        }[];
      };
      get_daily_missions: { Args: never; Returns: Json };
      get_following_trader_ids: { Args: never; Returns: string[] };
      get_league_leaderboard: { Args: { p_league_id: string }; Returns: Json };
      get_lifecycle_health: { Args: never; Returns: Json };
      get_market_audit: { Args: { p_market_id: string }; Returns: Json };
      get_market_recent_bets: {
        Args: { p_limit?: number; p_market_id: string };
        Returns: {
          avatar: string;
          created_at: string;
          handle: string;
          name: string;
          share: number;
          side: Database["public"]["Enums"]["bet_side"];
          stake: number;
        }[];
      };
      get_market_social_proof: { Args: { p_market_id: string }; Returns: Json };
      get_my_leagues: { Args: never; Returns: Json };
      get_my_partner_status: { Args: never; Returns: Json };
      get_partner_analytics: { Args: never; Returns: Json };
      get_partner_campaigns: { Args: never; Returns: Json };
      get_partner_events_feed: { Args: { p_limit?: number }; Returns: Json };
      get_partner_invites_list: { Args: never; Returns: Json };
      get_partner_leaderboard: { Args: { p_metric?: string }; Returns: Json };
      get_partner_overview: { Args: never; Returns: Json };
      get_partner_payouts: { Args: never; Returns: Json };
      get_partner_revenue_series: { Args: { p_days?: number }; Returns: Json };
      get_partner_sub_affiliates: { Args: never; Returns: Json };
      get_platform_ledger_summary: { Args: never; Returns: Json };
      get_platform_settings_admin: { Args: never; Returns: Json };
      get_public_expert_profile: { Args: { p_user_id: string }; Returns: Json };
      get_public_trader_bets: {
        Args: { p_user_id: string };
        Returns: {
          created_at: string;
          id: string;
          market_id: string;
          market_question: string;
          market_region: string;
          payout: number;
          side: string;
          stake: number;
        }[];
      };
      get_recent_near_miss: { Args: never; Returns: Json };
      get_region_camera_status: { Args: { p_region_id: string }; Returns: Json };
      get_today_poll: { Args: never; Returns: Json };
      get_trader_archetype: { Args: { p_user_id?: string }; Returns: Json };
      get_urbanmind_digest: { Args: never; Returns: Json };
      get_user_achievements: { Args: { p_user_id?: string }; Returns: Json };
      get_weekly_pulse_report: { Args: never; Returns: Json };
      grant_email_link_bonus: { Args: never; Returns: Json };
      ingest_camera_metrics: {
        Args: {
          p_avg_speed_estimate?: number;
          p_camera_id: string;
          p_confidence?: number;
          p_vehicle_count: number;
        };
        Returns: Json;
      };
      ingest_oracle_snapshots: { Args: never; Returns: number };
      insert_user_notification: {
        Args: {
          p_kind: Database["public"]["Enums"]["notif_kind"];
          p_market_id?: string;
          p_text: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      is_admin: { Args: { _user_id: string }; Returns: boolean };
      is_allowed_stream_url: { Args: { p_url: string }; Returns: boolean };
      is_casino_enabled: { Args: never; Returns: boolean };
      is_partner_program_enabled: { Args: never; Returns: boolean };
      join_league: { Args: { p_invite_code: string }; Returns: Json };
      leave_league: { Args: { p_league_id: string }; Returns: Json };
      like_feed_post: { Args: { p_post_id: string }; Returns: number };
      list_cameras_for_ingest: { Args: never; Returns: Json };
      list_live_cameras: { Args: { p_region_id?: string }; Returns: Json };
      min_minority_ratio: { Args: never; Returns: number };
      min_oracle_confidence: { Args: never; Returns: number };
      open_market: {
        Args: { p_market_id: string; p_min_minority_ratio?: number };
        Returns: Json;
      };
      oracle_derive_side: {
        Args: { p_op: string; p_raw: number; p_target: number };
        Returns: Database["public"]["Enums"]["bet_side"];
      };
      oracle_raw_metric: {
        Args: {
          p_avg_speed: number;
          p_congestion: number;
          p_flow: number;
          p_metric: string;
        };
        Returns: number;
      };
      partner_request_payout: { Args: { p_amount: number }; Returns: Json };
      partner_setting_num: {
        Args: { p_default: number; p_key: string };
        Returns: number;
      };
      pick_casino_spin_outcome: { Args: never; Returns: Json };
      place_bet: {
        Args: {
          p_market_id: string;
          p_side: Database["public"]["Enums"]["bet_side"];
          p_stake: number;
        };
        Returns: Json;
      };
      process_market_resolution: {
        Args: { p_market_id: string };
        Returns: Json;
      };
      record_comeback_if_needed: { Args: never; Returns: Json };
      record_market_view: { Args: { p_market_id: string }; Returns: undefined };
      record_oracle_snapshot: { Args: { p_market_id: string }; Returns: number };
      refresh_demo_live_markets: { Args: never; Returns: Json };
      refresh_market_lifecycle: { Args: never; Returns: Json };
      refresh_market_participant_stats: {
        Args: { p_market_id: string };
        Returns: undefined;
      };
      refresh_profile_stats: { Args: { p_user_id: string }; Returns: undefined };
      refresh_user_ai_memory: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      refund_market: {
        Args: { p_market_id: string; p_reason?: string };
        Returns: Json;
      };
      repost_feed_post: { Args: { p_post_id: string }; Returns: number };
      request_withdrawal: {
        Args: { p_amount: number; p_pix_key: string };
        Returns: Json;
      };
      resolve_expired_markets: { Args: never; Returns: number };
      resolve_market: {
        Args: {
          p_market_id: string;
          p_winning_side: Database["public"]["Enums"]["bet_side"];
        };
        Returns: Json;
      };
      resolve_partner_slug: { Args: { p_slug: string }; Returns: Json };
      seed_oracle_snapshots_for_market: {
        Args: { p_count?: number; p_market_id: string };
        Returns: number;
      };
      service_credit_balance: {
        Args: { p_amount: number; p_intent_id: string; p_user_id: string };
        Returns: undefined;
      };
      service_refund_withdrawal: {
        Args: { p_amount: number; p_intent_id: string; p_user_id: string };
        Returns: undefined;
      };
      set_casino_opt_out: { Args: { p_opt_out: boolean }; Returns: Json };
      settle_market: {
        Args: {
          p_market_id: string;
          p_resolution_id?: string;
          p_winning_side: Database["public"]["Enums"]["bet_side"];
        };
        Returns: Json;
      };
      should_send_notification: {
        Args: {
          p_kind: Database["public"]["Enums"]["notif_kind"];
          p_user_id: string;
        };
        Returns: boolean;
      };
      streak_xp_multiplier: { Args: { p_streak: number }; Returns: number };
      sync_admin_from_allowlist: { Args: never; Returns: undefined };
      tick_market_lifecycle: { Args: never; Returns: Json };
      tick_region_simulator: { Args: never; Returns: undefined };
      toggle_trader_follow: {
        Args: { p_following_id: string };
        Returns: boolean;
      };
      track_partner_click: {
        Args: { p_campaign_id?: string; p_ip_hash?: string; p_slug: string };
        Returns: Json;
      };
      try_sync_admin_allowlist: { Args: never; Returns: Json };
      use_streak_freeze: { Args: never; Returns: Json };
      validate_market_pools: {
        Args: {
          p_pool_no: number;
          p_pool_yes: number;
          p_winning_side: Database["public"]["Enums"]["bet_side"];
        };
        Returns: string;
      };
      validate_oracle_reading: {
        Args: { p_market_id: string; p_resolution_id: string };
        Returns: Json;
      };
      vote_daily_poll: { Args: { p_vote: boolean }; Returns: Json };
      wallet_deposit: { Args: { p_amount: number }; Returns: Json };
      wallet_withdraw: { Args: { p_amount: number }; Returns: Json };
    };
    Enums: {
      bet_side: "YES" | "NO";
      division_tier: "Bronze" | "Prata" | "Ouro" | "Platina" | "Diamante" | "Elite";
      feed_tag: "Alerta" | "Análise" | "Previsão" | "Insight";
      market_category: "Fluxo" | "Velocidade" | "Congestionamento" | "Evento";
      market_status:
        | "live"
        | "closing"
        | "resolved"
        | "closed"
        | "resolving"
        | "dispute"
        | "settled"
        | "void"
        | "draft";
      notif_kind: "win" | "alert" | "rank" | "market" | "refund" | "void";
      partner_status: "pending" | "active" | "suspended";
      spin_source: "daily" | "deposit_bonus";
      tx_type:
        | "deposit"
        | "withdraw"
        | "entry"
        | "payout"
        | "refund"
        | "house_fee"
        | "loss"
        | "bonus";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      bet_side: ["YES", "NO"],
      division_tier: ["Bronze", "Prata", "Ouro", "Platina", "Diamante", "Elite"],
      feed_tag: ["Alerta", "Análise", "Previsão", "Insight"],
      market_category: ["Fluxo", "Velocidade", "Congestionamento", "Evento"],
      market_status: [
        "live",
        "closing",
        "resolved",
        "closed",
        "resolving",
        "dispute",
        "settled",
        "void",
        "draft",
      ],
      notif_kind: ["win", "alert", "rank", "market", "refund", "void"],
      partner_status: ["pending", "active", "suspended"],
      spin_source: ["daily", "deposit_bonus"],
      tx_type: ["deposit", "withdraw", "entry", "payout", "refund", "house_fee", "loss", "bonus"],
    },
  },
} as const;
