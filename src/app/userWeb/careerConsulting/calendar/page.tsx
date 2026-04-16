'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput } from '@fullcalendar/core';
import { LayoutWrapper } from '@/widgets/userWeb/layout';
import { apiClient, getCareerConsultCalendarType } from '@/shared/lib';
import { API_ENDPOINTS } from '@/shared/config/apiUser';
import '@/styles/userWeb/calendar.css';

const FullCalendar = dynamic(
  () =>
    import('@fullcalendar/react').then(
      (m) => m.default as unknown as React.ComponentType<any>,
    ) as any,
  {
    ssr: false,
  },
) as unknown as React.ComponentType<any>;

/** list01-options API 응답 1건 (f_selectlist01: 기준년월별 상담일정) */
interface SelectList01Item {
  gbnData?: string;
  spaceNm?: string;
  runtime?: string;
  useCnt?: number;
  useYn?: string;
}

/** 접수현황 달력용 이벤트 — 장소·시간·인원 전부 표시; useYn F는 CSS에서 빨간 글씨 */
interface CalendarEventItem {
  date: string;
  fullTitle: string;
  participantType: string;
  /** API useYn === 'F' (대소문자 무관) — 마감·비가용 */
  isUnavailable: boolean;
}

/** 배경은 테마색; 글자색은 기본 #333, F일 때만 fc-event-unavailable로 빨강 */
function buildCalendarEvents(items: CalendarEventItem[]): EventInput[] {
  return items.map((item) => ({
    title: item.fullTitle,
    start: item.date,
    allDay: true,
    classNames: [
      'fc-event-theme',
      ...(item.isUnavailable ? ['fc-event-unavailable'] : []),
    ],
    extendedProps: {
      participantType: item.participantType,
      fullTitle: item.fullTitle,
      isUnavailable: item.isUnavailable,
    },
  }));
}

/** workYm(YYYYMM) → YYYY-MM-DD 일자 만들기 (gbnData는 일 1~31) */
function toDateStr(workYm: string, gbnData: string): string {
  const y = workYm.slice(0, 4);
  const m = workYm.slice(4, 6);
  const d = String(gbnData).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** list01-options API 연동: proId + 보이는 달(workYm)로 기준년월별 목록 조회 */
function useCalendarEvents(proId: string | null, workYm: string) {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!proId || !workYm || workYm.length !== 6) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const url = API_ENDPOINTS.USER_ARTPROM.LIST01_OPTIONS(proId, workYm);
    apiClient
      .get<SelectList01Item[]>(url)
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : [];
        const mapped: CalendarEventItem[] = list
          .filter(
            (item) =>
              item.gbnData != null &&
              item.gbnData !== '' &&
              item.spaceNm != null &&
              String(item.spaceNm).trim() !== '',
          )
          .map((item) => {
            const place = item.spaceNm ?? '';
            const time = item.runtime ?? '-';
            const people = item.useCnt != null ? `${item.useCnt}명` : '-';
            const fullTitle = [place, time, people].join(' ');
            const useYnUpper =
              item.useYn != null ? String(item.useYn).toUpperCase() : '';
            const isUnavailable = useYnUpper === 'F';
            return {
              date: toDateStr(workYm, item.gbnData!),
              fullTitle,
              participantType: '',
              isUnavailable,
            };
          });
        setEvents(mapped);
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proId, workYm]);

  return { events, loading };
}

/** 현재 시각 기준 YYYYMM */
function getCurrentWorkYm(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CareerConsultingCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proId = searchParams.get('proId') ?? '';
  const typeParam = getCareerConsultCalendarType(searchParams);
  const reqGbPosition = searchParams.get('reqGbPosition');

  const [viewYearMonth, setViewYearMonth] = useState(getCurrentWorkYm);
  const { events: rawEvents, loading } = useCalendarEvents(
    proId,
    viewYearMonth,
  );

  const handleDatesSet = useCallback((info: { start: Date; end: Date }) => {
    const y = info.start.getFullYear();
    const m = String(info.start.getMonth() + 1).padStart(2, '0');
    setViewYearMonth(`${y}${m}`);
  }, []);

  const calendarEvents = useMemo(
    () => buildCalendarEvents(rawEvents),
    [rawEvents],
  );

  const handleClose = () => {
    if (proId) {
      const params = new URLSearchParams();
      params.set('proId', proId);
      params.set('type', typeParam);
      if (reqGbPosition) {
        params.set('reqGbPosition', reqGbPosition);
      }
      router.push(`/userWeb/bizInputCt?${params.toString()}`);
    } else {
      router.back();
    }
  };

  return (
    <LayoutWrapper headerType="main">
      <div className="bizBg">
        <div className="calendarWrap">
          {loading && (
            <p className="calendarTitle" style={{ marginBottom: '0.5rem' }}>
              불러오는 중…
            </p>
          )}
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            headerToolbar={{
              left: 'prev',
              center: 'title',
              right: 'next',
            }}
            datesSet={handleDatesSet}
            events={calendarEvents}
            dayMaxEvents={4}
            moreLinkText={(n: number) => `외 ${n}건`}
            eventDidMount={(info: any) => {
              const full = info.event.extendedProps.fullTitle as
                | string
                | undefined;
              if (full) info.el.title = full;
              else if (info.event.title) info.el.title = info.event.title;
            }}
            height="auto"
            contentHeight="auto"
            aria-label="접수현황 달력"
          />
          <div className="calendarFooter">
            <button
              type="button"
              className="btnCloseCalendar"
              onClick={handleClose}
              aria-label="닫기"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
