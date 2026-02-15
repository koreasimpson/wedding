export function formatPrice(price: number): string {
  // price는 원 단위 (예: 1850000000 = 18.5억원)
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatPriceShort(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatPriceEok(price: number): string {
  const eok = price / 100_000_000;
  if (eok >= 1) {
    const rounded = Math.round(eok * 10) / 10;
    return rounded % 1 === 0 ? `${rounded.toFixed(0)}억` : `${rounded}억`;
  }
  const man = Math.round(price / 10_000);
  return `${man.toLocaleString('ko-KR')}만`;
}

export function formatArea(sqm: number): string {
  const pyeong = (sqm / 3.3058).toFixed(0);
  return `${sqm}㎡ (${pyeong}평)`;
}
