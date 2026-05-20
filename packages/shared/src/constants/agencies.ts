export const AGENCIES = [
  'Ministry of Culture, Community and Youth (MCCY)',
  'National Youth Council (NYC)',
  "People's Association (PA)",
  'Ministry of Education (MOE)',
  'Ministry of Social and Family Development (MSF)',
] as const;

export type Agency = (typeof AGENCIES)[number];

export const AGENCY_SHORT_NAMES: Record<string, string> = {
  'Ministry of Culture, Community and Youth (MCCY)': 'MCCY',
  'National Youth Council (NYC)': 'NYC',
  "People's Association (PA)": 'PA',
  'Ministry of Education (MOE)': 'MOE',
  'Ministry of Social and Family Development (MSF)': 'MSF',
};
