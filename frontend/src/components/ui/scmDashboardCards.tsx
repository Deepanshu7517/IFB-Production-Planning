import { JobStatusCircle } from "./pieChart";
const SubMetricRow = ({ label, value, total, count, colorClass, bgClass }: any) => {
  // Calculate percentage for the width
  const percentage = (value / total) * 100;

  return (
    <div className="grid grid-cols-12 items-center gap-4">
      <span className="col-span-3 text-sm font-bold text-gray-500 tracking-tighter">
        {label}
      </span>

      {/* Custom Bar Container */}
      <div className={`col-span-6 h-2 ${bgClass} rounded-full overflow-hidden relative`}>
        {/* The "Progress" fill using your colorClass */}
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <span className="col-span-3 text-xs font-bold text-gray-700 text-right">
        {count} <span className="font-medium text-gray-400">Orders</span>
      </span>
    </div>
  );
};
const SCMDashboardCards = ({ cardsInfo }: { cardsInfo: any }) => {
  return (
    cardsInfo.map((item: any, index: any) => {
      const Icon = item.icon;
      return (
        <div key={index} className="card card-body border border-gray-400 rounded-md h-[23] w-full bg-white">
          <div className="card-title h-[50%]">
            <div className={` ${item.bgColor} rounded-lg flex items-center justify-center p-3`}>
              <Icon className={`size-8 ${item.color} `} />
            </div>
            <div className="">
              <h2 className="text-md text-gray-700">{item.title.toUpperCase()}</h2>
              <div className="text-4xl font-[400]">{item.measurement} {item.unit} {item.measurementText}</div>
            </div>
          </div>
          <div className="flex h-1/2">
            {item.title !== "pending prs" &&
              <>
                <div className="h-[100%] flex w-1/2  ">
                  <h3 className={`text-3xl font-bold ${item.title === "total shortages" ? "text-red-700" : ""}`}>{item.title === "order fulfilment" ? item.orderDelivered : item.title === "procurement progress" ? item.orderReceived : item.title === "total shortages" ? item.todayShortages + "+" + " Today" : ""}</h3>
                  <p className="ml-4 lg:text-2xl text-base">{item.title === "order fulfilment" ? "ORDER DELIVERED" : item.title === "procurement progress" ? "ORDER RECEIVED" : ""}</p>
                </div>
                <div className="h-[100%] flex w-1/2   ">
                  {item.title === "order fulfilment" &&
                    <JobStatusCircle value={item.chartValue} unit={item.unit} total={100} color={`${item.chartColor}`} label="Running" size="lg:h-36" classNames="-mt-14" />
                  }
                  {
                    item.title === "procurement progress" &&
                    <JobStatusCircle value={item.chartValue} unit={item.unit} total={100} color={`${item.chartColor}`} label="Running" size="lg:h-36" classNames="-mt-14" />
                  }
                </div>
              </>
            }
            {item.title === "pending prs" && (
              <div className="flex flex-col gap-3">
                {item.moreInfo.map((subItem: any, index: number) => (
                  <SubMetricRow
                    key={index}
                    label={subItem.name.toUpperCase()}
                    value={subItem.barValue}
                    total={subItem.totalbarValue}
                    count={subItem.barValue}
                    colorClass={subItem.color} // Fixed: Removed quotes and "item" prefix
                    bgClass={subItem.bgColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )
    })
  );
}

export default SCMDashboardCards;