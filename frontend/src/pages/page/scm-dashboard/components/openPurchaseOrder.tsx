// import React from 'react';

const OpenPurchaseOrder = () => {
  const data = [
    { label: "DELAYED", count: 34, color: "bg-red-500", lightColor: "bg-red-100" },
    { label: "ON-GOING", count: 76, color: "bg-yellow-500", lightColor: "bg-yellow-100" },
    { label: "ARRIVING SOON", count: 28, color: "bg-emerald-400", lightColor: "bg-emerald-100" },
  ];

  const total = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="h-[27vh] w-full lg:col-span-1 lg:row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
      {/* Title Section */}
      <h2 className="text-gray-700 font-bold text-sm uppercase tracking-wide">
        Open Purchase Orders (POs)
      </h2>

      {/* Status & Mini Indicator Row */}
      <div className="flex items-center gap-4 mt-2">
        <span className="text-gray-400 text-[10px] font-bold uppercase">Status</span>
        <div className="flex gap-1">
          {/* Replicating the small block pattern in the image */}
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => <div key={i} className="w-3 h-1.5 bg-red-400 rounded-sm opacity-60" />)}
          </div>
          <div className="flex gap-0.5">
            {[...Array(3)].map((_, i) => <div key={i} className="w-3 h-1.5 bg-yellow-400 rounded-sm opacity-60" />)}
          </div>
          <div className="flex gap-0.5">
            {[...Array(1)].map((_, i) => <div key={i} className="w-3 h-1.5 bg-emerald-300 rounded-sm opacity-60" />)}
          </div>
        </div>
      </div>

      {/* Main Multi-Colored Progress Bar */}
      <div className="w-full h-2 flex rounded-full overflow-hidden my-2 bg-gray-100">
        {data.map((item, idx) => (
          <div 
            key={idx} 
            style={{ width: `${(item.count / total) * 100}%` }} 
            className={`${item.color} h-full opacity-80`}
          />
        ))}
      </div>

      {/* Order Rows */}
      <div className="flex flex-col gap-1 overflow-hidden">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-sm ${item.lightColor}`} />
                <span className="text-[10px] font-bold text-gray-500">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-gray-700">
                {item.count} <span className="text-gray-400 font-medium">Orders</span>
              </span>
            </div>
            {index < data.length - 1 && <div className="border-t border-gray-50 w-full" />}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OpenPurchaseOrder;