// import React from 'react';
import { ChevronRight } from 'lucide-react';

const PendingRequistion = () => {
  // Data mapped from the reference image
  const requisitionData = [
    { partNumber: "FK-9201", plant: "Plant B", qty: 100, status: "PENDING" },
    { partNumber: "SV-3344", plant: "Plant C", qty: 80, status: "PENDING" },
    { partNumber: "L6-6792", plant: "Plant A", qty: 45, status: "PENDING" },
  ];

  return (
    <div className="h-[27vh] w-full lg:col-span-1 lg:row-span-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col p-4">
      {/* Component Title */}
      <h2 className="text-gray-700 font-bold text-sm uppercase tracking-wide mb-2">
        Pending Requisitions
      </h2>

      {/* Table Section */}
      <div className="flex-grow overflow-x-auto">
        <table className="table table-xs table-zebra w-full text-[10px]">
          <thead>
            <tr className="text-gray-400 uppercase border-none">
              <th className="font-semibold p-1">Part Number</th>
              <th className="font-semibold p-1">Plant</th>
              <th className="font-semibold p-1 text-center">Reoured Qty:</th>
              <th className="font-semibold p-1 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 font-medium">
            {requisitionData.map((item, index) => (
              <tr key={index} className="border-none">
                <td className="p-1">{item.partNumber}</td>
                <td className="p-1">{item.plant}</td>
                <td className="p-1 text-center font-bold text-gray-800">{item.qty}</td>
                <td className="p-1 text-right">
                  <span className="badge badge-sm rounded-md bg-gray-200 text-gray-500 border-none text-[8px] font-bold py-0 h-4">
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center border border-gray-200 rounded p-0.5 px-2 bg-white">
           <ChevronRight size={12} className="text-gray-400 mr-1" />
           <span className="text-[10px] font-bold text-gray-500">6</span>
        </div>
        <button className="btn btn-xs rounded-md bg-sky-500 hover:bg-sky-600 text-white border-none text-[10px] font-bold px-4 h-7 min-h-0">
          CREATE PO
        </button>
      </div>
    </div>
  );
};

export default PendingRequistion;