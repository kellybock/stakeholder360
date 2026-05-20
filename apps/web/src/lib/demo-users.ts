import { hashPassword } from './auth';

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  agency: string;
  role: string;
}

let _users: DemoUser[] | null = null;

export async function getDemoUsers(): Promise<DemoUser[]> {
  if (_users) return _users;

  const passwordHash = await hashPassword('demo1234');

  _users = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@youth360.gov.sg',
      passwordHash,
      fullName: 'Admin User',
      agency: 'National Youth Council (NYC)',
      role: 'admin',
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'rm.mccy@youth360.gov.sg',
      passwordHash,
      fullName: 'Sarah Tan',
      agency: 'Ministry of Culture, Community and Youth (MCCY)',
      role: 'rm',
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'rm.nyc@youth360.gov.sg',
      passwordHash,
      fullName: 'Ahmad Ibrahim',
      agency: 'National Youth Council (NYC)',
      role: 'rm',
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'rm.pa@youth360.gov.sg',
      passwordHash,
      fullName: 'Priya Nair',
      agency: "People's Association (PA)",
      role: 'rm',
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'rm.moe@youth360.gov.sg',
      passwordHash,
      fullName: 'David Lim',
      agency: 'Ministry of Education (MOE)',
      role: 'rm',
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      email: 'rm.msf@youth360.gov.sg',
      passwordHash,
      fullName: 'Rachel Wong',
      agency: 'Ministry of Social and Family Development (MSF)',
      role: 'rm',
    },
  ];

  return _users;
}
