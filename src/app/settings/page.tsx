'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, MapPin, Building2, Ruler, Layers, Calendar, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePreferences } from '@/hooks/usePreferences';

// 억원 변환 헬퍼
const 억 = 100_000_000;
const toEok = (won: number) => won / 억;
const toWon = (eok: number) => eok * 억;

// 평 → ㎡ 변환
const pyeongToSqm = (p: number) => Math.round(p * 3.3058);
const sqmToPyeong = (sqm: number) => Math.round(sqm / 3.3058);

const currentYear = new Date().getFullYear();

// 예산 프리셋 (억 단위)
const BUDGET_PRESETS = [
  { label: '5억 이하', min: 0, max: 5 },
  { label: '5~10억', min: 5, max: 10 },
  { label: '10~15억', min: 10, max: 15 },
  { label: '15~20억', min: 15, max: 20 },
  { label: '20~30억', min: 20, max: 30 },
  { label: '30억 이상', min: 30, max: 0 },
];

// 평수 프리셋
const AREA_PRESETS = [
  { label: '20평 미만', minP: 0, maxP: 19, desc: '~63㎡' },
  { label: '20평대', minP: 20, maxP: 29, desc: '66~96㎡' },
  { label: '30평대', minP: 30, maxP: 39, desc: '99~129㎡' },
  { label: '40평 이상', minP: 40, maxP: 0, desc: '132㎡~' },
];

// 층수 프리셋
const FLOOR_PRESETS = [
  { label: '저층', desc: '1~5층', min: 1, max: 5 },
  { label: '중층', desc: '6~15층', min: 6, max: 15 },
  { label: '고층', desc: '16층 이상', min: 16, max: null },
  { label: '상관없어요', desc: '', min: null, max: null },
];

// 연식 프리셋
const BUILT_YEAR_PRESETS = [
  { label: '5년 이내', value: currentYear - 5, desc: `${currentYear - 5}년~` },
  { label: '10년 이내', value: currentYear - 10, desc: `${currentYear - 10}년~` },
  { label: '15년 이내', value: currentYear - 15, desc: `${currentYear - 15}년~` },
  { label: '20년 이내', value: currentYear - 20, desc: `${currentYear - 20}년~` },
  { label: '상관없어요', value: null, desc: '' },
];

// 인기 지역
const POPULAR_REGIONS = [
  '서울특별시 강남구', '서울특별시 서초구', '서울특별시 송파구',
  '서울특별시 마포구', '서울특별시 용산구', '서울특별시 성동구',
  '서울특별시 영등포구', '서울특별시 강동구',
  '경기도 성남시 분당구', '경기도 수원시 영통구',
];

// 지역 짧은 이름
function shortRegion(region: string) {
  return region.replace('서울특별시 ', '서울 ').replace('경기도 ', '경기 ');
}

// 칩 버튼 컴포넌트
function Chip({ selected, onClick, children, description }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
      }`}
    >
      {selected && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
          <Check className="h-3 w-3 text-white" />
        </span>
      )}
      <span>{children}</span>
      {description && (
        <span className={`block text-xs mt-0.5 ${selected ? 'text-primary-500' : 'text-neutral-400'}`}>
          {description}
        </span>
      )}
    </button>
  );
}

// 섹션 컴포넌트
function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
            <Icon className="h-4 w-4 text-primary-600" />
          </div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        </div>
        <p className="text-sm text-neutral-500 ml-10">{description}</p>
      </div>
      <div className="ml-10">
        {children}
      </div>
    </div>
  );
}

// 프리셋 Set에서 병합된 범위를 계산하는 헬퍼
function mergeBudgetPresets(indices: Set<number>): { min: number | null; max: number | null } {
  if (indices.size === 0) return { min: null, max: null };
  let minVal = Infinity;
  let maxVal = -Infinity;
  let hasUnlimited = false;
  indices.forEach(i => {
    const p = BUDGET_PRESETS[i];
    if (p.min < minVal) minVal = p.min;
    if (p.max === 0) hasUnlimited = true;
    else if (p.max > maxVal) maxVal = p.max;
  });
  return {
    min: minVal === 0 ? null : minVal,
    max: hasUnlimited ? null : (maxVal === -Infinity ? null : maxVal),
  };
}

function mergeAreaPresets(indices: Set<number>): { minP: number | null; maxP: number | null } {
  if (indices.size === 0) return { minP: null, maxP: null };
  let minVal = Infinity;
  let maxVal = -Infinity;
  let hasUnlimited = false;
  indices.forEach(i => {
    const p = AREA_PRESETS[i];
    if (p.minP < minVal) minVal = p.minP;
    if (p.maxP === 0) hasUnlimited = true;
    else if (p.maxP > maxVal) maxVal = p.maxP;
  });
  return {
    minP: minVal === 0 ? null : minVal,
    maxP: hasUnlimited ? null : (maxVal === -Infinity ? null : maxVal),
  };
}

function mergeFloorPresets(indices: Set<number>): { min: number | null; max: number | null } {
  if (indices.size === 0) return { min: null, max: null };
  let minVal = Infinity;
  let maxVal = -Infinity;
  let hasUnlimited = false;
  indices.forEach(i => {
    const p = FLOOR_PRESETS[i];
    if (p.min === null) return; // "상관없어요" 건너뜀
    if (p.min < minVal) minVal = p.min;
    if (p.max === null) hasUnlimited = true;
    else if (p.max > maxVal) maxVal = p.max;
  });
  if (minVal === Infinity) return { min: null, max: null };
  return {
    min: minVal,
    max: hasUnlimited ? null : (maxVal === -Infinity ? null : maxVal),
  };
}

function mergeBuiltYearPresets(indices: Set<number>): number | null {
  if (indices.size === 0) return null;
  let minYear = Infinity;
  indices.forEach(i => {
    const p = BUILT_YEAR_PRESETS[i];
    if (p.value === null) return;
    if (p.value < minYear) minYear = p.value;
  });
  return minYear === Infinity ? null : minYear;
}

// 저장된 값으로부터 프리셋 Set 역추적
function restoreBudgetPresets(budgetMinEok: number | null, budgetMaxEok: number | null): Set<number> {
  const set = new Set<number>();
  const sMin = budgetMinEok ?? 0;
  const sMax = budgetMaxEok;

  BUDGET_PRESETS.forEach((p, i) => {
    const pMin = p.min;
    const pMax = p.max === 0 ? null : p.max; // 0 = unlimited
    if (pMin >= sMin && (sMax === null || (pMax !== null && pMax <= sMax))) {
      set.add(i);
    }
  });

  // 검증: 병합 결과가 원래 값과 일치하는지
  const merged = mergeBudgetPresets(set);
  const mergedMin = merged.min ?? 0;
  const mergedMax = merged.max;
  if (mergedMin !== sMin || mergedMax !== sMax) {
    return new Set(); // 일치하지 않으면 빈 Set (직접 입력 모드)
  }
  return set;
}

function restoreAreaPresets(areaMinP: number | null, areaMaxP: number | null): Set<number> {
  const set = new Set<number>();
  const sMinP = areaMinP ?? 0;
  const sMaxP = areaMaxP;

  AREA_PRESETS.forEach((p, i) => {
    const pMinP = p.minP;
    const pMaxP = p.maxP === 0 ? null : p.maxP;
    if (pMinP >= sMinP && (sMaxP === null || (pMaxP !== null && pMaxP <= sMaxP))) {
      set.add(i);
    }
  });

  const merged = mergeAreaPresets(set);
  const mergedMinP = merged.minP ?? 0;
  const mergedMaxP = merged.maxP;
  if (mergedMinP !== sMinP || mergedMaxP !== sMaxP) {
    return new Set();
  }
  return set;
}

function restoreFloorPresets(floorMin: number | null, floorMax: number | null): Set<number> {
  if (floorMin === null && floorMax === null) return new Set();
  const set = new Set<number>();

  FLOOR_PRESETS.forEach((p, i) => {
    if (p.min === null) return; // "상관없어요" 건너뜀
    if (p.min >= (floorMin ?? 1)) {
      if (floorMax === null || (p.max !== null && p.max <= floorMax) || p.max === null) {
        set.add(i);
      }
    }
  });

  const merged = mergeFloorPresets(set);
  if (merged.min !== floorMin || merged.max !== floorMax) {
    return new Set();
  }
  return set;
}

function restoreBuiltYearPresets(minBuiltYear: number | null): Set<number> {
  if (minBuiltYear === null) return new Set();
  const set = new Set<number>();
  BUILT_YEAR_PRESETS.forEach((p, i) => {
    if (p.value === minBuiltYear) {
      set.add(i);
    }
  });
  return set;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: preferences, isLoading, upsert, isUpserting } = usePreferences();

  // 예산 (억 단위)
  const [budgetMin, setBudgetMin] = useState<number | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [budgetCustom, setBudgetCustom] = useState(false);
  const [selectedBudgetPresets, setSelectedBudgetPresets] = useState<Set<number>>(new Set());

  // 면적 (평 단위)
  const [areaMinP, setAreaMinP] = useState<number | null>(null);
  const [areaMaxP, setAreaMaxP] = useState<number | null>(null);
  const [areaCustom, setAreaCustom] = useState(false);
  const [selectedAreaPresets, setSelectedAreaPresets] = useState<Set<number>>(new Set());

  // 층수
  const [floorMin, setFloorMin] = useState<number | null>(null);
  const [floorMax, setFloorMax] = useState<number | null>(null);
  const [selectedFloorPresets, setSelectedFloorPresets] = useState<Set<number>>(new Set());

  // 건축년도
  const [minBuiltYear, setMinBuiltYear] = useState<number | null>(null);
  const [selectedBuiltYearPresets, setSelectedBuiltYearPresets] = useState<Set<number>>(new Set());

  // 지역
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState('');

  const [showToast, setShowToast] = useState(false);

  // 기존 조건 로드
  useEffect(() => {
    if (preferences) {
      const bMinEok = preferences.budget_min ? toEok(preferences.budget_min) : null;
      const bMaxEok = preferences.budget_max ? toEok(preferences.budget_max) : null;
      if (bMinEok != null) setBudgetMin(bMinEok);
      if (bMaxEok != null) setBudgetMax(bMaxEok);

      const aMinP = preferences.area_min ? sqmToPyeong(preferences.area_min) : null;
      const aMaxP = preferences.area_max ? sqmToPyeong(preferences.area_max) : null;
      if (aMinP != null) setAreaMinP(aMinP);
      if (aMaxP != null) setAreaMaxP(aMaxP);

      if (preferences.min_floor != null) setFloorMin(preferences.min_floor);
      if (preferences.max_floor != null) setFloorMax(preferences.max_floor);
      if (preferences.min_built_year) setMinBuiltYear(preferences.min_built_year);
      setPreferredRegions(preferences.preferred_regions || []);

      // 프리셋 역추적
      const restoredBudget = restoreBudgetPresets(bMinEok, bMaxEok);
      if (restoredBudget.size > 0) {
        setSelectedBudgetPresets(restoredBudget);
      } else if (bMinEok || bMaxEok) {
        setBudgetCustom(true);
      }

      const restoredArea = restoreAreaPresets(aMinP, aMaxP);
      if (restoredArea.size > 0) {
        setSelectedAreaPresets(restoredArea);
      } else if (aMinP || aMaxP) {
        setAreaCustom(true);
      }

      const restoredFloor = restoreFloorPresets(preferences.min_floor ?? null, preferences.max_floor ?? null);
      setSelectedFloorPresets(restoredFloor);

      const restoredBuiltYear = restoreBuiltYearPresets(preferences.min_built_year ?? null);
      setSelectedBuiltYearPresets(restoredBuiltYear);
    }
  }, [preferences]);

  // 예산 프리셋 다중 선택
  const handleBudgetPreset = (index: number) => {
    setSelectedBudgetPresets(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const merged = mergeBudgetPresets(next);
      setBudgetMin(merged.min);
      setBudgetMax(merged.max);
      setBudgetCustom(false);
      return next;
    });
  };

  const isBudgetPresetSelected = (index: number) => selectedBudgetPresets.has(index);

  // 면적 프리셋 다중 선택
  const handleAreaPreset = (index: number) => {
    setSelectedAreaPresets(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const merged = mergeAreaPresets(next);
      setAreaMinP(merged.minP);
      setAreaMaxP(merged.maxP);
      setAreaCustom(false);
      return next;
    });
  };

  const isAreaPresetSelected = (index: number) => selectedAreaPresets.has(index);

  // 층수 프리셋 다중 선택
  const handleFloorPreset = (index: number) => {
    const preset = FLOOR_PRESETS[index];

    // "상관없어요" 선택 시 전체 해제
    if (preset.min === null && preset.max === null) {
      setSelectedFloorPresets(new Set());
      setFloorMin(null);
      setFloorMax(null);
      return;
    }

    setSelectedFloorPresets(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const merged = mergeFloorPresets(next);
      setFloorMin(merged.min);
      setFloorMax(merged.max);
      return next;
    });
  };

  const isFloorPresetSelected = (index: number) => {
    const preset = FLOOR_PRESETS[index];
    if (preset.min === null && preset.max === null) {
      return selectedFloorPresets.size === 0 && floorMin === null && floorMax === null;
    }
    return selectedFloorPresets.has(index);
  };

  // 건축년도 프리셋 다중 선택
  const handleBuiltYearPreset = (index: number) => {
    const preset = BUILT_YEAR_PRESETS[index];

    // "상관없어요" 선택 시 전체 해제
    if (preset.value === null) {
      setSelectedBuiltYearPresets(new Set());
      setMinBuiltYear(null);
      return;
    }

    setSelectedBuiltYearPresets(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const merged = mergeBuiltYearPresets(next);
      setMinBuiltYear(merged);
      return next;
    });
  };

  const isBuiltYearPresetSelected = (index: number) => {
    const preset = BUILT_YEAR_PRESETS[index];
    if (preset.value === null) {
      return selectedBuiltYearPresets.size === 0 && minBuiltYear === null;
    }
    return selectedBuiltYearPresets.has(index);
  };

  // 지역 추가
  const handleAddRegion = (region: string) => {
    const trimmed = region.trim();
    if (trimmed && !preferredRegions.includes(trimmed)) {
      setPreferredRegions(prev => [...prev, trimmed]);
    }
    setRegionInput('');
  };

  const handleRemoveRegion = (region: string) => {
    setPreferredRegions(prev => prev.filter(r => r !== region));
  };

  // 저장
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    upsert(
      {
        deal_type: 'sale',
        property_types: ['apt'],
        budget_min: budgetMin ? toWon(budgetMin) : null,
        budget_max: budgetMax ? toWon(budgetMax) : null,
        area_min: areaMinP ? pyeongToSqm(areaMinP) : null,
        area_max: areaMaxP ? pyeongToSqm(areaMaxP) : null,
        min_floor: floorMin,
        max_floor: floorMax,
        min_built_year: minBuiltYear,
        preferred_regions: preferredRegions.length > 0 ? preferredRegions : null,
        min_rooms: null,
        min_bathrooms: null,
      },
      {
        onSuccess: () => {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          router.push('/search?fromPreferences=true');
        },
      }
    );
  };

  // 초기화
  const handleReset = () => {
    setBudgetMin(null);
    setBudgetMax(null);
    setBudgetCustom(false);
    setSelectedBudgetPresets(new Set());
    setAreaMinP(null);
    setAreaMaxP(null);
    setAreaCustom(false);
    setSelectedAreaPresets(new Set());
    setFloorMin(null);
    setFloorMax(null);
    setSelectedFloorPresets(new Set());
    setMinBuiltYear(null);
    setSelectedBuiltYearPresets(new Set());
    setPreferredRegions([]);
    setRegionInput('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-500">조건을 불러오고 있어요...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-2xl p-5 md:p-8">
        {/* 뒤로가기 */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">어떤 집을 찾고 있나요?</h1>
          <p className="mt-1.5 text-neutral-500">
            조건을 알려주시면, 딱 맞는 매물만 추천해 드릴게요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 예산 */}
          <Section
            icon={Building2}
            title="예산"
            description="어느 정도 금액을 생각하고 계세요? (여러 개 선택 가능)"
          >
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((preset, index) => (
                <Chip
                  key={preset.label}
                  selected={isBudgetPresetSelected(index)}
                  onClick={() => handleBudgetPreset(index)}
                >
                  {preset.label}
                </Chip>
              ))}
              <Chip
                selected={budgetCustom}
                onClick={() => {
                  setBudgetCustom(!budgetCustom);
                  if (!budgetCustom) {
                    setSelectedBudgetPresets(new Set());
                    setBudgetMin(null);
                    setBudgetMax(null);
                  }
                }}
              >
                직접 입력
              </Chip>
            </div>

            {budgetCustom && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    placeholder="최소"
                    value={budgetMin ?? ''}
                    onChange={(e) => setBudgetMin(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-500 whitespace-nowrap">억</span>
                </div>
                <span className="text-neutral-300">~</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    placeholder="최대"
                    value={budgetMax ?? ''}
                    onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-500 whitespace-nowrap">억</span>
                </div>
              </div>
            )}

            {(budgetMin != null || budgetMax != null) && !budgetCustom && (
              <p className="mt-2 text-xs text-neutral-400">
                {budgetMin ? `${budgetMin}억` : '0'}원 ~ {budgetMax ? `${budgetMax}억` : '제한 없음'}원
              </p>
            )}
          </Section>

          {/* 전용면적 */}
          <Section
            icon={Ruler}
            title="전용면적"
            description="원하는 평수를 골라주세요 (여러 개 선택 가능)"
          >
            <div className="flex flex-wrap gap-2">
              {AREA_PRESETS.map((preset, index) => (
                <Chip
                  key={preset.label}
                  selected={isAreaPresetSelected(index)}
                  onClick={() => handleAreaPreset(index)}
                  description={preset.desc}
                >
                  {preset.label}
                </Chip>
              ))}
              <Chip
                selected={areaCustom}
                onClick={() => {
                  setAreaCustom(!areaCustom);
                  if (!areaCustom) {
                    setSelectedAreaPresets(new Set());
                    setAreaMinP(null);
                    setAreaMaxP(null);
                  }
                }}
              >
                직접 입력
              </Chip>
            </div>

            {areaCustom && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    placeholder="최소"
                    value={areaMinP ?? ''}
                    onChange={(e) => setAreaMinP(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-500 whitespace-nowrap">평</span>
                </div>
                <span className="text-neutral-300">~</span>
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number"
                    placeholder="최대"
                    value={areaMaxP ?? ''}
                    onChange={(e) => setAreaMaxP(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-500 whitespace-nowrap">평</span>
                </div>
              </div>
            )}

            {(areaMinP != null || areaMaxP != null) && (
              <p className="mt-2 text-xs text-neutral-400">
                전용면적 {areaMinP ? `${pyeongToSqm(areaMinP)}` : '0'}㎡ ~ {areaMaxP ? `${pyeongToSqm(areaMaxP)}` : '제한 없음'}㎡
              </p>
            )}
          </Section>

          {/* 층수 */}
          <Section
            icon={Layers}
            title="층수"
            description="선호하는 층수가 있으세요? (여러 개 선택 가능)"
          >
            <div className="flex flex-wrap gap-2">
              {FLOOR_PRESETS.map((preset, index) => (
                <Chip
                  key={preset.label}
                  selected={isFloorPresetSelected(index)}
                  onClick={() => handleFloorPreset(index)}
                  description={preset.desc}
                >
                  {preset.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* 건축년도 */}
          <Section
            icon={Calendar}
            title="건물 연식"
            description="연식이 오래된 건물도 괜찮으세요? (여러 개 선택 가능)"
          >
            <div className="flex flex-wrap gap-2">
              {BUILT_YEAR_PRESETS.map((preset, index) => (
                <Chip
                  key={preset.label}
                  selected={isBuiltYearPresetSelected(index)}
                  onClick={() => handleBuiltYearPreset(index)}
                  description={preset.desc}
                >
                  {preset.label}
                </Chip>
              ))}
            </div>
          </Section>

          {/* 지역 */}
          <Section
            icon={MapPin}
            title="관심 지역"
            description="어디에서 찾아볼까요?"
          >
            {/* 선택된 지역 태그 */}
            {preferredRegions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {preferredRegions.map((region) => (
                  <span
                    key={region}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 pl-3 pr-2 py-1.5 text-sm font-medium text-primary-700"
                  >
                    {shortRegion(region)}
                    <button
                      type="button"
                      onClick={() => handleRemoveRegion(region)}
                      className="rounded-full p-0.5 hover:bg-primary-200 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 인기 지역 칩 */}
            <p className="text-xs font-medium text-neutral-400 mb-2">인기 지역</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {POPULAR_REGIONS.map((region) => {
                const isSelected = preferredRegions.includes(region);
                return (
                  <button
                    key={region}
                    type="button"
                    onClick={() => isSelected ? handleRemoveRegion(region) : handleAddRegion(region)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {shortRegion(region)}
                  </button>
                );
              })}
            </div>

            {/* 직접 입력 */}
            <div className="flex gap-2">
              <input
                placeholder="다른 지역을 입력하세요 (예: 서울특별시 강서구)"
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRegion(regionInput);
                  }
                }}
                className="flex-1 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleAddRegion(regionInput)}
                disabled={!regionInput.trim()}
              >
                추가
              </Button>
            </div>
          </Section>

          {/* 저장 버튼 */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isUpserting} className="flex-1 py-3 text-base">
              {isUpserting ? '저장하는 중...' : '이 조건으로 매물 찾기'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="px-6">
              초기화
            </Button>
          </div>
        </form>

        {/* 토스트 */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm text-white shadow-xl">
            <Check className="h-4 w-4 text-green-400" />
            조건이 저장됐어요
          </div>
        )}
      </div>
    </div>
  );
}
