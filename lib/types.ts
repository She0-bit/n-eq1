export type Profile = {
  id: string
  name: string
  username: string | null
  institution: string
  specialty: string
  points: number
  age: number | null
  sex: string
  country: string
  role: string
  created_at: string
}

export type SampleCriteria = {
  roles: string[]
  sex: string
  min_age: number | null
  max_age: number | null
  countries: string[]
  other: string
}

export type Form = {
  id: string
  user_id: string
  title: string
  description: string
  link: string
  institution: string
  specialty: string
  estimated_minutes: number
  fill_count: number
  is_active: boolean
  sample_criteria: SampleCriteria
  created_at: string
}
export const COUNTRIES = [
  'Saudi Arabia','Egypt','UAE','Kuwait','Bahrain','Oman','Qatar','Jordan','Lebanon',
  'Iraq','Syria','Libya','Tunisia','Algeria','Morocco','Sudan','Yemen','Palestine',
  'United States','United Kingdom','Canada','Australia','Germany','France',
  'Turkey','Pakistan','India','Malaysia'
];

export type FormFeedItem = {
  id: string
  title: string
  description: string
  link: string
  institution: string
  specialty: string
  estimated_minutes: number
  fill_count: number
  created_at: string
  user_id: string
  sample_criteria: SampleCriteria | null
  submitter_name: string
  submitter_username: string | null
  submitter_institution: string
  submitter_points: number
}

export type Fill = {
  id: string
  user_id: string
  form_id: string
  filled_at: string
}

export const SPECIALTY_GROUPS: Record<string, string[]> = {
  'Medicine & Health': [
    'General Medicine', 'Surgery', 'Internal Medicine', 'Pediatrics',
    'Obstetrics & Gynecology', 'Psychiatry', 'Emergency Medicine',
    'Family Medicine', 'Radiology', 'Pathology', 'Pharmacology',
    'Anatomy', 'Physiology', 'Biochemistry', 'Microbiology',
    'Public Health', 'Dentistry', 'Nursing', 'Pharmacy',
  ],
  'Science': [
    'Biology', 'Chemistry', 'Physics', 'Environmental Science',
  ],
  'Technology': [
    'Computer Science', 'Software Engineering', 'Information Technology', 'Data Science',
  ],
  'Engineering': [
    'Civil Engineering', 'Mechanical Engineering', 'Electrical Engineering', 'Chemical Engineering',
  ],
  'Social Sciences': [
    'Psychology', 'Sociology', 'Political Science', 'Economics', 'Anthropology',
  ],
  'Humanities': [
    'History', 'Philosophy', 'Literature', 'Linguistics', 'Arts',
  ],
  'Business': [
    'Business Administration', 'Marketing', 'Finance', 'Accounting', 'Management',
  ],
  'Education & Law': [
    'Education', 'Special Education', 'Law', 'Criminology',
  ],
  'Other': ['Other'],
}

export const SPECIALTIES = Object.values(SPECIALTY_GROUPS).flat()

export const ROLE_GROUPS: Record<string, { value: string; label: string }[]> = {
  'Students': [
    { value: 'high_school',        label: 'High School Student' },
    { value: 'undergrad',          label: 'Undergraduate Student' },
    { value: 'grad_student',       label: 'Graduate Student (MSc/MBA)' },
    { value: 'phd_student',        label: 'PhD Student / Doctoral Researcher' },
  ],
  'Academia & Research': [
    { value: 'professor',          label: 'Professor / Lecturer' },
    { value: 'postdoc',            label: 'Postdoctoral Researcher' },
    { value: 'researcher',         label: 'Research Assistant / Associate' },
  ],
  'Healthcare': [
    { value: 'medical_student',    label: 'Medical Student' },
    { value: 'intern',             label: 'Intern / House Officer' },
    { value: 'resident',           label: 'Resident / Registrar' },
    { value: 'doctor',             label: 'Doctor / Physician' },
    { value: 'nurse',              label: 'Nurse' },
    { value: 'pharmacist',         label: 'Pharmacist' },
    { value: 'dentist',            label: 'Dentist' },
    { value: 'allied_health',      label: 'Allied Health Professional' },
    { value: 'patient',            label: 'Patient / Care Recipient' },
  ],
  'Technology & Engineering': [
    { value: 'software_dev',       label: 'Software Developer / Engineer' },
    { value: 'data_scientist',     label: 'Data Scientist / Analyst' },
    { value: 'ux_designer',        label: 'UX / Product Designer' },
    { value: 'product_manager',    label: 'Product Manager' },
    { value: 'it_professional',    label: 'IT / Systems Professional' },
    { value: 'engineer',           label: 'Engineer (Civil / Mechanical / Electrical)' },
  ],
  'Business & Finance': [
    { value: 'business_prof',      label: 'Business Professional' },
    { value: 'entrepreneur',       label: 'Entrepreneur / Founder' },
    { value: 'finance_prof',       label: 'Finance / Accounting Professional' },
    { value: 'marketer',           label: 'Marketing / Sales Professional' },
  ],
  'Education & Social': [
    { value: 'teacher',            label: 'Teacher / Educator' },
    { value: 'social_worker',      label: 'Social Worker / Counsellor' },
    { value: 'lawyer',             label: 'Lawyer / Legal Professional' },
    { value: 'journalist',         label: 'Journalist / Media Professional' },
  ],
  'General': [
    { value: 'employee',           label: 'Employee (any sector)' },
    { value: 'freelancer',         label: 'Freelancer / Self-employed' },
    { value: 'parent',             label: 'Parent / Caregiver' },
    { value: 'general_public',     label: 'General Public' },
    { value: 'other',              label: 'Other' },
  ],
}

export const ROLES = Object.values(ROLE_GROUPS).flat()

export function roleLabel(value: string) {
  return ROLES.find(r => r.value === value)?.label ?? value
}

export function matchesCriteria(criteria: SampleCriteria | null | undefined, profile: Partial<Profile>): boolean {
  if (!criteria) return true

  if (criteria.roles?.length > 0 && profile.role) {
    if (!criteria.roles.includes(profile.role)) return false
  }

  if (criteria.sex && criteria.sex !== 'any' && profile.sex && profile.sex !== '') {
    if (criteria.sex !== profile.sex) return false
  }

  if (profile.age) {
    if (criteria.min_age != null && profile.age < criteria.min_age) return false
    if (criteria.max_age != null && profile.age > criteria.max_age) return false
  }

  if (criteria.countries?.length > 0 && profile.country) {
    const userCountry = profile.country.toLowerCase()
    if (!criteria.countries.some(c => c.toLowerCase() === userCountry)) return false
  }

  return true
}
