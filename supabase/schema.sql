-- CalReal Deals Supabase Schema
-- Properties table with deal scoring and rent cap information
CREATE TABLE properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CA',
  zip_code TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  sqft INTEGER NOT NULL,
  beds INTEGER NOT NULL,
  baths DECIMAL(3,1) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  year_built INTEGER NOT NULL,
  property_type TEXT NOT NULL, -- 'single_family', 'condo', 'townhouse', 'multi_family'
  listing_url TEXT,
  listing_source TEXT, -- 'zillow', 'redfin', 'mls', etc.
  neighborhood_id UUID REFERENCES neighborhood_stats(id),
  deal_score DECIMAL(5,2), -- Higher score = better deal
  price_per_sqft DECIMAL(8,2) GENERATED ALWAYS AS (price / sqft) STORED,
  is_rent_stabilized BOOLEAN DEFAULT FALSE,
  rent_cap_percentage DECIMAL(5,2), -- AB 1482 rent cap percentage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Neighborhood statistics for comparison
CREATE TABLE neighborhood_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'CA',
  median_price DECIMAL(12,2) NOT NULL,
  median_price_per_sqft DECIMAL(8,2) NOT NULL,
  avg_sqft INTEGER NOT NULL,
  avg_beds DECIMAL(3,1) NOT NULL,
  avg_baths DECIMAL(3,1) NOT NULL,
  avg_year_built INTEGER NOT NULL,
  total_properties INTEGER DEFAULT 0,
  price_appreciation_rate DECIMAL(5,2), -- Annual appreciation %
  rental_yield DECIMAL(5,2), -- Average rental yield %
  walk_score INTEGER,
  transit_score INTEGER,
  crime_rate DECIMAL(5,2), -- Crime rate per 1000 residents
  school_rating DECIMAL(3,1), -- Average school rating 1-10
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User saved deals
CREATE TABLE saved_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  notes TEXT,
  status TEXT DEFAULT 'saved', -- 'saved', 'contacted', 'visited', 'made_offer', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

-- Property images
CREATE TABLE property_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT DEFAULT 'photo', -- 'photo', 'floor_plan', 'street_view'
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market trends data
CREATE TABLE market_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  neighborhood_id UUID REFERENCES neighborhood_stats(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  median_price DECIMAL(12,2),
  median_price_per_sqft DECIMAL(8,2),
  days_on_market INTEGER,
  inventory_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(neighborhood_id, date)
);

-- Enable RLS (Row Level Security)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Properties are viewable by everyone" ON properties FOR SELECT USING (true);
CREATE POLICY "Users can view their own saved deals" ON saved_deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved deals" ON saved_deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own saved deals" ON saved_deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved deals" ON saved_deals FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_properties_location ON properties USING GIST (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_deal_score ON properties(deal_score DESC);
CREATE INDEX idx_properties_neighborhood ON properties(neighborhood_id);
CREATE INDEX idx_properties_year_built ON properties(year_built);
CREATE INDEX idx_properties_rent_stabilized ON properties(is_rent_stabilized);

CREATE INDEX idx_neighborhood_stats_location ON neighborhood_stats(name, city, state);
CREATE INDEX idx_saved_deals_user ON saved_deals(user_id);
CREATE INDEX idx_saved_deals_status ON saved_deals(status);

-- Function to calculate deal score
CREATE OR REPLACE FUNCTION calculate_deal_score(
  p_price DECIMAL,
  p_sqft INTEGER,
  p_neighborhood_median_price_per_sqft DECIMAL,
  p_year_built INTEGER,
  p_is_rent_stabilized BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
  price_ratio DECIMAL;
  age_factor DECIMAL;
  rent_stabilization_bonus DECIMAL;
  base_score DECIMAL := 50.0;
BEGIN
  -- Price comparison (lower price = higher score)
  IF p_neighborhood_median_price_per_sqft > 0 THEN
    price_ratio := (p_price / p_sqft) / p_neighborhood_median_price_per_sqft;
  ELSE
    price_ratio := 1.0;
  END IF;
  
  -- Age factor (older properties get bonus for potential rent stabilization)
  age_factor := CASE 
    WHEN p_year_built < (EXTRACT(YEAR FROM NOW()) - 50) THEN 15.0
    WHEN p_year_built < (EXTRACT(YEAR FROM NOW()) - 30) THEN 10.0
    WHEN p_year_built < (EXTRACT(YEAR FROM NOW()) - 15) THEN 5.0
    ELSE 0.0
  END;
  
  -- Rent stabilization bonus
  rent_stabilization_bonus := CASE 
    WHEN p_is_rent_stabilized THEN 20.0
    ELSE 0.0
  END;
  
  -- Calculate final score (0-100)
  RETURN LEAST(100.0, GREATEST(0.0, 
    base_score + 
    (1.0 - price_ratio) * 30.0 + -- Price factor (up to 30 points)
    age_factor + -- Age factor (up to 15 points)
    rent_stabilization_bonus -- Rent stabilization bonus (up to 20 points)
  ));
END;
$$ LANGUAGE plpgsql;

-- Function to check AB 1482 rent cap eligibility
CREATE OR REPLACE FUNCTION check_rent_cap_eligibility(p_year_built INTEGER) 
RETURNS BOOLEAN AS $$
BEGIN
  -- AB 1482 applies to properties older than 15 years
  RETURN p_year_built < (EXTRACT(YEAR FROM NOW()) - 15);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update deal score and rent stabilization status
CREATE OR REPLACE FUNCTION update_property_metrics()
RETURNS TRIGGER AS $$
DECLARE
  neighborhood_median DECIMAL;
BEGIN
  -- Get neighborhood median price per sqft
  SELECT median_price_per_sqft INTO neighborhood_median
  FROM neighborhood_stats
  WHERE id = NEW.neighborhood_id;
  
  -- Update deal score
  NEW.deal_score = calculate_deal_score(
    NEW.price, 
    NEW.sqft, 
    COALESCE(neighborhood_median, NEW.price / NEW.sqft),
    NEW.year_built,
    NEW.is_rent_stabilized
  );
  
  -- Update rent stabilization status
  NEW.is_rent_stabilized = check_rent_cap_eligibility(NEW.year_built);
  
  -- Set rent cap percentage (5% + inflation for AB 1482)
  IF NEW.is_rent_stabilized THEN
    NEW.rent_cap_percentage = 5.0; -- Base 5% + inflation adjustment
  ELSE
    NEW.rent_cap_percentage = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_metrics
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_property_metrics();

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neighborhood_stats_updated_at
  BEFORE UPDATE ON neighborhood_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_deals_updated_at
  BEFORE UPDATE ON saved_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
