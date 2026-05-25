import TinyBarChart from "../../../../components/ui/barChart";
import DynamicUserTable from "./scmDataTable";

const ChartCombo = () => {
  return (
    <div className="h-[55vh] w-full lg:col-span-2 lg:row-span-2 p-2 rounded-md border border-gray-300 bg-white">
       <p className='text-2xl font-bold text-gray-600 text-start'>JOB STATUS</p>
       <hr className="text-gray-400" />
      <div className="h-[45%]">
        <TinyBarChart />
      </div>
      <div className="h-[45%]">
        <DynamicUserTable />
      </div>
    </div>
  );
}

export default ChartCombo;