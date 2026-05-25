import Select from "./select";
import { productionPlanningSelections } from "../../lib/data";

const Filter = () => {
  return (
    <section className="filters flex flex-wrap gap-4">
      <p className="font-bold text-xl">
        Filters :
      </p>
      <Select options={productionPlanningSelections.factory} />
      <Select options={productionPlanningSelections.department} />
      <Select options={productionPlanningSelections.machine} />
      <label className="flex items-center" htmlFor="fromDate">
        <span className="pr-2">

          From:
        </span>
        <input id="fromDate" type="datetime-local" className="input max-w-[180px]" />
      </label>
      <label className="flex items-center" htmlFor="toDate">
        <span className="pr-2">
          to:
        </span>
        <input id="toDate" type="datetime-local" className="input max-w-[180px]" />
      </label>

    </section>
  );
}

export default Filter;