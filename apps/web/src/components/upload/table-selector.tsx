'use client';

const TABLE_OPTIONS = [
  { value: 'profiles', label: 'Profiles', description: 'Stakeholder personal details and KYC info' },
  { value: 'relationship_managers', label: 'Relationship Managers', description: 'RM names, emails, and agency assignments' },
  { value: 'areas_of_interest', label: 'Areas of Interest', description: 'Stakeholder interests with influence/interest levels' },
  { value: 'interactions', label: 'Interactions', description: 'Meeting logs and engagement notes' },
  { value: 'events', label: 'Events', description: 'Event participation and attendance records' },
  { value: 'awards', label: 'Awards', description: 'Awards and recognition received' },
  { value: 'community', label: 'Community', description: 'Community roles and organization involvement' },
  { value: 'overseas_representation', label: 'Overseas Representation', description: 'Overseas representation for Singapore' },
] as const;

interface TableSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TableSelector({ value, onChange, disabled }: TableSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium">Target Table</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      >
        {TABLE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} — {opt.description}
          </option>
        ))}
      </select>
    </div>
  );
}
