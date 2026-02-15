'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScoreBadge } from '@/components/analysis/ScoreBadge';
import { formatPriceEok, formatArea } from '@/lib/utils/format';
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '@/types/property';
import { useFavorites } from '@/hooks/useFavorites';
import type { Property, PropertyStatus } from '@/types/property';
import type { AnalysisReport } from '@/types/analysis';

interface PropertyCardProps {
  property: Property;
  reports?: AnalysisReport[];
  showStatusSelect?: boolean;
}

export function PropertyCard({ property, reports, showStatusSelect = false }: PropertyCardProps) {
  const { updateStatus } = useFavorites();

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.preventDefault();
    const newStatus = e.target.value as PropertyStatus;
    updateStatus.mutate({ propertyId: property.id, status: newStatus });
  };

  return (
    <Card hover>
      <Link href={`/property/${property.id}`}>
        <div className="relative">
          <div className="h-40 w-full bg-neutral-200 rounded-t-xl overflow-hidden">
            {property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400 text-sm">
                이미지 없음
              </div>
            )}
          </div>
          <Badge className="absolute left-3 top-3" variant="primary">
            {PROPERTY_TYPE_LABELS[property.property_type]}
          </Badge>
        </div>

        <CardContent>
          <p className="text-lg font-bold text-neutral-900">
            {formatPriceEok(property.asking_price)}
          </p>
          <p className="mt-0.5 font-medium text-neutral-800">{property.name}</p>
          <p className="text-sm text-neutral-500">{property.address}</p>

          <p className="mt-2 text-xs text-neutral-500">
            {formatArea(property.area_sqm)}
            {property.floor && ` · ${property.floor}층`}
            {property.direction && ` · ${property.direction}`}
            {property.built_year && ` · ${property.built_year}년`}
          </p>

          {reports && reports.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reports.map((report) => (
                <ScoreBadge
                  key={report.analysis_type}
                  score={report.score}
                  label={report.analysis_type === 'market' ? '시세' :
                         report.analysis_type === 'location' ? '입지' :
                         report.analysis_type === 'investment' ? '투자' :
                         report.analysis_type === 'regulation' ? '규제' : '리스크'}
                  size="sm"
                />
              ))}
            </div>
          )}

          {showStatusSelect && (
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                상태 변경
              </label>
              <select
                value={property.status}
                onChange={handleStatusChange}
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="none">미분류</option>
                <option value="interested">관심</option>
                <option value="visit_planned">방문예정</option>
                <option value="visited">방문완료</option>
                <option value="candidate">후보</option>
                <option value="rejected">탈락</option>
              </select>
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}
