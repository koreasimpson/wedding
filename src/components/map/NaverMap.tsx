'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    naver: any;
  }
}

interface NaverMapProps {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
}

export function NaverMap({ lat, lng, name, className }: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
      setError('네이버 지도 API 키가 설정되지 않았습니다.');
      return;
    }

    // 이미 로드된 경우
    if (window.naver?.maps) {
      setIsLoaded(true);
      return;
    }

    // SDK 동적 로딩
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
    script.async = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      setError('네이버 지도를 불러오지 못했습니다.');
    };

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const { naver } = window;
    const position = new naver.maps.LatLng(lat, lng);

    const map = new naver.maps.Map(mapRef.current, {
      center: position,
      zoom: 16,
      zoomControl: true,
      zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT,
      },
    });

    const marker = new naver.maps.Marker({
      position,
      map,
    });

    if (name) {
      const infowindow = new naver.maps.InfoWindow({
        content: `<div style="padding:8px 12px;font-size:13px;font-weight:600;white-space:nowrap;border:none;">${name}</div>`,
      });
      infowindow.open(map, marker);
    }
  }, [isLoaded, lat, lng, name]);

  if (error) {
    const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name || '')}?c=${lng},${lat},15,0,0,0,dh`;
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-100 text-sm text-neutral-500 ${className}`}>
        <p>{error}</p>
        <a
          href={naverMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary-600 shadow-sm hover:bg-neutral-50 transition-colors"
        >
          네이버 지도에서 보기
        </a>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`rounded-xl ${className}`}
      style={{ minHeight: '300px' }}
    />
  );
}
