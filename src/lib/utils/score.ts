export function getScoreColor(score: number) {
  if (score >= 90) return { bg: 'bg-green-100', text: 'text-green-800' };
  if (score >= 70) return { bg: 'bg-blue-100', text: 'text-blue-800' };
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-800' };
  if (score >= 30) return { bg: 'bg-red-100', text: 'text-red-800' };
  return { bg: 'bg-red-200', text: 'text-red-900' };
}

export function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C+';
  if (score >= 40) return 'C';
  return 'D';
}

export function getGradeLabel(score: number): string {
  if (score >= 90) return '매우 우수';
  if (score >= 80) return '우수';
  if (score >= 70) return '양호';
  if (score >= 60) return '보통';
  if (score >= 50) return '미흡';
  if (score >= 40) return '주의';
  return '위험';
}
