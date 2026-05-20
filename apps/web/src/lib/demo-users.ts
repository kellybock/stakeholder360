import { hashPassword } from './auth';

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  agency: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

let _users: DemoUser[] | null = null;

export async function getDemoUsers(): Promise<DemoUser[]> {
  if (_users) return _users;

  const passwordHash = await hashPassword('demo1234');
  const now = new Date().toISOString();

  _users = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@youth360.gov.sg',
      passwordHash,
      fullName: 'Admin User',
      agency: 'National Youth Council (NYC)',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'rm.mccy@youth360.gov.sg',
      passwordHash,
      fullName: 'Sarah Tan',
      agency: 'Ministry of Culture, Community and Youth (MCCY)',
      role: 'rm',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'rm.nyc@youth360.gov.sg',
      passwordHash,
      fullName: 'Ahmad Ibrahim',
      agency: 'National Youth Council (NYC)',
      role: 'rm',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      email: 'rm.pa@youth360.gov.sg',
      passwordHash,
      fullName: 'Priya Nair',
      agency: "People's Association (PA)",
      role: 'rm',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      email: 'rm.moe@youth360.gov.sg',
      passwordHash,
      fullName: 'David Lim',
      agency: 'Ministry of Education (MOE)',
      role: 'rm',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      email: 'rm.msf@youth360.gov.sg',
      passwordHash,
      fullName: 'Rachel Wong',
      agency: 'Ministry of Social and Family Development (MSF)',
      role: 'rm',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
  ];

  return _users;
}

export async function addUser(
  data: { email: string; fullName: string; agency: string; role: string; password: string },
): Promise<DemoUser> {
  const users = await getDemoUsers();
  if (users.find(u => u.email === data.email)) {
    throw new Error('Email already exists');
  }
  const now = new Date().toISOString();
  const user: DemoUser = {
    id: crypto.randomUUID(),
    email: data.email,
    passwordHash: await hashPassword(data.password),
    fullName: data.fullName,
    agency: data.agency,
    role: data.role,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<{ email: string; fullName: string; agency: string; role: string; status: 'active' | 'suspended'; password: string }>,
): Promise<DemoUser | null> {
  const users = await getDemoUsers();
  const user = users.find(u => u.id === id);
  if (!user) return null;

  if (data.email && data.email !== user.email) {
    if (users.find(u => u.email === data.email && u.id !== id)) {
      throw new Error('Email already exists');
    }
    user.email = data.email;
  }
  if (data.fullName !== undefined) user.fullName = data.fullName;
  if (data.agency !== undefined) user.agency = data.agency;
  if (data.role !== undefined) user.role = data.role;
  if (data.status !== undefined) user.status = data.status;
  if (data.password) user.passwordHash = await hashPassword(data.password);
  user.updatedAt = new Date().toISOString();
  return user;
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = await getDemoUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}
