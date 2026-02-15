'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapProps {
  lat: number;
  lng: number;
  name?: string;
  className?: string;
}

export function KakaoMap({ lat, lng, name, className }: KakaoMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!apiKey) {
      setError('카카오맵 API 키가 설정되지 않았습니다.');
      return;
    }

    // 이미 로드된 경우
    if (window.kakao?.maps) {
      setIsLoaded(true);
      return;
    }

    // SDK 동적 로딩
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        setIsLoaded(true);
      });
    };

    script.onerror = () => {
      setError('카카오맵을 불러오지 못했습니다.');
    };

    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (다른 곳에서도 사용할 수 있으므로)
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const { kakao } = window;
    const position = new kakao.maps.LatLng(lat, lng);

    const map = new kakao.maps.Map(mapRef.current, {
      center: position,
      level: 4,
    });

    // 줌 컨트롤
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

    // 지도 타입 컨트롤
    const mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

    // 마커
    const marker = new kakao.maps.Marker({
      position,
      map,
    });

    // 인포윈도우
    if (name) {
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px 10px;font-size:13px;white-space:nowrap;">${name}</div>`,
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
