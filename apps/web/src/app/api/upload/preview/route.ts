import { NextResponse } from 'next/server';
import { CSV_SCHEMAS, type TableTarget } from '@youth360/shared';
import { dataStore, getHydratedStore } from '@/lib/store';

export async function POST(request: Request) {
  try {
    await getHydratedStore();
    const body = await request.json();
    const { tableTarget, rows } = body as { tableTarget: TableTarget; rows: Record<string, string>[] };

    if (!tableTarget || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'tableTarget and rows are required' }, { status: 400 });
    }

    const schema = CSV_SCHEMAS[tableTarget];
    if (!schema) {
      return NextResponse.json({ error: `Unknown table target: ${tableTarget}` }, { status: 400 });
    }

    const details: { row: number; field: string; level: 'error' | 'warning'; message: string }[] = [];
    let validRows = 0;
    const errorRowsSet = new Set<number>();
    const warnRowsSet = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
      const result = schema.safeParse(rows[i]);
      if (result.success) {
        validRows++;
      } else {
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          const level = issue.message.includes('required') ? 'error' as const : 'warning' as const;
          details.push({ row: i + 1, field, level, message: issue.message });
          if (level === 'error') errorRowsSet.add(i + 1);
          else warnRowsSet.add(i + 1);
        }
        if (!errorRowsSet.has(i + 1)) {
          validRows++;
        }
      }
    }

    // Check for NRIC-linked tables whether profiles exist
    if (tableTarget !== 'profiles') {
      const { hashNric } = await import('@youth360/shared');
      const usesIdField = tableTarget === 'areas_of_interest' || tableTarget === 'relationship_managers';
      for (let i = 0; i < rows.length; i++) {
        const identifier = usesIdField ? rows[i]['ID'] : rows[i]['Full NRIC'];
        if (identifier) {
          const hash = hashNric(String(identifier).toUpperCase());
          const profileExists = dataStore.profiles.some(p => p.nricHash === hash);
          if (!profileExists) {
            details.push({
              row: i + 1,
              field: usesIdField ? 'ID' : 'Full NRIC',
              level: 'warning',
              message: `ID not found in profiles. Upload profiles first for complete linkage.`,
            });
            warnRowsSet.add(i + 1);
          }
        }
      }
    }

    return NextResponse.json({
      totalRows: rows.length,
      validRows,
      warningRows: warnRowsSet.size,
      errorRows: errorRowsSet.size,
      details: details.slice(0, 100),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Validation failed' }, { status: 500 });
  }
}
