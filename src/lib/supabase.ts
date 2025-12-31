import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          address: string
          city: string
          state: string
          zip_code: string
          price: number
          sqft: number
          beds: number
          baths: number
          latitude: number
          longitude: number
          year_built: number
          property_type: 'single_family' | 'condo' | 'townhouse' | 'multi_family'
          listing_url: string | null
          listing_source: string | null
          neighborhood_id: string | null
          deal_score: number | null
          price_per_sqft: number
          is_rent_stabilized: boolean
          rent_cap_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at' | 'price_per_sqft' | 'deal_score' | 'is_rent_stabilized' | 'rent_cap_percentage'>
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
      }
      neighborhood_stats: {
        Row: {
          id: string
          name: string
          city: string
          state: string
          median_price: number
          median_price_per_sqft: number
          avg_sqft: number
          avg_beds: number
          avg_baths: number
          avg_year_built: number
          total_properties: number
          price_appreciation_rate: number | null
          rental_yield: number | null
          walk_score: number | null
          transit_score: number | null
          crime_rate: number | null
          school_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['neighborhood_stats']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['neighborhood_stats']['Insert']>
      }
      saved_deals: {
        Row: {
          id: string
          user_id: string
          property_id: string
          notes: string | null
          status: 'saved' | 'contacted' | 'visited' | 'made_offer' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['saved_deals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['saved_deals']['Insert']>
      }
      property_images: {
        Row: {
          id: string
          property_id: string
          image_url: string
          image_type: 'photo' | 'floor_plan' | 'street_view'
          is_primary: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['property_images']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['property_images']['Insert']>
      }
      market_trends: {
        Row: {
          id: string
          neighborhood_id: string
          date: string
          median_price: number | null
          median_price_per_sqft: number | null
          days_on_market: number | null
          inventory_count: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['market_trends']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['market_trends']['Insert']>
      }
    }
  }
}
