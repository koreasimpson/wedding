'use client';

import { useState } from 'react';
import { X, Loader2, Search, MapPin, ChevronRight, ArrowLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Property } from '@/types/property';

interface AddPropertyModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  kakao_id?: string;
  category?: string;
}

type ManualForm = {
  name: string;
  address: string;
  asking_price: string;
  area_sqm: string;
  floor: string;
  built_year: string;
};

const 억 = 100_000_000;

export function AddPropertyModal({ open, onClose }: AddPropertyModalProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>({
    name: '', address: '', asking_price: '', area_sqm: '', floor: '', built_year: '',
  });

  // 검색
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.functions.invoke('parse-naver-property', {
        body: { action: 'search', query },
      });
      if (error) throw error;
      return data as { results: SearchResult[] };
    },
    onSuccess: (data) => {
      setSearchResults(data.results || []);
    },
  });

  // 선택한 매물 저장
  const saveMutation = useMutation({
    mutationFn: async (result: SearchResult) => {
      const { data, error } = await supabase.functions.invoke('parse-naver-property', {
        body: {
          action: 'save',
          name: result.name,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
          kakao_id: result.kakao_id,
        },
      });
      if (error) throw error;
      return data as { success: boolean; property: Property };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recommended-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      alert(`"${data.property.name}" 매물이 추가됐어요`);
      handleClose();
    },
    onError: () => {
      alert('매물 추가에 실패했어요. 다시 시도해 주세요.');
    },
  });

  // 수동 입력 저장
  const manualMutation = useMutation({
    mutationFn: async (form: ManualForm) => {
      const priceWon = Math.round(parseFloat(form.asking_price) * 억) || 0;
      const { data, error } = await supabase
        .from('properties')
        .insert({
          name: form.name,
          address: form.address,
          property_type: 'apt',
          asking_price: priceWon,
          area_sqm: parseFloat(form.area_sqm) || 0,
          floor: parseInt(form.floor) || null,
          built_year: parseInt(form.built_year) || null,
          lat: 37.5665,
          lng: 126.978,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recommended-properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      alert(`"${data.name}" 매물이 추가됐어요`);
      handleClose();
    },
    onError: () => {
      alert('매물 추가에 실패했어요. 다시 시도해 주세요.');
    },
  });

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowManualForm(false);
    setManualForm({ name: '', address: '', asking_price: '', area_sqm: '', floor: '', built_year: '' });
    searchMutation.reset();
    saveMutation.reset();
    onClose();
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    searchMutation.mutate(searchQuery.trim());
  };

  const handleSelectResult = (result: SearchResult) => {
    saveMutation.mutate(result);
  };

  const handleManualSubmit = () => {
    if (!manualForm.name || !manualForm.address) return;
    manualMutation.mutate(manualForm);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={handleClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            {showManualForm ? (
              <button
                onClick={() => setShowManualForm(false)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </button>
            ) : (
              <h2 className="text-lg font-bold text-neutral-900">매물 추가</h2>
            )}
            <button
              onClick={handleClose}
              className="rounded-lg p-1 hover:bg-neutral-100"
              aria-label="닫기"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* 본문 */}
          <div className="px-6 py-5">
            {showManualForm ? (
              /* ─── 수동 입력 폼 ─── */
              <div className="space-y-3">
                <Input
                  label="아파트 이름"
                  placeholder="예: 래미안 블레스티지"
                  value={manualForm.name}
                  onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="주소"
                  placeholder="예: 서울특별시 강남구 역삼동 123"
                  value={manualForm.address}
                  onChange={(e) => setManualForm(prev => ({ ...prev, address: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="호가 (억원)"
                    type="number"
                    placeholder="예: 12.5"
                    value={manualForm.asking_price}
                    onChange={(e) => setManualForm(prev => ({ ...prev, asking_price: e.target.value }))}
                  />
                  <Input
                    label="전용면적 (㎡)"
                    type="number"
                    placeholder="예: 84"
                    value={manualForm.area_sqm}
                    onChange={(e) => setManualForm(prev => ({ ...prev, area_sqm: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="층"
                    type="number"
                    placeholder="예: 15"
                    value={manualForm.floor}
                    onChange={(e) => setManualForm(prev => ({ ...prev, floor: e.target.value }))}
                  />
                  <Input
                    label="건축년도"
                    type="number"
                    placeholder="예: 2020"
                    value={manualForm.built_year}
                    onChange={(e) => setManualForm(prev => ({ ...prev, built_year: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={handleManualSubmit}
                  disabled={manualMutation.isPending || !manualForm.name || !manualForm.address}
                  className="w-full"
                >
                  {manualMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '추가하기'
                  )}
                </Button>
              </div>
            ) : (
              /* ─── 검색 모드 ─── */
              <div className="space-y-4">
                {/* 검색 입력 */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    아파트 이름이나 주소를 검색해 주세요
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="예: 헬리오시티, 잠실 아파트"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-neutral-300 py-2.5 pl-10 pr-3 text-sm placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={searchMutation.isPending || searchQuery.trim().length < 2}
                    >
                      {searchMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        '검색'
                      )}
                    </Button>
                  </div>
                </div>

                {/* 검색 결과 */}
                {searchMutation.isPending && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                    <span className="ml-2 text-sm text-neutral-500">검색 중...</span>
                  </div>
                )}

                {searchMutation.isSuccess && searchResults.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm text-neutral-500">검색 결과가 없어요</p>
                    <p className="mt-1 text-xs text-neutral-400">다른 이름이나 주소로 다시 검색해 보세요</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {searchResults.map((result, i) => (
                      <button
                        key={`${result.kakao_id || i}`}
                        onClick={() => handleSelectResult(result)}
                        disabled={saveMutation.isPending}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-neutral-50 disabled:opacity-50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                          <MapPin className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">
                            {result.name}
                          </p>
                          <p className="truncate text-xs text-neutral-500">
                            {result.address}
                          </p>
                        </div>
                        {saveMutation.isPending && saveMutation.variables === result ? (
                          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* 직접 입력 링크 */}
                <div className="border-t border-neutral-100 pt-3">
                  <button
                    onClick={() => setShowManualForm(true)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    검색에 없다면, 직접 입력할게요
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
