import { NextResponse } from 'next/server';
import { getAISettings } from '@/lib/ai-settings';

export async function GET() {
  const settings = getAISettings();
  const available = settings.providers.some(p => p.enabled && !!p.apiKey);
  const providers = settings.providers.map(p => ({
    provider: p.provider,
    label: p.label,
    enabled: p.enabled && !!p.apiKey,
    model: p.model,
  }));

  return NextResponse.json({ available, providers });
}
