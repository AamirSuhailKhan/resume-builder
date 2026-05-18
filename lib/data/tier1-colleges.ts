export const TIER1_COLLEGES = [
  'IIT', 'NIT', 'BITS', 'IIM', 'IIIT', 'ISI', 'CMI', 'XLRI', 'FMS', 'MDI',
  'IIFT', 'IITM', 'IITB', 'IITD', 'IITK', 'IITKGP', 'IITH', 'IITG', 'IITI',
  'IITBHU', 'IITJ', 'IITM', 'NITS', 'NITK', 'NITP', 'NITW', 'NITC', 'NITDGP',
  'BITS Pilani', 'BITS Goa', 'BITS Hyderabad', 'SP Jain', 'JBIMS',
  'College of Engineering Pune', 'VJTI', 'DCE', 'Jadavpur'
];

export function detectCollegeTier(institutionName: string): 'tier1' | 'tier2' | 'tier3' {
  if (!institutionName) return 'tier3';
  const name = institutionName.toUpperCase().trim();
  if (TIER1_COLLEGES.some(t => name.includes(t.toUpperCase()))) return 'tier1';
  
  const tier2Signals = ['VIT', 'SRM', 'MANIPAL', 'AMITY', 'UPES', 'MIT', 'KIIT', 'THAPAR'];
  if (tier2Signals.some(t => name.includes(t))) return 'tier2';
  
  return 'tier3';
}
