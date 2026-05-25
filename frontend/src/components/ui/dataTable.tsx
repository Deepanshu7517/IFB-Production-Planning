import { tableData } from "../../lib/data";

const DataTable = () => {
  return (
    <div className="overflow-x-auto max-h-[28vh] w-full lg:col-span-8 col-span-1 border border-gray-300 rounded-md">
      <table className="table table-base table-pin-rows table-pin-cols">

        {/* HEADER */}
        <thead className="font-bold">
          <tr>
            <td className="font-extrabold">Job No.</td>
            <td>Machine</td>
            <td>Product Name</td>
            <td>PLAN {'(UNITS)'}</td>
            <td>PRODUCED {"(Units)"}</td>
            <td>STATUS</td>
            </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {tableData.map((item) => (
            <tr key={item.id}>

              {/* PINNED FIRST COLUMN */}
              

              <td className="font-extrabold">{item.jobNo}</td>
              <td>{item.machine}</td>
              <td>{item.productName}</td>
              <td>{item.planUnits}</td>
              <td>{item.producedUnits}</td>
              <td>{item.status}</td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
};

export default DataTable;
