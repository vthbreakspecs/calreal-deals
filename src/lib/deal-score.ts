import { calculateRentStabilizationBoost } from './rent-cap-helper'

export interface PropertyMetrics {
  price: number
  sqft: number
  beds: number
  baths: number
  yearBuilt: number
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family'
  latitude: number
  longitude: number
}

export interface NeighborhoodData {
  medianPricePerSqft: number
  medianPrice: number
  avgSqft: number
  avgBeds: number
  avgBaths: number
  avgYearBuilt: number
  priceAppreciationRate?: number
  rentalYield?: number
  walkScore?: number
  transitScore?: number
  crimeRate?: number
  schoolRating?: number
}

export interface DealScoreBreakdown {
  totalScore: number
  priceAdvantage: number
  sizeAdvantage: number
  ageAdvantage: number
  rentStabilizationBonus: number
  locationBonus: number
  marketTimingBonus: number
  breakdown: {
    component: string
    score: number
    maxScore: number
    explanation: string
  }[]
}

/**
 * Calculate comprehensive deal score for California properties
 * Score range: 0-100 (higher = better deal)
 */
export function calculateDealScore(
  property: PropertyMetrics,
  neighborhood: NeighborhoodData,
  nearbyProperties?: PropertyMetrics[]
): DealScoreBreakdown {
  const breakdown: { component: string; score: number; maxScore: number; explanation: string }[] = []
  let totalScore = 0

  // 1. Price Advantage (40 points)
  const priceAdvantage = calculatePriceAdvantage(property, neighborhood)
  breakdown.push({
    component: 'Price Advantage',
    score: priceAdvantage,
    maxScore: 40,
    explanation: `Property at $${(property.price / property.sqft).toFixed(0)}/sqft vs neighborhood avg $${neighborhood.medianPricePerSqft.toFixed(0)}/sqft`
  })
  totalScore += priceAdvantage

  // 2. Size & Layout Advantage (15 points)
  const sizeAdvantage = calculateSizeAdvantage(property, neighborhood)
  breakdown.push({
    component: 'Size & Layout',
    score: sizeAdvantage,
    maxScore: 15,
    explanation: `${property.beds}bed/${property.baths}bath, ${property.sqft}sqft vs neighborhood averages`
  })
  totalScore += sizeAdvantage

  // 3. Age & Rent Stabilization (25 points)
  const ageAdvantage = calculateAgeAdvantage(property, neighborhood)
  const rentStabilizationBonus = calculateRentStabilizationBonusValue(property, neighborhood)
  breakdown.push({
    component: 'Age & Rent Stabilization',
    score: ageAdvantage + rentStabilizationBonus,
    maxScore: 25,
    explanation: `Built ${property.yearBuilt}, rent stabilization bonus: ${rentStabilizationBonus.toFixed(1)}pts`
  })
  totalScore += ageAdvantage + rentStabilizationBonus

  // 4. Location & Amenities (10 points)
  const locationBonus = calculateLocationBonus(neighborhood)
  breakdown.push({
    component: 'Location & Amenities',
    score: locationBonus,
    maxScore: 10,
    explanation: `Walk score: ${neighborhood.walkScore || 'N/A'}, schools: ${neighborhood.schoolRating || 'N/A'}`
  })
  totalScore += locationBonus

  // 5. Market Timing (10 points)
  const marketTimingBonus = calculateMarketTimingBonus(neighborhood)
  breakdown.push({
    component: 'Market Timing',
    score: marketTimingBonus,
    maxScore: 10,
    explanation: `Market appreciation: ${neighborhood.priceAppreciationRate || 'N/A'}%, rental yield: ${neighborhood.rentalYield || 'N/A'}%`
  })
  totalScore += marketTimingBonus

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    priceAdvantage,
    sizeAdvantage,
    ageAdvantage,
    rentStabilizationBonus,
    locationBonus,
    marketTimingBonus,
    breakdown
  }
}

/**
 * Calculate price advantage based on neighborhood comparison
 */
function calculatePriceAdvantage(property: PropertyMetrics, neighborhood: NeighborhoodData): number {
  const propertyPricePerSqft = property.price / property.sqft
  const priceRatio = propertyPricePerSqft / neighborhood.medianPricePerSqft
  
  // Score: 0-40 points (lower price = higher score)
  if (priceRatio <= 0.8) return 40 // 20%+ below market
  if (priceRatio <= 0.9) return 35 // 10-20% below market
  if (priceRatio <= 0.95) return 30 // 5-10% below market
  if (priceRatio <= 1.0) return 25 // At or slightly below market
  if (priceRatio <= 1.05) return 20 // 0-5% above market
  if (priceRatio <= 1.1) return 15 // 5-10% above market
  if (priceRatio <= 1.2) return 10 // 10-20% above market
  return 5 // 20%+ above market
}

/**
 * Calculate size and layout advantage
 */
function calculateSizeAdvantage(property: PropertyMetrics, neighborhood: NeighborhoodData): number {
  let score = 7.5 // Base score
  
  // Size comparison
  const sizeRatio = property.sqft / neighborhood.avgSqft
  if (sizeRatio >= 1.2) score += 4 // 20%+ larger
  else if (sizeRatio >= 1.1) score += 3 // 10-20% larger
  else if (sizeRatio >= 1.0) score += 2 // Same size or larger
  else if (sizeRatio >= 0.9) score += 1 // 0-10% smaller
  else score -= 2 // 10%+ smaller
  
  // Bedroom/bathroom layout efficiency
  const bedBathRatio = property.beds / property.baths
  if (bedBathRatio >= 1 && bedBathRatio <= 2) score += 2 // Good ratio
  else if (bedBathRatio > 2) score -= 1 // Too many beds per bath
  
  // Property type bonus
  if (property.propertyType === 'single_family') score += 2
  else if (property.propertyType === 'townhouse') score += 1
  
  return Math.min(15, Math.max(0, score))
}

/**
 * Calculate age advantage and rent stabilization potential
 */
function calculateAgeAdvantage(property: PropertyMetrics, neighborhood: NeighborhoodData): number {
  const currentYear = new Date().getFullYear()
  const propertyAge = currentYear - property.yearBuilt
  const neighborhoodAge = currentYear - neighborhood.avgYearBuilt
  
  let score = 10 // Base score
  
  // Age comparison vs neighborhood
  if (propertyAge > neighborhoodAge + 20) score += 5 // Much older (potential for character/rent stabilization)
  else if (propertyAge > neighborhoodAge + 10) score += 3 // Older
  else if (propertyAge > neighborhoodAge - 5) score += 1 // Similar age
  else score -= 2 // Newer than neighborhood average
  
  // Historical value preservation
  if (propertyAge >= 50) score += 3 // Historic charm potential
  else if (propertyAge >= 30) score += 2 // Established neighborhood
  
  return Math.min(15, Math.max(0, score))
}

/**
 * Calculate rent stabilization bonus value
 */
function calculateRentStabilizationBonusValue(property: PropertyMetrics, neighborhood: NeighborhoodData): number {
  const currentYear = new Date().getFullYear()
  const propertyAge = currentYear - property.yearBuilt
  
  // Only properties 15+ years old qualify for AB 1482
  if (propertyAge < 15) return 0
  
  // Calculate bonus based on rent stabilization value
  const estimatedMarketRent = (property.price * 0.008) / 12 // Rough 0.8% monthly rental rate
  const rentStabilizationBoost = calculateRentStabilizationBoost(
    property.yearBuilt,
    estimatedMarketRent,
    0.05 + 0.034 // 5% + inflation
  )
  
  // Convert boost score to 0-10 point scale
  return Math.min(10, rentStabilizationBoost.boostScore / 2)
}

/**
 * Calculate location and amenities bonus
 */
function calculateLocationBonus(neighborhood: NeighborhoodData): number {
  let score = 5 // Base score
  
  // Walkability
  if (neighborhood.walkScore) {
    if (neighborhood.walkScore >= 90) score += 3 // Walker's Paradise
    else if (neighborhood.walkScore >= 70) score += 2 // Very Walkable
    else if (neighborhood.walkScore >= 50) score += 1 // Somewhat Walkable
  }
  
  // Schools
  if (neighborhood.schoolRating) {
    if (neighborhood.schoolRating >= 8) score += 2 // Excellent schools
    else if (neighborhood.schoolRating >= 6) score += 1 // Good schools
  }
  
  // Safety (inverse of crime rate)
  if (neighborhood.crimeRate) {
    if (neighborhood.crimeRate <= 20) score += 2 // Very safe
    else if (neighborhood.crimeRate <= 40) score += 1 // Safe
  }
  
  // Transit
  if (neighborhood.transitScore) {
    if (neighborhood.transitScore >= 70) score += 1 // Good transit
  }
  
  return Math.min(10, Math.max(0, score))
}

/**
 * Calculate market timing bonus
 */
function calculateMarketTimingBonus(neighborhood: NeighborhoodData): number {
  let score = 5 // Base score
  
  // Price appreciation potential
  if (neighborhood.priceAppreciationRate) {
    if (neighborhood.priceAppreciationRate >= 8) score += 3 // High appreciation
    else if (neighborhood.priceAppreciationRate >= 5) score += 2 // Good appreciation
    else if (neighborhood.priceAppreciationRate >= 3) score += 1 // Moderate appreciation
    else if (neighborhood.priceAppreciationRate < 0) score -= 2 // Declining market
  }
  
  // Rental yield
  if (neighborhood.rentalYield) {
    if (neighborhood.rentalYield >= 6) score += 2 // High rental yield
    else if (neighborhood.rentalYield >= 4) score += 1 // Good rental yield
  }
  
  return Math.min(10, Math.max(0, score))
}

/**
 * Get deal score category
 */
export function getDealScoreCategory(score: number): {
  category: string
  color: string
  description: string
  recommendation: string
} {
  if (score >= 90) {
    return {
      category: 'Excellent Deal',
      color: 'green',
      description: 'Outstanding value with strong investment potential',
      recommendation: 'Act quickly - these deals are rare and competitive'
    }
  } else if (score >= 80) {
    return {
      category: 'Great Deal',
      color: 'blue',
      description: 'Significantly undervalued with good fundamentals',
      recommendation: 'Strong consideration - schedule viewing ASAP'
    }
  } else if (score >= 70) {
    return {
      category: 'Good Deal',
      color: 'yellow',
      description: 'Fairly priced with some advantages',
      recommendation: 'Worth investigating further'
    }
  } else if (score >= 60) {
    return {
      category: 'Average Deal',
      color: 'orange',
      description: 'Market price with typical features',
      recommendation: 'Consider if it meets specific needs'
    }
  } else {
    return {
      category: 'Poor Deal',
      color: 'red',
      description: 'Overpriced or lacking key features',
      recommendation: 'Pass unless there are compelling reasons'
    }
  }
}

/**
 * Generate investment recommendation based on deal score and property characteristics
 */
export function generateInvestmentRecommendation(
  dealScore: DealScoreBreakdown,
  property: PropertyMetrics,
  neighborhood: NeighborhoodData
): {
  recommendation: string
  reasoning: string
  risks: string[]
  opportunities: string[]
} {
  const category = getDealScoreCategory(dealScore.totalScore)
  const risks: string[] = []
  const opportunities: string[] = []
  
  // Analyze risks
  if (dealScore.priceAdvantage < 20) {
    risks.push('Property may be overpriced compared to neighborhood')
  }
  
  if (property.yearBuilt > (new Date().getFullYear() - 5)) {
    risks.push('New construction may have premium pricing')
  }
  
  if (neighborhood.crimeRate && neighborhood.crimeRate > 50) {
    risks.push('Higher crime rate in area')
  }
  
  if (neighborhood.priceAppreciationRate && neighborhood.priceAppreciationRate < 2) {
    risks.push('Low appreciation potential')
  }
  
  // Analyze opportunities
  if (dealScore.rentStabilizationBonus > 5) {
    opportunities.push('Rent stabilization provides predictable cash flow')
  }
  
  if (dealScore.locationBonus > 7) {
    opportunities.push('Excellent location with strong amenities')
  }
  
  if (neighborhood.priceAppreciationRate && neighborhood.priceAppreciationRate > 6) {
    opportunities.push('High neighborhood appreciation potential')
  }
  
  if (neighborhood.rentalYield && neighborhood.rentalYield > 5) {
    opportunities.push('Strong rental yield for investment')
  }
  
  const reasoning = `Based on a ${dealScore.totalScore.toFixed(1)}/100 deal score, this property ${category.description.toLowerCase()}. Key factors include ${dealScore.breakdown[0].component.toLowerCase()} (${dealScore.breakdown[0].score.toFixed(1)}/${dealScore.breakdown[0].maxScore} points) and ${dealScore.breakdown[1].component.toLowerCase()} (${dealScore.breakdown[1].score.toFixed(1)}/${dealScore.breakdown[1].maxScore} points).`
  
  return {
    recommendation: category.recommendation,
    reasoning,
    risks,
    opportunities
  }
}
