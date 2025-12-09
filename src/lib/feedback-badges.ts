const CATEGORY_BADGE_CLASS: Record<string, string> = {
  academics: 'bg-[#3498DB] text-white',      // vivid blue
  facilities: 'bg-[#2ECC71] text-white',     // emerald green
  infirmary: 'bg-[#E74C3C] text-white',      // bright red
  cafeteria: 'bg-[#F39C12] text-white',      // bright orange
  library: 'bg-[#9B59B6] text-white',        // bright purple
  dormitory: 'bg-[#1ABC9C] text-white',      // turquoise
  events: 'bg-[#E91E63] text-white',         // magenta pink
  transportation: 'bg-[#34495E] text-white', // dark blue-gray
  technology: 'bg-[#607D8B] text-white',     // blue-gray
  administration: 'bg-[#795548] text-white', // brown
  safety: 'bg-[#C0392B] text-white',         // strong red
  other: 'bg-[#95A5A6] text-white',          // cool gray
}

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: 'bg-[#1AAE5C] text-white',
  medium: 'bg-[#FFFF5C] text-black',
  high: 'bg-[#E78C3C] text-white',
  critical: 'bg-[#E74C3C] text-white',
}

// Hex color maps exported for charts and other non-Tailwind usages
export const CATEGORY_HEX: Record<string, string> = {
  academics: '#3498DB',
  facilities: '#2ECC71',
  infirmary: '#E74C3C',
  cafeteria: '#F39C12',
  library: '#9B59B6',
  dormitory: '#1ABC9C',
  events: '#E91E63',
  transportation: '#34495E',
  technology: '#607D8B',
  administration: '#795548',
  safety: '#C0392B',
  other: '#95A5A6',
  faculty: '#2ECC71',
}

export const PRIORITY_HEX: Record<string, string> = {
  low: '#1AAE5C',
  medium: '#FFFF5C',
  high: '#E78C3C',
  critical: '#E74C3C',
}

export function categoryBadgeClass(category: string) {
  return CATEGORY_BADGE_CLASS[category.toLowerCase()] ?? 'bg-slate-500 text-white'
}

export function priorityBadgeClass(priority: string) {
  return PRIORITY_BADGE_CLASS[priority.toLowerCase()] ?? 'bg-slate-400 text-white'
}