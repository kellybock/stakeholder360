import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function GET() {
  return NextResponse.json({ history: dataStore.uploadHistory });
}
