import { CiCircleCheck } from 'react-icons/ci';
import { RiCheckboxBlankCircleFill } from 'react-icons/ri';
import { PieChart, Pie, Label, ResponsiveContainer, Cell } from 'recharts';
// const data = [
//   { name: 'Group A', value: 1000, fill: '#0088FE' },
//   { name: 'Group B', value: 50, fill: '#00C49F' },
// ];
// const MyPie = () => (
//   <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%" innerRadius="60%" isAnimationActive={false} />
// );
const totalMachines = 100
export const JobStatusCircle = ({ value, total, color, label, classNames, size, unit }: { value: number, total: number, color: string, label: string, classNames?: string, size?: string, unit?: string }) => {
  console.log(label);
  const chartData = [
    { name: 'Active', value: value },
    { name: 'Remaining', value: Math.max(0, total - value) },
  ];
  return (
    <div className={`${size ? size : "h-32"} w-full relative ${classNames} `}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="90%"
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
            // LOGIC FIX: Disable sorting to ensure the 'Active' slice 
            // always starts at the 90-degree (top) position
            isAnimationActive={true}
          >
            <Cell key="cell-active" fill={color} />
            <Cell key="cell-bg" fill="#d4d4d4" />

            <Label
              value={unit ? value + unit : value}
              position="center"
              fill="#334155"
              style={{ fontSize: '24px', fontWeight: 'bold' }}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * This example shows how to use the `responsive` prop on charts inside a flexbox container.
 * The `responsive` prop makes the chart automatically resize to fit its parent container.
 * By combining it with flexbox properties and CSS like `maxWidth` or `aspectRatio`,
 * you can create complex and responsive chart layouts.
*/
export default function PieChartInFlexbox() {
  return (
    <div className="min-h-[28vh]">
      <p className='text-2xl font-bold text-gray-600 text-start'>JOB STATUS</p>
      <hr className='text-gray-400' />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          padding: '10px',
          justifyContent: 'space-around',
          alignItems: 'center',
          height: "100%",
        }
        }
        className=""
      >
        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <h2 className='card-title text-lg font-bold text-gray-700'>Running</h2>
            <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
            <span className='text-base'>Jobs</span>
            <div className="justify-center">
              <div className={`badge badge-soft badge-success sm:badge-xl badge-base`}><RiCheckboxBlankCircleFill /> Primary</div>
            </div>
          </div>
        </div>
        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <h2 className='card-title text-lg font-bold text-gray-700'>IDLE</h2>
            <JobStatusCircle value={50} total={totalMachines} color="#F3DBA9" label="Running" />
            <span className='text-base'>Jobs</span>
            <div className="justify-center">
              <div className="badge badge-soft badge-success sm:badge-xl badge-base"><CiCircleCheck /> Planned</div>
            </div>
          </div>
        </div>
        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <h2 className='card-title text-lg font-bold text-gray-700'>Running</h2>
            <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
            <span className='text-base'>Jobs</span>
            <div className="justify-center">
              <div className="badge badge-soft badge-success sm:badge-xl badge-base"><RiCheckboxBlankCircleFill /> Primary</div>
            </div>
          </div>
        </div>
        {/* <div className="h-full w-1/3">
          <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
        </div>
        <div className="h-full w-1/3">
          <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
        </div> */}
      </div>
    </div>
  )
}