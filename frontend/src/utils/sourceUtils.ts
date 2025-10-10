// Utility functions for appointment source handling

export const getSourceDisplayName = (source?: string): string => {
  if (!source) return 'Internal';
  
  switch (source.toUpperCase()) {
    case 'WEBSITE':
      return 'Website';
    case 'GMB':
      return 'Google My Business';
    case 'INTERNAL':
      return 'Internal';
    case 'WALK_IN':
      return 'Walk-in';
    case 'REFERRAL':
      return 'Referral';
    case 'DIGITAL':
      return 'Digital';
    case 'AFFILIATE':
      return 'Affiliate';
    default:
      return source;
  }
};

export const getSourceIcon = (source?: string): string => {
  if (!source) return '🏥';
  
  switch (source.toUpperCase()) {
    case 'WEBSITE':
      return '🌐';
    case 'GMB':
      return '🔍';
    case 'INTERNAL':
      return '🏥';
    case 'WALK_IN':
      return '🚶';
    case 'REFERRAL':
      return '👥';
    case 'DIGITAL':
      return '📱';
    case 'AFFILIATE':
      return '🤝';
    default:
      return '📋';
  }
};

export const getSourceColor = (source?: string): string => {
  if (!source) return 'bg-gray-100 text-gray-800';
  
  switch (source.toUpperCase()) {
    case 'WEBSITE':
      return 'bg-blue-100 text-blue-800';
    case 'GMB':
      return 'bg-green-100 text-green-800';
    case 'INTERNAL':
      return 'bg-gray-100 text-gray-800';
    case 'WALK_IN':
      return 'bg-purple-100 text-purple-800';
    case 'REFERRAL':
      return 'bg-orange-100 text-orange-800';
    case 'DIGITAL':
      return 'bg-cyan-100 text-cyan-800';
    case 'AFFILIATE':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};
