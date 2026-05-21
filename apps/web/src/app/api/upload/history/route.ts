import { NextResponse } from 'next/server';
import { getHydratedStore } from '@/lib/store';

export async function GET() {
  const dataStore = await getHydratedStore();
  return NextResponse.json({ history: dataStore.uploadHistory });
}
