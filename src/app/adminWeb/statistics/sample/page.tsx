'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/widgets/adminWeb/layout';

export default function SampleStatisticsPage() {
  const [startDate, setStartDate] = useState('2020-01-01');
  const [endDate, setEndDate] = useState('2020-03-01');
  const [classification, setClassification] = useState('구분');

  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">샘플통계</h1>
        <nav className="breadcrumb">
          <span>홈</span> &gt; <span>통계자료</span> &gt; <span>샘플통계</span>
        </nav>
      </div>

      {/* 검색 조건 */}
      <div className="bg-[#e8f4f8] rounded-lg shadow-sm mb-4">
        <div className="p-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="font-bold">의뢰일자</span>
            <input
              type="date"
              className="w-[150px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span>~</span>
            <input
              type="date"
              className="w-[150px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <select
              className="w-[150px] px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
            >
              <option value="구분">구분</option>
              <option value="NA">NA</option>
              <option value="EU">EU</option>
              <option value="NA/EU">NA/EU</option>
            </select>
            <button className="min-w-[80px] px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
              조회
            </button>
          </div>
        </div>
      </div>

      {/* PRRSV 유전형별 분포 */}
      <div className="mb-5">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#4472c4] text-white font-bold px-4 py-3">
            PRRSV 유전형별 분포
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex justify-center items-center">
                {/* Pie Chart Placeholder */}
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="#4472c4" />
                  <path d="M 100 100 L 100 20 A 80 80 0 0 1 164.7 64.7 Z" fill="#ed7d31" />
                  <path d="M 100 100 L 164.7 64.7 A 80 80 0 0 1 180 100 Z" fill="#a5a5a5" />
                  <path d="M 100 100 L 180 100 A 80 80 0 0 1 180 120 Z" fill="#ffc000" />
                </svg>
              </div>
              <div className="md:col-span-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr className="text-center">
                        <th className="border border-gray-300 px-4 py-2">유전형</th>
                        <th className="border border-gray-300 px-4 py-2">NA</th>
                        <th className="border border-gray-300 px-4 py-2">EU</th>
                        <th className="border border-gray-300 px-4 py-2">NA/EU</th>
                        <th className="border border-gray-300 px-4 py-2">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">건수</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">분포</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRRSV(NA) 정량적 분포 */}
      <div className="mb-5">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#4472c4] text-white font-bold px-4 py-3">
            PRRSV(NA) 정량적 분포
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex justify-center items-center">
                {/* Pie Chart Placeholder */}
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="#4472c4" />
                  <path d="M 100 100 L 100 20 A 80 80 0 0 1 164.7 64.7 Z" fill="#ed7d31" />
                  <path d="M 100 100 L 164.7 64.7 A 80 80 0 0 1 180 100 Z" fill="#a5a5a5" />
                  <path d="M 100 100 L 180 100 A 80 80 0 0 1 180 120 Z" fill="#ffc000" />
                </svg>
              </div>
              <div className="md:col-span-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr className="text-center">
                        <th className="border border-gray-300 px-4 py-2">Ct값</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;20</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;25</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;30</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;35</th>
                        <th className="border border-gray-300 px-4 py-2">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">건수</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">분포</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRRSV(EU) 정량적 분포 */}
      <div className="mb-5">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-[#4472c4] text-white font-bold px-4 py-3">
            PRRSV(EU) 정량적 분포
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 flex justify-center items-center">
                {/* Pie Chart Placeholder */}
                <svg width="200" height="200" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="80" fill="#4472c4" />
                  <path d="M 100 100 L 100 20 A 80 80 0 0 1 164.7 64.7 Z" fill="#ed7d31" />
                  <path d="M 100 100 L 164.7 64.7 A 80 80 0 0 1 180 100 Z" fill="#a5a5a5" />
                  <path d="M 100 100 L 180 100 A 80 80 0 0 1 180 120 Z" fill="#ffc000" />
                </svg>
              </div>
              <div className="md:col-span-8">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr className="text-center">
                        <th className="border border-gray-300 px-4 py-2">Ct값</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;20</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;25</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;30</th>
                        <th className="border border-gray-300 px-4 py-2">&lt;35</th>
                        <th className="border border-gray-300 px-4 py-2">합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">건수</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                      <tr className="text-center">
                        <td className="border border-gray-300 px-4 py-2">분포</td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                        <td className="border border-gray-300 px-4 py-2"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
