'use client';

import { useState, useEffect } from 'react';
import { X, Check, MapPin, Building2, Ruler, Layers, Calendar } from 'lucide-react';
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

export default function SettingsPage() {
  const { data: preferences, isLoading, upsert, isUpserting } = usePreferences();

  // 예산 (억 단위)
  const [budgetMin, setBudgetMin] = useState<number | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [budgetCustom, setBudgetCustom] = useState(false);

  // 면적 (평 단위)
  const [areaMinP, setAreaMinP] = useState<number | null>(null);
  const [areaMaxP, setAreaMaxP] = useState<number | null>(null);
  const [areaCustom, setAreaCustom] = useState(false);

  // 층수
  const [floorMin, setFloorMin] = useState<number | null>(null);
  const [floorMax, setFloorMax] = useState<number | null>(null);

  // 건축년도
  const [minBuiltYear, setMinBuiltYear] = useState<number | null>(null);

  // 지역
  const [preferredRegions, setPreferredRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState('');

  const [showToast, setShowToast] = useState(false);

  // 기존 조건 로드
  useEffect(() => {
    if (preferences) {
      if (preferences.budget_min) setBudgetMin(toEok(preferences.budget_min));
      if (preferences.budget_max) setBudgetMax(toEok(preferences.budget_max));
      if (preferences.area_min) setAreaMinP(sqmToPyeong(preferences.area_min));
      if (preferences.area_max) setAreaMaxP(sqmToPyeong(preferences.area_max));
      if (preferences.min_floor != null) setFloorMin(preferences.min_floor);
      if (preferences.max_floor != null) setFloorMax(preferences.max_floor);
      if (preferences.min_built_year) setMinBuiltYear(preferences.min_built_year);
      setPreferredRegions(preferences.preferred_regions || []);

      // 프리셋에 안 맞으면 직접 입력 모드
      const budgetMinEok = preferences.budget_min ? toEok(preferences.budget_min) : null;
      const budgetMaxEok = preferences.budget_max ? toEok(preferences.budget_max) : null;
      const matchesBudget = BUDGET_PRESETS.some(p =>
        (p.min === (budgetMinEok ?? 0)) && (p.max === (budgetMaxEok ?? 0))
      );
      if (!matchesBudget && (budgetMinEok || budgetMaxEok)) setBudgetCustom(true);

      const areaMinPyeong = preferences.area_min ? sqmToPyeong(preferences.area_min) : null;
      const areaMaxPyeong = preferences.area_max ? sqmToPyeong(preferences.area_max) : null;
      const matchesArea = AREA_PRESETS.some(p =>
        (p.minP === (areaMinPyeong ?? 0)) && (p.maxP === (areaMaxPyeong ?? 0))
      );
      if (!matchesArea && (areaMinPyeong || areaMaxPyeong)) setAreaCustom(true);
    }
  }, [preferences]);

  // 예산 프리셋 선택
  const handleBudgetPreset = (preset: typeof BUDGET_PRESETS[0]) => {
    const isSelected = budgetMin === preset.min && budgetMax === preset.max;
    if (isSelected) {
      setBudgetMin(null);
      setBudgetMax(null);
    } else {
      setBudgetMin(preset.min);
      setBudgetMax(preset.max);
      setBudgetCustom(false);
    }
  };

  const isBudgetPresetSelected = (preset: typeof BUDGET_PRESETS[0]) =>
    budgetMin === preset.min && budgetMax === preset.max;

  // 면적 프리셋 선택
  const handleAreaPreset = (preset: typeof AREA_PRESETS[0]) => {
    const isSelected = areaMinP === preset.minP && areaMaxP === preset.maxP;
    if (isSelected) {
      setAreaMinP(null);
      setAreaMaxP(null);
    } else {
      setAreaMinP(preset.minP);
      setAreaMaxP(preset.maxP);
      setAreaCustom(false);
    }
  };

  const isAreaPresetSelected = (preset: typeof AREA_PRESETS[0]) =>
    areaMinP === preset.minP && areaMaxP === preset.maxP;

  // 층수 프리셋 선택
  const handleFloorPreset = (preset: typeof FLOOR_PRESETS[0]) => {
    const isSelected = floorMin === preset.min && floorMax === preset.max;
    if (isSelected) {
      setFloorMin(null);
      setFloorMax(null);
    } else {
      setFloorMin(preset.min);
      setFloorMax(preset.max);
    }
  };

  const isFloorPresetSelected = (preset: typeof FLOOR_PRESETS[0]) =>
    floorMin === preset.min && floorMax === preset.max;

  // 건축년도 프리셋 선택
  const handleBuiltYearPreset = (preset: typeof BUILT_YEAR_PRESETS[0]) => {
    setMinBuiltYear(minBuiltYear === preset.value ? null : preset.value);
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
        },
      }
    );
  };

  // 초기화
  const handleReset = () => {
    setBudgetMin(null);
    setBudgetMax(null);
    setBudgetCustom(false);
    setAreaMinP(null);
    setAreaMaxP(null);
    setAreaCustom(false);
    setFloorMin(null);
    setFloorMax(null);
    setMinBuiltYear(null);
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
            description="어느 정도 금액을 생각하고 계세요?"
          >
            <div className="flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  selected={isBudgetPresetSelected(preset)}
                  onClick={() => handleBudgetPreset(preset)}
                >
                  {preset.label}
                </Chip>
              ))}
              <Chip
                selected={budgetCustom}
                onClick={() => {
                  setBudgetCustom(!budgetCustom);
                  if (!budgetCustom) {
                    // 프리셋 해제
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
            description="원하는 평수를 골라주세요"
          >
            <div className="flex flex-wrap gap-2">
              {AREA_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  selected={isAreaPresetSelected(preset)}
                  onClick={() => handleAreaPreset(preset)}
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
            description="선호하는 층수가 있으세요?"
          >
            <div className="flex flex-wrap gap-2">
              {FLOOR_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  selected={isFloorPresetSelected(preset)}
                  onClick={() => handleFloorPreset(preset)}
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
            description="연식이 오래된 건물도 괜찮으세요?"
          >
            <div className="flex flex-wrap gap-2">
              {BUILT_YEAR_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  selected={minBuiltYear === preset.value}
                  onClick={() => handleBuiltYearPreset(preset)}
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
