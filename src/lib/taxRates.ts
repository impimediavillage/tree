import taxDataJson from '@/../../public/data/countries_retail_consumption_tax_rates.json';

export interface TaxRateData {
  country: string;
  standard_rate_percent: number;
  tax_type: string;
  last_reviewed: string;
  source?: {
    name: string;
    url: string;
  };
}

// Extract the items array from the JSON wrapper
const taxData: TaxRateData[] = (taxDataJson as any).items || [];

/**
 * Get tax rate for a specific country
 * @param countryName - Name of the country (e.g., "South Africa", "United States")
 * @returns Tax rate as a percentage (e.g., 15 for 15%), or 0 if not found
 */
export function getTaxRateByCountry(countryName: string): number {
  const normalizedCountry = countryName.trim().toLowerCase();
  
  const countryData = taxData.find(
    item => item.country.toLowerCase() === normalizedCountry
  );
  
  return countryData?.standard_rate_percent || 0;
}

/**
 * Get full tax data for a specific country
 */
export function getTaxDataByCountry(countryName: string): TaxRateData | null {
  const normalizedCountry = countryName.trim().toLowerCase();
  
  const countryData = taxData.find(
    item => item.country.toLowerCase() === normalizedCountry
  );
  
  return countryData || null;
}

/**
 * Get all countries with their tax rates
 * Useful for dropdowns or autocomplete
 */
export function getAllCountriesWithTax(): TaxRateData[] {
  return taxData;
}

/**
 * Search countries by partial name
 */
export function searchCountries(searchTerm: string): TaxRateData[] {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  
  return taxData.filter(
    item => item.country.toLowerCase().includes(normalizedSearch)
  );
}

/**
 * Get countries sorted alphabetically
 */
export function getCountriesSorted(): TaxRateData[] {
  return [...taxData].sort((a, b) => 
    a.country.localeCompare(b.country)
  );
}
