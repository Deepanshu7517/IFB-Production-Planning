import  { useState } from 'react';

const DynamicUserTable = () => {
  // 1. Data Source
  const [users] = useState([
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
    { id: 1, name: "Supplier A", deliveryPerformance: 76,unit:"%", color: "Blue", initialRating: 4 },
  ]);
// setUsers([
//   ...users,

// ])
  return (
    <div className="overflow-x-auto overflow-y-scroll h-full border border-base-300 rounded-lg">
      <table className="table table-zebra h-full table-pin-rows">
        {/* Table Head */}
        <thead className="bg-base-200">
          <tr>
            <th>Sr. No.</th>
            <th>Name</th>
            <th>Delivery Performance</th>
            <th className="text-center">Rating</th> {/* New Column */}
          </tr>
        </thead>

        {/* Dynamic Rows */}
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id}>
              <th>{index + 1}</th>
              <td>{user.name}</td>
              <td>
                <span className="badge badge-ghost font-medium text-center">{user.deliveryPerformance + user.unit}</span>
              </td>
              <td>
                {/* daisyUI Rating Component */}
                <div className="rating rating-sm md:rating-md justify-center w-full">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <input
                      key={star}
                      type="radio"
                      name={`rating-${user.id}`} // Unique name per row
                      className="mask mask-star-2 bg-orange-400"
                      defaultChecked={star === user.initialRating}
                    />
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DynamicUserTable;