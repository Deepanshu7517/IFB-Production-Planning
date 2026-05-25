// import TinyBarChart from "../../../components/ui/barChart";
import Filter from "../../../components/ui/filters";
import SCMDashboardCards from "../../../components/ui/scmDashboardCards";
import { scmDashboardCardsInfo } from "../../../lib/data";
import ChartCombo from "./components/chartCombo";
import MaterialShortagesTable from "./components/materialShortagesTable";
import OpenPurchaseOrder from "./components/openPurchaseOrder";
import PendingRequistion from "./components/pendingRequistion";

const SCMDashboard = () => {
  return (
    <div className="scm-dashboard ">
      <Filter />
      <section className="grid w-full mt-3 gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-2  xl:grid-cols-4">
        <SCMDashboardCards cardsInfo={scmDashboardCardsInfo} />
      </section>
      <section className="grid w-full mt-3 gap-2 grid-cols-1  md:grid-cols-4 lg:grid-cols-5 xl:grid-row-2 ">
        <ChartCombo />
        <MaterialShortagesTable />
        <OpenPurchaseOrder />
      <PendingRequistion />

      </section>

    </div>
  );
}

export default SCMDashboard;