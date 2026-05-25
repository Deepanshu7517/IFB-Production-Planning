import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Sample data for production schedule
const productionData = [
  { day: 'Mon (22-01)', produced: 1100, planned: 1070, target: 1520 },
  { day: 'Tue (22-01)', produced: 1050, planned: 1000, target: 1520 },
  { day: 'Wed (23-01)', produced: 1150, planned: 1120, target: 1520 },
  { day: 'Thu (22-01)', produced: 1350, planned: 1320, target: 1520 },
  { day: 'Fri (25-01)', produced: 920, planned: 1070, target: 1520 },
  { day: 'Sat (26-01)', produced: 1450, planned: 1420, target: 1520 },
  { day: 'Sd (26-01)', produced: 1150, planned: 1120, target: 1520 },
];

// Job data
const jobsData = [
  { jobNo: '#5721', machine: 'YPX 01', productName: 'Knob Assembly', plan: 1450, produced: 0, status: 'LENING' },
  { jobNo: '#5721', machine: 'YPD 05', productName: 'Valve Housing', plan: 1450, produced: 775, status: 'PLANNED' },
  { jobNo: '#5743', machine: 'YPX 03', productName: 'Pump Casing – Z', plan: 720, produced: 365, status: 'RUNNING' },
  { jobNo: '#5712', machine: 'YPD 12', productName: 'Latch Mechanism', plan: 1450, produced: 0, status: 'PLANNED' },
  { jobNo: '#5717', machine: 'YPB-04', productName: 'Gear Housing', plan: 1450, produced: 775, status: 'PLANNED' },
];

const ProductionDashboard = () => {
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
console.log(selectedBar);
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
          <p className="font-semibold">{payload[0].payload.day}</p>
          <p className="text-green-400">{payload[0].value} Produced</p>
          <p className="text-blue-400">{payload[0].payload.planned} Planned</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filters Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-semibold text-gray-700">Filters:</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select className="select select-bordered select-sm w-48 bg-white">
            <option>🏭 Factory A</option>
            <option>Factory B</option>
            <option>Factory C</option>
          </select>
          
          <select className="select select-bordered select-sm w-48 bg-white">
            <option>YPD Department</option>
            <option>YPX Department</option>
            <option>YPB Department</option>
          </select>
          
          <select className="select select-bordered select-sm w-48 bg-white">
            <option>All Machines</option>
            <option>YPX 01</option>
            <option>YPD 05</option>
          </select>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm">
            <span>📅</span>
            <span>22-01-2026 to 26-01-2026</span>
          </div>

          <button className="btn btn-circle btn-sm btn-ghost">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button className="btn btn-circle btn-sm btn-ghost relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">PLAN</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">5,240</div>
          <div className="text-xs text-gray-500">Units</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">PRODUCED</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">4,720</div>
          <div className="text-xs text-gray-500">Units</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">AVG CYCLE TIME</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">255.84</div>
          <div className="text-xs text-gray-500">sec</div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-red-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">REJECTIONS</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">280</div>
          <div className="text-xs text-gray-500">Units</div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 font-medium">UTILIZATION</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">80.26%</div>
          <div className="text-xs text-green-600">+0.87%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Schedule Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">PRODUCTION SCHEDULE</h2>
          </div>
          
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <span className="text-gray-600">Produced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <span className="text-gray-600">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 border-t-2 border-gray-400"></div>
              <span className="text-gray-600">Target</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={productionData}
              onMouseMove={(state) => {
                if (state.isTooltipActive) {
                  setSelectedBar(state.activeTooltipIndex ?? null as any);
                } else {
                  setSelectedBar(null);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Planned bars */}
              <Bar dataKey="planned" fill="#93c5fd" radius={[4, 4, 0, 0]} />
              
              {/* Produced bars */}
              <Bar dataKey="produced" fill="#86efac" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 text-sm text-gray-600">
            FACTORY UTILIZATION: <span className="font-semibold">78%</span>
          </div>
        </div>

        {/* Job Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">JOB STATUS</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle cx="40" cy="40" r="36" stroke="#86efac" strokeWidth="8" fill="none"
                    strokeDasharray={`${(7/14) * 226} 226`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">7</span>
                </div>
              </div>
              <div className="text-xs text-gray-600">Jobs</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-500">RUNNING</span>
              </div>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle cx="40" cy="40" r="36" stroke="#fbbf24" strokeWidth="8" fill="none"
                    strokeDasharray={`${(3/14) * 226} 226`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">3</span>
                </div>
              </div>
              <div className="text-xs text-gray-600">Jobs</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs text-gray-500">IDLE</span>
              </div>
            </div>

            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-2">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                  <circle cx="40" cy="40" r="36" stroke="#93c5fd" strokeWidth="8" fill="none"
                    strokeDasharray={`${(4/14) * 226} 226`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">4</span>
                </div>
              </div>
              <div className="text-xs text-gray-600">Jobs</div>
              <div className="flex items-center justify-center gap-1 mt-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-gray-500">PLANNED</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold text-gray-800 mb-4">KEY METRICS</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle cx="40" cy="40" r="36" stroke="#86efac" strokeWidth="8" fill="none"
                      strokeDasharray={`${0.9 * 226} 226`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">90.08%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">PLAN ATTAINMENT</div>
              </div>

              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle cx="40" cy="40" r="36" stroke="#fca5a5" strokeWidth="8" fill="none"
                      strokeDasharray={`${0.053 * 226} 226`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">5.34%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">REJECTION RATE</div>
              </div>

              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-2">
                  <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                    <circle cx="40" cy="40" r="36" stroke="#fbbf24" strokeWidth="8" fill="none"
                      strokeDasharray={`${0.8 * 226} 226`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">80.26%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-600">OVERALL OEE</div>
              </div>
            </div>

            <button className="btn btn-outline btn-sm w-full mt-4">
              GO TO OEE DASHBOARD
            </button>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            FACTORY UTILIZATION: <span className="font-semibold">78%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-gray-600 font-semibold">JOB NO.</th>
                <th className="text-gray-600 font-semibold">MACHINE</th>
                <th className="text-gray-600 font-semibold">PRODUCT NAME</th>
                <th className="text-gray-600 font-semibold">PLAN (UNITS)</th>
                <th className="text-gray-600 font-semibold">PRODUCED (UNITS)</th>
                <th className="text-gray-600 font-semibold">STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {jobsData.map((job, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="font-medium">{job.jobNo}</td>
                  <td>{job.machine}</td>
                  <td>{job.productName}</td>
                  <td>{job.plan}</td>
                  <td>{job.produced}</td>
                  <td>
                    <span className={`badge badge-sm ${
                      job.status === 'RUNNING' ? 'badge-success' : 
                      job.status === 'PLANNED' ? 'badge-info' : 
                      'badge-warning'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-xs btn-ghost">VIEW</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionDashboard;