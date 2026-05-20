import { NextRequest, NextResponse } from 'next/server';
import { getEngagementScores, calculateAllScores } from '@/lib/engagement';

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get('refresh') === 'true';
  const segment = request.nextUrl.searchParams.get('segment') ?? '';
  const sortBy = request.nextUrl.searchParams.get('sort') ?? 'totalScore';
  const order = request.nextUrl.searchParams.get('order') ?? 'desc';

  const scores = refresh ? calculateAllScores() : getEngagementScores();

  let filtered = segment
    ? scores.filter(s => s.segment.toLowerCase() === segment.toLowerCase())
    : scores;

  const validSorts = ['totalScore', 'recencyScore', 'frequencyScore', 'depthScore', 'breadthScore', 'churnRisk'] as const;
  const sortField = validSorts.includes(sortBy as typeof validSorts[number])
    ? (sortBy as keyof typeof scores[0])
    : 'totalScore';

  filtered = [...filtered].sort((a, b) => {
    const av = a[sortField] as number;
    const bv = b[sortField] as number;
    return order === 'desc' ? bv - av : av - bv;
  });

  const segmentCounts: Record<string, number> = {};
  scores.forEach(s => { segmentCounts[s.segment] = (segmentCounts[s.segment] || 0) + 1; });

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length)
    : 0;

  const avgChurn = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s.churnRisk, 0) / scores.length)
    : 0;

  return NextResponse.json({
    scores: filtered,
    summary: {
      total: scores.length,
      averageScore: avgScore,
      averageChurnRisk: avgChurn,
      segments: segmentCounts,
      scoreDistribution: {
        high: scores.filter(s => s.totalScore >= 75).length,
        medium: scores.filter(s => s.totalScore >= 40 && s.totalScore < 75).length,
        low: scores.filter(s => s.totalScore < 40).length,
      },
    },
  });
}
