'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, MapPin, Home, Calendar, TrendingUp, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

type Property = Database['public']['Tables']['properties']['Row']

interface MapEventsProps {
  onLocationSelect: (lat: number, lng: number) => void
}

function MapEvents({ onLocationSelect }: MapEventsProps) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function DiscoveryPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list')
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [propertyType, setPropertyType] = useState<string>('all')
  const [minDealScore, setMinDealScore] = useState<string>('0')
  const [rentStabilizedOnly, setRentStabilizedOnly] = useState(false)
  
  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]) // San Francisco
  const [mapZoom, setMapZoom] = useState(12)

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [properties, searchTerm, priceRange, propertyType, minDealScore, rentStabilizedOnly])

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('deal_score', { ascending: false })
        .limit(100)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...properties]

    // Search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.zip_code.includes(searchTerm)
      )
    }

    // Price range
    if (priceRange.min) {
      filtered = filtered.filter(p => p.price >= Number(priceRange.min))
    }
    if (priceRange.max) {
      filtered = filtered.filter(p => p.price <= Number(priceRange.max))
    }

    // Property type
    if (propertyType !== 'all') {
      filtered = filtered.filter(p => p.property_type === propertyType)
    }

    // Deal score
    if (minDealScore !== '0') {
      filtered = filtered.filter(p => (p.deal_score || 0) >= Number(minDealScore))
    }

    // Rent stabilized
    if (rentStabilizedOnly) {
      filtered = filtered.filter(p => p.is_rent_stabilized)
    }

    setFilteredProperties(filtered)
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setMapCenter([lat, lng])
    setMapZoom(14)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getDealScoreColor = (score: number | null) => {
    if (!score) return 'bg-gray-500'
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const PropertyCard = ({ property }: { property: Property }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedProperty(property)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{property.address}</CardTitle>
            <p className="text-sm text-gray-600">{property.city}, CA {property.zip_code}</p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={`${getDealScoreColor(property.deal_score)} text-white`}>
              Score: {property.deal_score?.toFixed(1) || 'N/A'}
            </Badge>
            {property.is_rent_stabilized && (
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Rent Cap
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-green-600">{formatPrice(property.price)}</p>
            <p className="text-sm text-gray-600">{formatPrice(property.price_per_sqft)}/sqft</p>
          </div>
          <div className="text-sm space-y-1">
            <div className="flex items-center">
              <Home className="w-4 h-4 mr-1" />
              {property.beds} bed, {property.baths} bath
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Built {property.year_built}
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {property.sqft.toLocaleString()} sqft
            </div>
          </div>
        </div>
        {property.rent_cap_percentage && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Max rent increase: {property.rent_cap_percentage}% annually
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading properties...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover California Real Estate Deals</h1>
        <p className="text-gray-600">Find undervalued and rent-stabilized properties across California</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Min Price"
                type="number"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              />
              <Input
                placeholder="Max Price"
                type="number"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              />
            </div>

            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="multi_family">Multi Family</SelectItem>
              </SelectContent>
            </Select>

            <Select value={minDealScore} onValueChange={setMinDealScore}>
              <SelectTrigger>
                <SelectValue placeholder="Min Deal Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Scores</SelectItem>
                <SelectItem value="70">70+ (Good)</SelectItem>
                <SelectItem value="80">80+ (Great)</SelectItem>
                <SelectItem value="90">90+ (Excellent)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 mt-4">
            <Button
              variant={rentStabilizedOnly ? "default" : "outline"}
              onClick={() => setRentStabilizedOnly(!rentStabilizedOnly)}
              className="flex items-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              Rent Stabilized Only
            </Button>
            
            <div className="flex gap-2 ml-auto">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                onClick={() => setViewMode('map')}
              >
                Map View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredProperties.length} of {properties.length} properties
        </p>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[600px] rounded-lg overflow-hidden border">
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapEvents onLocationSelect={handleLocationSelect} />
              {filteredProperties.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.latitude, property.longitude]}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold">{property.address}</h3>
                      <p className="text-sm">{formatPrice(property.price)}</p>
                      <p className="text-sm">Score: {property.deal_score?.toFixed(1) || 'N/A'}</p>
                      {property.is_rent_stabilized && (
                        <p className="text-sm text-blue-600">✓ Rent Stabilized</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          <div className="h-[600px] overflow-y-auto space-y-4">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      )}

      {filteredProperties.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No properties found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
