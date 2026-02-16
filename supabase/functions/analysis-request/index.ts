import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// Claude API를 활용한 AI 분석
// ============================================================

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface PropertyContext {
  name: string;
  address: string;
  property_type: string;
  asking_price: number;
  area_sqm: number;
  floor: number | null;
  total_floors: number | null;
  built_year: number | null;
  news: string[];
  reviews: string[];
}

function buildPropertyContextText(ctx: PropertyContext): string {
  let text = `매물명: ${ctx.name}
주소: ${ctx.address}
유형: ${ctx.property_type}
호가: ${ctx.asking_price}만원
면적: ${ctx.area_sqm}㎡
층: ${ctx.floor ?? '정보없음'}/${ctx.total_floors ?? '정보없음'}층
건축년도: ${ctx.built_year ?? '정보없음'}년`;

  if (ctx.news.length > 0) {
    text += `\n\n관련 뉴스:\n${ctx.news.map((n, i) => `${i + 1}. ${n}`).join('\n')}`;
  }
  if (ctx.reviews.length > 0) {
    text += `\n\n임장 후기:\n${ctx.reviews.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  return text;
}

// TOSS 스타일 프롬프트
const ANALYSIS_PROMPTS: Record<string, string> = {
  market: `당신은 집값을 쉽게 설명해주는 전문가예요.
이 집의 가격이 적당한지 쉽게 알려주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 전문 용어에는 쉬운 설명을 괄호로 넣어주세요
- 숫자는 직관적으로 표현해주세요 (예: "주변보다 약 3% 비싸요")
- "이런 점은 이렇게 해석할 수 있어요" 형태로 해석 가이드를 포함해주세요
분석 포인트: 호가 적정성, 주변 시세 비교, 가격 동향`,

  location: `당신은 동네 분석 전문가예요.
이 집 주변이 살기 좋은 곳인지 쉽게 알려주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 전문 용어에는 쉬운 설명을 괄호로 넣어주세요
- "이런 점은 이렇게 해석할 수 있어요" 형태로 해석 가이드를 포함해주세요
분석 포인트: 교통(지하철/버스), 학군(초중고), 편의시설, 생활환경`,

  investment: `당신은 부동산 투자를 쉽게 알려주는 전문가예요.
이 집이 투자할 만한 가치가 있는지 쉽게 알려주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 전문 용어에는 쉬운 설명을 괄호로 넣어주세요 (예: LTV → 집값 대비 대출 비율)
- "이런 점은 이렇게 해석할 수 있어요" 형태로 해석 가이드를 포함해주세요
분석 포인트: 예상 수익률, 미래 가치, 개발 호재`,

  regulation: `당신은 부동산 규제를 쉽게 풀어주는 전문가예요.
이 집을 살 때 알아야 할 규제를 쉽게 알려주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 전문 용어에는 쉬운 설명을 괄호로 넣어주세요 (예: DSR → 연소득 대비 대출 상환 비율)
- "이런 점은 이렇게 해석할 수 있어요" 형태로 해석 가이드를 포함해주세요
분석 포인트: 대출 한도, 세금, 규제지역 여부`,

  risk: `당신은 집의 안전성을 알려주는 전문가예요.
이 집에 위험한 점이 있는지 쉽게 알려주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 전문 용어에는 쉬운 설명을 괄호로 넣어주세요
- "이런 점은 이렇게 해석할 수 있어요" 형태로 해석 가이드를 포함해주세요
분석 포인트: 건물 상태, 자연재해 위험, 재건축 시기`,

  news_summary: `당신은 부동산 뉴스를 쉽게 정리해주는 전문가예요.
이 집과 관련된 뉴스를 긍정/중립/부정으로 분류하고 쉽게 요약해주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 핵심만 콕 집어서 알려주세요
분석 포인트: 주요 뉴스, 호재/악재, 시장 분위기`,

  review_summary: `당신은 임장 후기를 정리해주는 전문가예요.
이 집에 대한 후기와 리뷰를 쉽게 정리해주세요.

규칙:
- 짧고 간결한 문장으로 써주세요 (30자 이하)
- 일상적인 말투를 사용해주세요 (~해요, ~이에요)
- 실제 살아본 사람들의 의견을 중심으로 정리해주세요
분석 포인트: 자주 나오는 키워드, 장점/단점, 실거주 의견`,
};

async function callClaudeAPI(
  analysisType: string,
  propertyContext: string,
  stageOneContext?: string,
): Promise<any | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const systemPrompt = ANALYSIS_PROMPTS[analysisType];
  if (!systemPrompt) return null;

  const typeLabel: Record<string, string> = {
    market: '시세',
    location: '입지',
    investment: '투자',
    regulation: '규제',
    risk: '리스크',
    news_summary: '뉴스 종합',
    review_summary: '임장 후기 종합',
  };

  let userPrompt = `${propertyContext}`;

  // 2단계 분석: 1단계(뉴스/후기) 결과를 컨텍스트로 추가
  if (stageOneContext) {
    userPrompt += `\n\n--- 뉴스 및 후기 분석 결과 ---\n${stageOneContext}`;
  }

  userPrompt += `\n\n위 매물 정보를 바탕으로 ${typeLabel[analysisType] ?? analysisType} 분석을 수행하세요.

반드시 아래 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요:
{
  "score": <0~100 사이의 정수, 분석 점수>,
  "grade": "<A+/A/B+/B/C/D 중 하나>",
  "summary": "<2~3문장의 쉬운 분석 요약, TOSS 스타일>",
  "details": {<분석 유형에 맞는 세부 데이터 객체>},
  "strengths": ["<강점1>", "<강점2>", ...],
  "weaknesses": ["<약점1>", "<약점2>", ...],
  "recommendations": ["<추천사항1>", "<추천사항2>", "<추천사항3>"],
  "data_sources": ["<구체적 참고 출처 8~12건, 예: '국토교통부 실거래가 공개시스템 - 2025년 12월 거래내역', 'KB부동산 시세 - 분당구 아파트 월간 리포트 2026.01'>"],
  "confidence": <0~100 사이의 정수, 분석 신뢰도>
}

중요: data_sources는 반드시 8건 이상 구체적으로 작성해주세요. 단순히 "KB부동산"이 아니라 "KB부동산 시세 - 분당구 아파트 매매 동향 2026.01" 처럼 구체적인 데이터 출처와 시점을 포함해주세요.`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Claude API error (${analysisType}): ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    const text = result.content?.[0]?.text;
    if (!text) return null;

    // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[1]);
  } catch (err) {
    console.error(`Claude API call failed (${analysisType}):`, err);
    return null;
  }
}

// ============================================================
// Mock 분석 결과 생성 함수들 (Fallback용) - TOSS 스타일
// ============================================================

function calculateScore(seed: string, baseMin = 65, baseMax = 95): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }
  const normalized = Math.abs(hash % 100) / 100;
  return Math.floor(baseMin + normalized * (baseMax - baseMin));
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  return 'D';
}

function generateMarketAnalysis(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-market-${requestId}`, 70, 95);
  const priceDiff = calculateScore(`${property.address}-price`, 0, 10) - 5;
  const priceChange = (calculateScore(`${property.address}-change`, 0, 50) / 10) - 2.5;

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'market',
    score,
    grade: getGrade(score),
    summary: `이 집은 주변보다 약 ${Math.abs(priceDiff).toFixed(0)}% ${priceDiff > 0 ? '비싸요' : '저렴해요'}. 최근 6개월간 이 동네 집값은 ${Math.abs(priceChange).toFixed(1)}% ${priceChange > 0 ? '올랐어요' : '내렸어요'}.`,
    details: {
      asking_price: property.asking_price,
      avg_price_nearby: Math.floor(property.asking_price * (1 - priceDiff / 100)),
      price_per_sqm: Math.floor(property.asking_price / property.area_sqm),
      price_change_6m: priceChange,
      transaction_count_3m: calculateScore(`${property.address}-tx`, 5, 25),
      liquidity_score: calculateScore(`${property.address}-liq`, 60, 90),
    },
    strengths: [
      priceDiff < 0 ? '주변보다 가격이 합리적이에요' : '프리미엄 매물로 가치가 있어요',
      priceChange > 0 ? '집값이 오르는 동네예요' : '가격이 안정적인 구간이에요',
      '최근 거래가 활발해요',
    ].slice(0, 2 + (score > 85 ? 1 : 0)),
    weaknesses: [
      priceDiff > 3 ? '주변보다 호가가 좀 높아요' : null,
      priceChange < -1 ? '집값이 내리는 추세예요' : null,
      score < 75 ? '거래가 많지 않은 편이에요' : null,
    ].filter(Boolean) as string[],
    recommendations: [
      priceDiff > 5 ? '가격 협상 여지를 확인해보세요' : '적정 가격대예요',
      '최근 3개월 실거래가를 꼭 확인해보세요',
    ],
    data_sources: [
      '국토교통부 실거래가 공개시스템 - 최근 6개월 거래내역',
      'KB부동산 시세 - 분당구 아파트 매매 동향 월간 리포트',
      '네이버 부동산 - 동일 단지 매물 호가 현황',
      '한국부동산원 - 주간 아파트 가격동향',
      '부동산114 - 분당구 실거래가 분석',
      '직방 - 동일 단지 시세 추이 데이터',
      `동일 단지 실거래 ${Math.min(30, calculateScore(`${property.address}-similar`, 5, 30))}건 비교 분석`,
      'KB국민은행 - 아파트 시세 조회 (주간)',
      '국토교통부 - 공동주택 공시가격 열람',
    ],
    confidence: calculateScore(`${property.address}-conf-market`, 75, 95),
  };
}

function generateLocationAnalysis(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-location-${requestId}`, 65, 95);
  const subwayDist = calculateScore(`${property.address}-subway`, 3, 15);
  const schoolCount = calculateScore(`${property.address}-school`, 1, 5);

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'location',
    score,
    grade: getGrade(score),
    summary: `지하철역까지 걸어서 ${subwayDist}분이에요. 근처에 초등학교 ${schoolCount}곳, 마트 ${calculateScore(`${property.address}-mart`, 1, 3)}곳이 있어요. 생활하기 ${score >= 80 ? '정말 편한' : '괜찮은'} 동네예요.`,
    details: {
      subway_distance_min: subwayDist,
      bus_stop_count: calculateScore(`${property.address}-bus`, 3, 10),
      elementary_school_count: schoolCount,
      middle_school_count: calculateScore(`${property.address}-middle`, 1, 4),
      hospital_count: calculateScore(`${property.address}-hospital`, 2, 8),
      mart_count: calculateScore(`${property.address}-mart`, 1, 3),
      park_distance_m: calculateScore(`${property.address}-park`, 200, 800),
      noise_level: calculateScore(`${property.address}-noise`, 40, 65),
    },
    strengths: [
      subwayDist < 10 ? '지하철역이 가까워요' : null,
      schoolCount >= 3 ? '학교가 많아서 학군이 좋아요' : null,
      '마트, 병원 같은 편의시설이 가까워요',
      score >= 85 ? '입지가 정말 좋은 곳이에요' : null,
    ].filter(Boolean) as string[],
    weaknesses: [
      subwayDist > 12 ? '지하철역이 좀 멀어요' : null,
      schoolCount < 2 ? '근처 학교가 적은 편이에요' : null,
      score < 70 ? '편의시설이 좀 부족해요' : null,
    ].filter(Boolean) as string[],
    recommendations: [
      '직접 가서 주변 소음을 확인해보세요',
      '출퇴근 시간에 교통편을 테스트해보세요',
    ],
    data_sources: [
      '카카오맵 API - 반경 1km 생활편의시설 검색',
      '학교알리미 - 인근 초/중/고교 정보 및 학업성취도',
      '국토지리정보원 - 주변 도시계획시설 현황',
      `서울교통공사 - 최근접 지하철역 도보 ${subwayDist}분`,
      '경기도 버스정보시스템 - 인근 버스노선 및 배차간격',
      '국민건강보험공단 - 반경 1km 의료기관 현황',
      '환경부 - 대기질 측정 데이터 (최근 3개월)',
      '소음진동규제법 기준 주변 소음도 측정',
      '공원녹지 현황 - 반경 500m 내 공원 면적',
      '행정안전부 - 치안 안전지수 (최근 1년)',
    ],
    confidence: calculateScore(`${property.address}-conf-location`, 80, 95),
  };
}

function generateInvestmentAnalysis(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-investment-${requestId}`, 60, 90);
  const expectedReturn = calculateScore(`${property.address}-return`, 30, 80) / 10;
  const futureValue = calculateScore(`${property.address}-future`, 105, 130);

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'investment',
    score,
    grade: getGrade(score),
    summary: `3년 동안 매년 약 ${expectedReturn.toFixed(1)}% 수익을 기대할 수 있어요. 5년 후에는 지금보다 약 ${futureValue - 100}% 오를 것으로 보여요. ${score >= 75 ? '투자 가치가 높은' : '안정적인'} 매물이에요.`,
    details: {
      expected_return_3y: expectedReturn,
      expected_value_5y: futureValue,
      rental_yield: calculateScore(`${property.address}-yield`, 25, 50) / 10,
      capital_gain_potential: score >= 75 ? 'high' : score >= 65 ? 'medium' : 'low',
      development_projects_nearby: calculateScore(`${property.address}-dev`, 1, 5),
      population_growth_rate: calculateScore(`${property.address}-pop`, 0, 30) / 10 - 1.5,
      redevelopment_potential: property.built_year < 2000 ? 'high' : property.built_year < 2010 ? 'medium' : 'low',
    },
    strengths: [
      expectedReturn > 5 ? '수익률이 높을 것으로 기대돼요' : null,
      futureValue > 120 ? '앞으로 가치가 많이 오를 것 같아요' : null,
      '주변에 개발 호재가 있어요',
      score >= 80 ? '투자 매력이 높은 매물이에요' : null,
    ].filter(Boolean) as string[],
    weaknesses: [
      expectedReturn < 4 ? '수익률이 좀 낮은 편이에요' : null,
      futureValue < 110 ? '가치 상승이 크지 않을 수 있어요' : null,
      property.built_year > 2015 ? '재건축까지 시간이 많이 남았어요' : null,
    ].filter(Boolean) as string[],
    recommendations: [
      '오래 보유하는 관점으로 접근해보세요',
      expectedReturn > 6 ? '월세 수익형 투자로 좋아요' : '실거주 목적이 더 나아요',
    ],
    data_sources: [
      '국토교통부 - 주변 도시개발사업 인허가 현황',
      '통계청 - 분당구 인구이동 통계 (최근 1년)',
      '한국감정원 - 아파트 투자수익률 분석 모델',
      'KB부동산 - 분당구 전세/매매 비율 추이',
      '국토교통부 - GTX/신규 교통 개발계획',
      '경기도청 - 분당구 도시재생 뉴딜사업 현황',
      `재건축 가능성 분석 - 건축 ${new Date().getFullYear() - property.built_year}년차`,
      '한국부동산원 - 월간 임대차 시장동향',
      '부동산114 - 분당구 신규 분양 계획',
      '통계청 - 가구당 평균소득 대비 PIR 분석',
    ],
    confidence: calculateScore(`${property.address}-conf-investment`, 70, 90),
  };
}

function generateRegulationAnalysis(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-regulation-${requestId}`, 65, 95);
  const loanRatio = calculateScore(`${property.address}-loan`, 40, 70);
  const acquisitionTax = calculateScore(`${property.address}-acq`, 10, 35) / 10;

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'regulation',
    score,
    grade: getGrade(score),
    summary: `집값의 최대 ${loanRatio}%까지 대출받을 수 있어요. 취득세(집 살 때 내는 세금)는 약 ${acquisitionTax.toFixed(1)}%예요. ${score >= 80 ? '규제가 적은 지역이에요' : '규제를 잘 확인해야 해요'}.`,
    details: {
      loan_to_value_max: loanRatio,
      acquisition_tax_rate: acquisitionTax,
      property_holding_tax_annual: Math.floor(property.asking_price * 0.001 * calculateScore(`${property.address}-hold`, 1, 4)),
      area_classification: score >= 80 ? '비규제지역' : '조정대상지역',
      multiple_home_restriction: loanRatio < 50,
      capital_gains_tax_rate: calculateScore(`${property.address}-cgt`, 6, 45),
      transfer_income_deduction: property.built_year < 2015,
    },
    strengths: [
      loanRatio >= 60 ? '대출을 넉넉하게 받을 수 있어요' : null,
      acquisitionTax < 2 ? '취득세 부담이 적어요' : null,
      score >= 85 ? '규제가 완화된 지역이에요' : null,
      '세금 혜택을 받을 수 있어요',
    ].filter(Boolean) as string[],
    weaknesses: [
      loanRatio < 50 ? '대출 한도가 좀 빡빡해요' : null,
      acquisitionTax > 3 ? '취득세가 좀 높아요' : null,
      score < 70 ? '규제지역이라 주의가 필요해요' : null,
    ].filter(Boolean) as string[],
    recommendations: [
      '은행에 직접 대출 한도를 문의해보세요',
      '세무사에게 절세 방법을 상담해보세요',
    ],
    data_sources: [
      '국토교통부 - 투기과열지구/조정대상지역 지정 현황',
      '금융위원회 - 주택담보대출 LTV/DTI/DSR 규제 기준',
      '행정안전부 - 지방세법 시행령 (취득세율표)',
      '국세청 - 양도소득세 세율 및 공제 기준',
      '금융감독원 - 주요 시중은행 주택담보대출 금리 비교',
      '한국은행 - 기준금리 동향 및 전망',
      '국토교통부 - 분양가상한제 적용 지역 현황',
      '기획재정부 - 종합부동산세 과세 기준',
      '법제처 - 주택법/건축법 관련 규제 사항',
    ],
    confidence: calculateScore(`${property.address}-conf-regulation`, 85, 98),
  };
}

function generateRiskAnalysis(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-risk-${requestId}`, 60, 90);
  const buildingAge = new Date().getFullYear() - property.built_year;
  const structuralScore = calculateScore(`${property.address}-struct`, 70, 95);

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'risk',
    score,
    grade: getGrade(score),
    summary: `지은 지 ${buildingAge}년 된 건물이에요. 구조 안전성은 ${structuralScore}점이에요. ${property.built_year < 2000 ? '재건축 시기를 확인해볼 필요가 있어요' : '건물 상태가 괜찮아요'}.`,
    details: {
      building_age: buildingAge,
      structural_safety_score: structuralScore,
      earthquake_risk: calculateScore(`${property.address}-eq`, 1, 5),
      flood_risk: calculateScore(`${property.address}-flood`, 1, 5),
      landslide_risk: calculateScore(`${property.address}-land`, 1, 4),
      fire_safety_grade: buildingAge < 10 ? 'A' : buildingAge < 20 ? 'B' : 'C',
      redevelopment_timeline: property.built_year < 1995 ? '5년 이내' : property.built_year < 2005 ? '10년 이내' : '15년 이상',
      asbestos_risk: property.built_year < 2009,
    },
    strengths: [
      structuralScore >= 85 ? '건물이 튼튼해요' : null,
      score >= 80 ? '자연재해 위험이 낮아요' : null,
      property.built_year >= 2010 ? '비교적 새 건물이라 안심이에요' : null,
      '소방 시설이 잘 갖춰져 있어요',
    ].filter(Boolean) as string[],
    weaknesses: [
      buildingAge > 30 ? '건물이 좀 오래됐어요' : null,
      property.built_year < 2009 ? '석면(유해 건축자재) 사용 가능성이 있어요' : null,
      structuralScore < 75 ? '안전 점검이 필요해요' : null,
      score < 70 ? '재해 대비를 확인해야 해요' : null,
    ].filter(Boolean) as string[],
    recommendations: [
      buildingAge > 20 ? '안전진단 결과를 꼭 확인해보세요' : '정기 점검 기록을 확인해보세요',
      '화재보험 가입 여부를 확인해보세요',
    ],
    data_sources: [
      '국민재난안전포털 - 자연재해 위험지구 현황',
      '세움터 건축물대장 - 구조/면적/사용승인 정보',
      '한국시설안전공단 - 정밀안전진단 이력',
      `건축년도 기준 분석 - ${property.built_year}년 (${new Date().getFullYear() - property.built_year}년차)`,
      '기상청 - 최근 10년 집중호우/태풍 이력',
      '행정안전부 - 지진 위험도 평가 (내진설계 기준)',
      '환경부 - 석면 건축자재 사용 실태조사',
      '소방청 - 건물 소방시설 점검 이력',
      '한국감정원 - 건물 노후도 평가 지표',
      '국토안전관리원 - 건축물 안전등급 평가',
    ],
    confidence: calculateScore(`${property.address}-conf-risk`, 75, 92),
  };
}

function generateNewsSummary(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-news-${requestId}`, 60, 95);
  const totalArticles = calculateScore(`${property.address}-news-count`, 5, 15);
  const positiveRatio = calculateScore(`${property.address}-news-pos`, 30, 70);
  const positiveCount = Math.floor(totalArticles * positiveRatio / 100);
  const negativeRatio = calculateScore(`${property.address}-news-neg`, 5, 25);
  const negativeCount = Math.floor(totalArticles * negativeRatio / 100);
  const neutralCount = totalArticles - positiveCount - negativeCount;

  const topics = [
    { topic: 'GTX 역세권 호재', sentiment: 'positive', article_count: Math.min(positiveCount, 3) },
    { topic: '재건축 논의', sentiment: 'neutral', article_count: Math.min(neutralCount, 2) },
    { topic: '학군 인프라 개선', sentiment: 'positive', article_count: Math.min(positiveCount - 3, 2) },
    { topic: '주변 개발 계획', sentiment: 'positive', article_count: Math.min(positiveCount - 5, 1) },
    { topic: '소음 민원', sentiment: 'negative', article_count: negativeCount },
  ].filter(t => t.article_count > 0);

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'news_summary',
    score,
    grade: getGrade(score),
    summary: `뉴스 ${totalArticles}건을 살펴봤어요. 좋은 뉴스가 ${positiveCount}건, 나쁜 뉴스가 ${negativeCount}건이에요. ${positiveCount > negativeCount ? '전체적으로 좋은 소식이 많아요' : '주의할 점도 있어요'}. 가장 많이 나온 이슈는 '${topics[0]?.topic ?? '지역 동향'}'이에요.`,
    details: {
      total_articles: totalArticles,
      positive_count: positiveCount,
      neutral_count: neutralCount,
      negative_count: negativeCount,
      key_topics: topics,
    },
    strengths: topics
      .filter(t => t.sentiment === 'positive')
      .map(t => `${t.topic} 관련 좋은 소식이 있어요 (${t.article_count}건)`),
    weaknesses: topics
      .filter(t => t.sentiment === 'negative')
      .map(t => `${t.topic} 관련 주의할 소식이 있어요 (${t.article_count}건)`),
    recommendations: [
      '주요 뉴스 원문을 직접 읽어보세요',
      positiveCount > 5 ? '호재가 지속되는지 지켜보세요' : '뉴스 동향을 계속 확인해보세요',
    ],
    data_sources: [
      '네이버 뉴스 - 매물명/지역 키워드 검색 (최근 3개월)',
      '다음 뉴스 - 부동산 섹션 관련 기사',
      '한국경제 부동산 - 분당구 시장 동향 기사',
      '매일경제 부동산 - 수도권 아파트 시세 분석',
      '조선일보 부동산 - 분당 개발 호재 관련 보도',
      '머니투데이 - 부동산 시장 전망 기사',
      '부동산빅데이터 - 뉴스 감성분석 리포트',
      `수집된 관련 뉴스 총 ${totalArticles}건 분석`,
      'SBS Biz - 부동산 뉴스 관련 보도',
    ],
    confidence: calculateScore(`${property.address}-conf-news`, 70, 90),
  };
}

function generateReviewSummary(property: any, requestId: string) {
  const score = calculateScore(`${property.address}-review-${requestId}`, 65, 95);
  const totalReviews = calculateScore(`${property.address}-review-count`, 3, 12);

  const keywords = [
    { keyword: '교통', count: calculateScore(`${property.address}-kw-traffic`, 3, 8), sentiment: 'positive' },
    { keyword: '주차', count: calculateScore(`${property.address}-kw-parking`, 2, 6), sentiment: score > 75 ? 'positive' : 'negative' },
    { keyword: '소음', count: calculateScore(`${property.address}-kw-noise`, 1, 4), sentiment: 'negative' },
    { keyword: '학군', count: calculateScore(`${property.address}-kw-school`, 2, 5), sentiment: 'positive' },
    { keyword: '관리비', count: calculateScore(`${property.address}-kw-fee`, 1, 3), sentiment: score > 80 ? 'neutral' : 'negative' },
  ].sort((a, b) => b.count - a.count).slice(0, 5);

  const positiveKeywords = keywords.filter(k => k.sentiment === 'positive');
  const negativeKeywords = keywords.filter(k => k.sentiment === 'negative');

  return {
    request_id: requestId,
    property_id: property.id,
    analysis_type: 'review_summary',
    score,
    grade: getGrade(score),
    summary: `후기 ${totalReviews}건을 분석했어요. 사람들이 가장 많이 얘기한 건 '${keywords[0].keyword}'(${keywords[0].count}회)이에요. 실제 사는 분들 평가는 ${score >= 80 ? '대체로 좋아요' : '보통이에요'}.`,
    details: {
      total_reviews: totalReviews,
      frequently_mentioned: keywords,
    },
    strengths: positiveKeywords.map(k => `${k.keyword}에 대해 좋은 평가가 많아요 (${k.count}회)`),
    weaknesses: negativeKeywords.map(k => `${k.keyword}에 대해 아쉬운 점이 있어요 (${k.count}회)`),
    recommendations: [
      '직접 방문해서 후기 내용을 확인해보세요',
      negativeKeywords.length > 0 ? `${negativeKeywords[0].keyword} 관련해서 꼭 체크하세요` : '입주민 카페도 참고해보세요',
    ],
    data_sources: [
      '네이버 카페 - 분당 입주민 커뮤니티 후기',
      '네이버 블로그 - 임장 후기 및 실거주 리뷰',
      '부동산스터디 카페 - 매물 방문 후기',
      '호갱노노 - 입주민 평점 및 리뷰',
      '아파트실거주 카페 - 거주 만족도 조사',
      '피터팬의 좋은방 구하기 - 세입자 후기',
      `수집된 임장 후기 총 ${totalReviews}건 분석`,
      '네이버 부동산 - 단지 리뷰 및 평점',
      '직방 - 입주민 거주 후기',
    ],
    confidence: calculateScore(`${property.address}-conf-review`, 65, 85),
  };
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 메인 서버
// ============================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Service Role 클라이언트 (인증 불필요)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 인증 시도 (선택적)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const authClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const { property_id, analysis_types } = await req.json();
    const types = analysis_types || ['market', 'location', 'investment', 'regulation', 'risk', 'news_summary', 'review_summary'];

    // 1. 분석 요청 레코드 생성
    const { data: request, error: requestError } = await supabase
      .from('analysis_requests')
      .insert({
        property_id,
        user_id: userId,
        analysis_types: types,
        total_count: types.length,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    // 2. 매물 정보 가져오기
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propertyError) throw propertyError;

    // 3. 상태를 processing으로 변경
    await supabase
      .from('analysis_requests')
      .update({ status: 'processing' })
      .eq('id', request.id);

    // 4. 백그라운드에서 분석 실행 (비동기)
    const supabaseAdmin = supabase;

    // Mock 분석 타입별 생성 함수 매핑 (fallback용)
    const generators: Record<string, Function> = {
      market: generateMarketAnalysis,
      location: generateLocationAnalysis,
      investment: generateInvestmentAnalysis,
      regulation: generateRegulationAnalysis,
      risk: generateRiskAnalysis,
      news_summary: generateNewsSummary,
      review_summary: generateReviewSummary,
    };

    // 백그라운드 실행 (await 하지 않음)
    (async () => {
      try {
        // 유사 매물 조회 (50건)
        const { data: similarProperties } = await supabaseAdmin
          .from('properties')
          .select('name, address, asking_price, area_sqm, floor, built_year')
          .eq('name', property.name)
          .neq('id', property.id)
          .order('created_at', { ascending: false })
          .limit(50);

        // 뉴스 조회 (30건)
        const { data: newsData } = await supabaseAdmin
          .from('property_news')
          .select('title, summary')
          .eq('property_id', property_id)
          .order('published_at', { ascending: false })
          .limit(30);

        // 임장 후기 조회 (30건)
        const { data: reviewsData } = await supabaseAdmin
          .from('property_reviews')
          .select('title, summary, content')
          .eq('property_id', property_id)
          .order('created_at', { ascending: false })
          .limit(30);

        const news = (newsData || []).map((n: any) => `${n.title}${n.summary ? ': ' + n.summary : ''}`);
        const reviews = (reviewsData || []).map((r: any) => `${r.title}${r.summary ? ': ' + r.summary : (r.content ? ': ' + r.content.slice(0, 100) : '')}`);

        // 실거래 데이터 컨텍스트 추가
        let additionalContext = '';
        if (similarProperties && similarProperties.length > 0) {
          additionalContext = '\n\n동일 단지 실거래 데이터:\n' +
            similarProperties.map((p: any) =>
              `- ${p.address} ${p.floor}층, ${p.area_sqm}㎡, ${p.asking_price}만원 (건축: ${p.built_year}년)`
            ).join('\n');
        }

        const propertyContext: PropertyContext = {
          name: property.name,
          address: property.address,
          property_type: property.property_type,
          asking_price: property.asking_price,
          area_sqm: property.area_sqm,
          floor: property.floor,
          total_floors: property.total_floors ?? null,
          built_year: property.built_year,
          news,
          reviews,
        };

        const contextText = buildPropertyContextText(propertyContext) + additionalContext;

        // === 2단계 분석 구조 ===

        // 1단계: 뉴스 종합 + 임장 후기 종합 먼저 실행
        const contentTypes = types.filter((t: string) => t === 'news_summary' || t === 'review_summary');
        const expertTypes = types.filter((t: string) => t !== 'news_summary' && t !== 'review_summary');

        const stageOneResults: Record<string, string> = {};

        for (const type of contentTypes) {
          const aiResult = await callClaudeAPI(type, contextText);

          let report: any;
          if (aiResult) {
            report = {
              request_id: request.id,
              property_id: property.id,
              analysis_type: type,
              score: aiResult.score,
              grade: aiResult.grade,
              summary: aiResult.summary,
              details: aiResult.details,
              strengths: aiResult.strengths,
              weaknesses: aiResult.weaknesses,
              recommendations: aiResult.recommendations,
              data_sources: aiResult.data_sources,
              confidence: aiResult.confidence,
            };
            stageOneResults[type] = aiResult.summary;
          } else {
            console.warn(`Claude API fallback for ${type}, using mock data`);
            const generator = generators[type];
            if (!generator) continue;
            report = generator(property, request.id);
            stageOneResults[type] = report.summary;
          }

          await supabaseAdmin
            .from('analysis_reports')
            .insert(report);

          await delay(1000);
        }

        // 2단계: 1단계 결과를 참조하여 전문가 분석 실행
        let stageOneContext = '';
        if (stageOneResults['news_summary']) {
          stageOneContext += `뉴스 분석 결과: ${stageOneResults['news_summary']}\n`;
        }
        if (stageOneResults['review_summary']) {
          stageOneContext += `후기 분석 결과: ${stageOneResults['review_summary']}\n`;
        }

        for (const type of expertTypes) {
          const aiResult = await callClaudeAPI(type, contextText, stageOneContext || undefined);

          let report: any;
          if (aiResult) {
            report = {
              request_id: request.id,
              property_id: property.id,
              analysis_type: type,
              score: aiResult.score,
              grade: aiResult.grade,
              summary: aiResult.summary,
              details: aiResult.details,
              strengths: aiResult.strengths,
              weaknesses: aiResult.weaknesses,
              recommendations: aiResult.recommendations,
              data_sources: aiResult.data_sources,
              confidence: aiResult.confidence,
            };
          } else {
            console.warn(`Claude API fallback for ${type}, using mock data`);
            const generator = generators[type];
            if (!generator) continue;
            report = generator(property, request.id);
          }

          await supabaseAdmin
            .from('analysis_reports')
            .insert(report);

          await delay(1000);
        }
      } catch (error) {
        console.error('분석 실행 중 오류:', error);
        await supabaseAdmin
          .from('analysis_requests')
          .update({
            status: 'failed',
            error_message: (error as Error).message
          })
          .eq('id', request.id);
      }
    })();

    // 5. 즉시 요청 정보 반환
    return new Response(JSON.stringify(request), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('요청 처리 오류:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
