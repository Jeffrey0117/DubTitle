'use client';

import { useEffect, useState } from 'react';

interface APICallRecord {
  timestamp: number;
  api: string;
  tokensUsed: number;
  cost: number;
}

interface APIStats {
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  records: APICallRecord[];
}

export default function APIStatsPage() {
  const [stats, setStats] = useState<APIStats>({
    totalCalls: 0,
    totalTokens: 0,
    totalCost: 0,
    records: [],
  });

  const loadStats = () => {
    try {
      const data = localStorage.getItem('dubtitle_api_stats');
      if (data) {
        const parsedData = JSON.parse(data);
        setStats(parsedData);
      }
    } catch (error) {
      console.error('Failed to load API stats:', error);
    }
  };

  const clearStats = () => {
    if (confirm('Are you sure you want to clear all API statistics?')) {
      localStorage.removeItem('dubtitle_api_stats');
      setStats({
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        records: [],
      });
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const recentRecords = stats.records.slice(-20).reverse();

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">API Usage Statistics</h1>
          <div className="flex gap-4">
            <button
              onClick={loadStats}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={clearStats}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Clear Stats
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <div className="text-neutral-400 text-sm mb-2">Total API Calls</div>
            <div className="text-3xl font-bold">{stats.totalCalls.toLocaleString()}</div>
          </div>

          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <div className="text-neutral-400 text-sm mb-2">Total Tokens</div>
            <div className="text-3xl font-bold">{stats.totalTokens.toLocaleString()}</div>
          </div>

          <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
            <div className="text-neutral-400 text-sm mb-2">Estimated Cost</div>
            <div className="text-3xl font-bold">${stats.totalCost.toFixed(4)}</div>
          </div>
        </div>

        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <div className="p-6 border-b border-neutral-800">
            <h2 className="text-xl font-semibold">Recent API Calls (Last 20)</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    API
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Tokens Used
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                      No API calls recorded yet
                    </td>
                  </tr>
                ) : (
                  recentRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(record.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {record.api}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {record.tokensUsed.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        ${record.cost.toFixed(4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-neutral-500">
          Auto-refreshes every 5 seconds
        </div>
      </div>
    </div>
  );
}
