import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,  Cell } from 'recharts';
import { RechartsDevtools } from '@recharts/devtools';

// #region Sample data
const data = [
  { name: 'Supplier A', supply: 2400, amt: 2400 },
  { name: 'Supplier B', supply: 2050, amt: 2400 },
  { name: 'Supplier C', supply: 1650, amt: 2400 },
  { name: 'Supplier D', supply: 1450, amt: 2400 },
  { name: 'Supplier E', supply: 1150, amt: 2400 },
  { name: 'Supplier F', supply: 850, amt: 2400 },
  { name: 'Supplier G', supply: 550, amt: 2400 },
];
// #endregion

const SimpleBarChart = () => {
  return (
    <BarChart
      style={{ width: '100%', height: '100%', aspectRatio: 1.618 }}
      responsive
      data={data}
      margin={{
        top: 5,
        right: 0,
        left: 0,
        bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis width="auto" />
      <Tooltip />
      {/* <Legend /> */}
      <Bar 
        dataKey="supply" 
        activeBar={{ fill: 'pink', stroke: 'red' }} 
        radius={[10, 10, 0, 0]}
      >
        {/* Logic: Map through data to apply conditional fill colors */}
        {data.map((entry, index) => (
          <Cell 
            key={`cell-${index}`} 
            fill={entry.supply > 2000 ? '#22c55e' : entry.supply > 1000 ? '#eab308' : '#ef4444'} 
          />
        ))}
      </Bar>
      <RechartsDevtools />
    </BarChart>
  );
};

export default SimpleBarChart;