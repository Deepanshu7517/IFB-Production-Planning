// import React from 'react';
import { AlertTriangle } from 'lucide-react'; // Ensure lucide-react is installed

const MaterialShortagesTable = () => {
  // Data derived from the provided image
  const shortagesData = [
    { id: 1, letter: "I", letterColor: "text-red-500 bg-red-100", iconColor: "text-red-500", item: "Gear Assembly", partNo: "FK-6201", shortage: 275, supplier: "Supplier A", rating: 4 },
    { id: 2, letter: "A", letterColor: "text-amber-500 bg-amber-100", iconColor: "text-amber-500", item: "Electrical Connect", partNo: "FK:817", shortage: 275, supplier: "Supplier B", rating: 3 },
    { id: 3, letter: "A", letterColor: "text-amber-500 bg-amber-100", iconColor: "text-red-500", item: "Bail Bearing", partNo: "FK-762", shortage: 275, supplier: "Supplier A", rating: 5 },
    { id: 4, letter: "I", letterColor: "text-amber-500 bg-amber-100", iconColor: "text-amber-500", item: "Plastic Housing", partNo: "Supplier C/B", shortage: 815, supplier: "Supplier C", rating: 2 },
    { id: 5, letter: "I", letterColor: "text-red-500 bg-red-100", iconColor: "text-red-500", item: "Servo Motor", partNo: "Supplier D", shortage: 270, supplier: "Supplier D", rating: 4 },
    { id: 6, letter: "I", letterColor: "text-red-500 bg-red-100", iconColor: "text-amber-500", item: "Rubber Gasket", partNo: "MT-4211", shortage: 275, supplier: "Supplier D", rating: 3 },
    { id: 7, letter: "I", letterColor: "text-emerald-500 bg-emerald-100", iconColor: "text-emerald-500", item: "Cable Harness", partNo: "MT-4211", shortage: 275, supplier: "Supplier D", rating: 5 },
  ];

  return (
    <div className="h-[55vh] w-full lg:col-span-2 lg:row-span-2 bg-white rounded-lg shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-4">
        <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide">Material Shortages</h2>
        <hr className='text-gray-400' />
      </div>
      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto flex-grow px-4">
        <table className="table table-zebra table-pin-rows">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase">
              <th>Info</th>
              <th>Item</th>
              <th>Part Number</th>
              <th>Shortage</th>
              <th>Supplier</th>
              <th className="text-center">Rating</th>
            </tr>
          </thead>
          <tbody>
            {shortagesData.map((row) => (
              <tr key={row.id} className="text-gray-600 text-sm">
                <td>
                  <div className="flex items-center gap-2">
                    {/* Circular Letter Icon */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${row.letterColor}`}>
                      {row.letter}
                    </div>
                    {/* Warning Triangle */}
                    <AlertTriangle className={`w-4 h-4 ${row.iconColor}`} />
                  </div>
                </td>
                <td className="font-medium text-gray-700">{row.item}</td>
                <td className="text-gray-500">{row.partNo}</td>
                <td className="font-semibold text-gray-800">{row.shortage}</td>
                <td>{row.supplier}</td>
                <td>
                  {/* daisyUI Star Rating */}
                  <div className="rating rating-xs justify-center w-full">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <input
                        key={star}
                        type="radio"
                        name={`rating-shortage-${row.id}`}
                        className="mask mask-star-2 bg-orange-400"
                        defaultChecked={star === row.rating}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Action */}
      <div className="p-3 flex justify-end">
        <button className="btn btn-sm btn-ghost text-gray-400 font-bold border-gray-200">
          View All
        </button>
      </div>
    </div>
  );
};

export default MaterialShortagesTable;