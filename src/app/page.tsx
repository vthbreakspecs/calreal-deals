import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, TrendingUp, Shield, MapPin, Home } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            CalReal Deals
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover undervalued and rent-stabilized properties across California. 
            Our AI-powered deal scoring helps you find the best investment opportunities 
            with AB 1482 rent cap analysis.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/discovery">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <Search className="w-5 h-5 mr-2" />
                Start Searching
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-blue-600" />
              <CardTitle className="text-lg">Deal Scoring</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Advanced algorithm analyzes price, location, and market data to score properties 0-100
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <CardTitle className="text-lg">Rent Cap Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                AB 1482 compliance tracking and rent stabilization benefits for properties 15+ years old
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <MapPin className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <CardTitle className="text-lg">Interactive Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Filterable map view with neighborhood comparisons and market trend analysis
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Home className="w-12 h-12 mx-auto mb-4 text-orange-600" />
              <CardTitle className="text-lg">Real-time Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Up-to-date listings from multiple sources with comprehensive property details
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Search Properties</h3>
              <p className="text-gray-600">
                Browse listings across California with advanced filters for price, location, and property type
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Analyze Deals</h3>
              <p className="text-gray-600">
                View deal scores, rent cap eligibility, and neighborhood comparisons for each property
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Make Informed Offers</h3>
              <p className="text-gray-600">
                Save deals and track your progress with data-driven investment recommendations
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-blue-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Deal?</h2>
          <p className="text-xl mb-6">
            Join investors using CalReal Deals to discover undervalued California properties
          </p>
          <Link href="/discovery">
            <Button size="lg" variant="secondary">
              Start Your Search Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
