import { NextResponse } from 'next/server';
import { dataStore } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableTarget, rows, fileName } = body as {
      tableTarget: string;
      rows: Record<string, string>[];
      fileName: string;
    };

    if (!tableTarget || !rows || !Array.isArray(rows) || !fileName) {
      return NextResponse.json({ error: 'tableTarget, rows, and fileName are required' }, { status: 400 });
    }

    const result = dataStore.processUpload(tableTarget, rows, fileName);

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed' }, { status: 500 });
  }
}
