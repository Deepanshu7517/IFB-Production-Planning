// import { RiCheckboxBlankCircleFill } from 'react-icons/ri';
import { PieChart, Pie, Label, ResponsiveContainer, Cell } from 'recharts';
// const data = [
//   { name: 'Group A', value: 1000, fill: '#0088FE' },
//   { name: 'Group B', value: 50, fill: '#00C49F' },
// ];
// const MyPie = () => (
//   <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%" innerRadius="60%" isAnimationActive={false} />
// );
const totalMachines = 100
const JobStatusCircle = ({ value, total, color, label }: { value: number, total: number, color: string, label: string }) => {
  console.log(label);
  const chartData = [
    { name: 'Active', value: value },
    { name: 'Remaining', value: Math.max(0, total - value) },
  ];
  return (
    <div className="h-32 w-full relative">
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
              value={value}
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
export default function KeyMetrices() {
  return (
    <div className="min-h-[28vh]">
      <p className='text-2xl font-bold text-gray-600 text-start'>KEY METRICES</p>
      <hr className='text-gray-400' />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          padding: '10px',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          height: "75%"
        }
        }
        className=""
      >
        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <JobStatusCircle value={50} total={totalMachines} color="#90B58E" label="Running" />
            <span className='text-base'>Plan Attainment</span>
          </div>
        </div>
        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <JobStatusCircle value={50} total={totalMachines} color="#D9938B" label="Running" />
            <span className='text-base'>REJECTION RATE</span>
          </div>
        </div>

        <div className="card w-1/3 card-xs h-full justify-center items-center ">
          <div className="card-body flex justify-center items-center">
            <JobStatusCircle value={50} total={totalMachines} color="#D9938B" label="Running" />
            <span className='text-base'>REJECTION RATE</span>
          </div>
        </div>
        {/* <div className="h-full w-1/3">
          <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
        </div>
        <div className="h-full w-1/3">
          <JobStatusCircle value={50} total={totalMachines} color="#22c55e" label="Running" />
        </div> */}
      </div>
      <button className='w-full bg-gray-200 border border-gray-300'>OEE DASHBOARD</button>
    </div>
  )
}