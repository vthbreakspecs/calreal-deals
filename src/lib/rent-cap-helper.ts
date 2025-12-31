/**
 * California Rent Cap Helper - AB 1482 Implementation
 * 
 * AB 1482 (Tenant Protection Act of 2019) Key Points:
 * - Applies to residential properties built before 2009 (15+ years old)
 * - Limits annual rent increases to 5% + inflation rate
 * - Covers most rental units except some exemptions
 */

export interface RentCapInfo {
  isEligible: boolean
  maxIncreasePercentage: number
  currentYear: number
  yearBuilt: number
  propertyAge: number
  exemptionReasons: string[]
  nextYearCap: number
}

export interface InflationData {
  rate: number
  year: number
  source: string
}

// Current inflation rate (would typically fetch from CPI data)
const CURRENT_INFLATION_RATE = 3.4 // Example: 2024 CPI inflation rate

/**
 * Check if a property is subject to AB 1482 rent cap regulations
 */
export function checkRentCapEligibility(yearBuilt: number): RentCapInfo {
  const currentYear = new Date().getFullYear()
  const propertyAge = currentYear - yearBuilt
  const isEligible = propertyAge >= 15

  const exemptionReasons: string[] = []
  
  if (!isEligible) {
    exemptionReasons.push(`Property is only ${propertyAge} years old (must be 15+ years)`)
  }

  // Calculate maximum rent increase (5% + inflation)
  const maxIncreasePercentage = isEligible ? 5.0 + CURRENT_INFLATION_RATE : 0

  // Project next year's cap (would need updated inflation data)
  const nextYearCap = isEligible ? 5.0 + (CURRENT_INFLATION_RATE * 0.9) : 0 // Conservative estimate

  return {
    isEligible,
    maxIncreasePercentage,
    currentYear,
    yearBuilt,
    propertyAge,
    exemptionReasons,
    nextYearCap
  }
}

/**
 * Calculate maximum allowable rent increase amount
 */
export function calculateMaxRentIncrease(
  currentRent: number,
  yearBuilt: number,
  inflationRate?: number
): {
  maxIncrease: number
  maxNewRent: number
  increasePercentage: number
  isEligible: boolean
} {
  const rentCapInfo = checkRentCapEligibility(yearBuilt)
  const inflation = inflationRate || CURRENT_INFLATION_RATE
  
  if (!rentCapInfo.isEligible) {
    return {
      maxIncrease: 0,
      maxNewRent: currentRent,
      increasePercentage: 0,
      isEligible: false
    }
  }

  const increasePercentage = 5.0 + inflation
  const maxIncrease = currentRent * (increasePercentage / 100)
  const maxNewRent = currentRent + maxIncrease

  return {
    maxIncrease,
    maxNewRent,
    increasePercentage,
    isEligible: true
  }
}

/**
 * Check for additional exemptions beyond age requirement
 */
export function checkAdditionalExemptions(
  propertyType: string,
  isSingleFamily: boolean,
  ownerOccupied: boolean,
  recentlyBuilt: boolean
): {
  hasExemptions: boolean
  exemptionReasons: string[]
  isSubjectToAB1482: boolean
} {
  const exemptionReasons: string[] = []

  // Single-family homes and condos owned by landlords who own no more than two properties
  if (isSingleFamily && !ownerOccupied) {
    exemptionReasons.push("Single-family home owned by small landlord (≤2 properties)")
  }

  // Recently constructed buildings (less than 15 years old)
  if (recentlyBuilt) {
    exemptionReasons.push("Recently constructed property")
  }

  // Housing built after 2008 (already covered by age check)
  // Dormitories, school housing
  if (propertyType.toLowerCase().includes('dorm') || propertyType.toLowerCase().includes('school')) {
    exemptionReasons.push("Educational institution housing")
  }

  // Hotels and motels
  if (propertyType.toLowerCase().includes('hotel') || propertyType.toLowerCase().includes('motel')) {
    exemptionReasons.push("Transient lodging")
  }

  // Nonprofit housing with restrictions
  if (propertyType.toLowerCase().includes('nonprofit') || propertyType.toLowerCase().includes('affordable')) {
    exemptionReasons.push("Restricted affordable housing")
  }

  const hasExemptions = exemptionReasons.length > 0
  const isSubjectToAB1482 = !hasExemptions

  return {
    hasExemptions,
    exemptionReasons,
    isSubjectToAB1482
  }
}

/**
 * Generate rent cap notice text for landlords
 */
export function generateRentCapNotice(
  currentRent: number,
  yearBuilt: number,
  propertyType: string,
  isSingleFamily: boolean = false,
  ownerOccupied: boolean = false
): {
  notice: string
  isEligible: boolean
  maxIncrease: number
  complianceNotes: string[]
} {
  const rentCapInfo = checkRentCapEligibility(yearBuilt)
  const exemptionCheck = checkAdditionalExemptions(propertyType, isSingleFamily, ownerOccupied, yearBuilt > 2009)
  const increaseCalc = calculateMaxRentIncrease(currentRent, yearBuilt)

  const complianceNotes: string[] = []

  let notice = ""

  if (!rentCapInfo.isEligible || exemptionCheck.hasExemptions) {
    notice = "⚠️ This property may be exempt from AB 1482 rent cap regulations.\n\n"
    
    if (!rentCapInfo.isEligible) {
      notice += `Property Age Exemption: Built in ${yearBuilt} (${rentCapInfo.propertyAge} years old)\n`
      notice += "AB 1482 applies to properties 15+ years old.\n\n"
    }

    if (exemptionCheck.hasExemptions) {
      notice += "Additional Exemptions:\n"
      exemptionCheck.exemptionReasons.forEach(reason => {
        notice += `• ${reason}\n`
      })
      complianceNotes.push("Consult with legal counsel to confirm exemption status")
    }
  } else {
    notice = "✅ This property is subject to AB 1482 rent cap regulations.\n\n"
    notice += `Current Rent: $${currentRent.toLocaleString()}\n`
    notice += `Maximum Annual Increase: ${increaseCalc.increasePercentage.toFixed(1)}%\n`
    notice += `Maximum Increase Amount: $${increaseCalc.maxIncrease.toFixed(2)}\n`
    notice += `Maximum New Rent: $${increaseCalc.maxNewRent.toLocaleString()}\n\n`
    
    complianceNotes.push("Provide proper 90-day notice for rent increases")
    complianceNotes.push("Include AB 1482 compliance information in notice")
    complianceNotes.push("Keep documentation of inflation rate calculation")
  }

  notice += "\n---\n"
  notice += "This is for informational purposes only. Consult with legal counsel for specific compliance requirements."

  return {
    notice,
    isEligible: rentCapInfo.isEligible && !exemptionCheck.hasExemptions,
    maxIncrease: increaseCalc.maxIncrease,
    complianceNotes
  }
}

/**
 * Calculate deal score boost for rent-stabilized properties
 */
export function calculateRentStabilizationBoost(
  yearBuilt: number,
  currentMarketRent: number,
  potentialRentIncrease: number
): {
  boostScore: number
  annualValue: number
  fiveYearValue: number
  reasoning: string
} {
  const rentCapInfo = checkRentCapEligibility(yearBuilt)
  
  if (!rentCapInfo.isEligible) {
    return {
      boostScore: 0,
      annualValue: 0,
      fiveYearValue: 0,
      reasoning: "Property not eligible for rent stabilization benefits"
    }
  }

  // Calculate value of rent stability (predictable increases vs market volatility)
  const marketVolatilityPremium = 0.08 // 8% annual market volatility assumption
  const stabilizedIncrease = rentCapInfo.maxIncreasePercentage / 100
  const volatilityBenefit = marketVolatilityPremium - stabilizedIncrease
  
  const annualValue = currentMarketRent * volatilityBenefit
  const fiveYearValue = annualValue * 5 // 5-year projection
  
  // Boost score based on annual value (0-20 points max)
  const boostScore = Math.min(20, Math.max(0, (annualValue / currentMarketRent) * 100))

  const reasoning = `Rent stabilization provides predictable ${rentCapInfo.maxIncreasePercentage.toFixed(1)}% annual increases vs estimated ${marketVolatilityPremium * 100}% market volatility, creating ${annualValue.toFixed(0)} annual value advantage.`

  return {
    boostScore,
    annualValue,
    fiveYearValue,
    reasoning
  }
}
