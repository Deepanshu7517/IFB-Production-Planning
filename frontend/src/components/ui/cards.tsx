import { productionPlanningCardsData } from "../../lib/data";

const Cards = () => {
  return (
    <section className="cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pt-2">
      {productionPlanningCardsData.map((card, index) => {
        // Assign the icon to a Capitalized variable
        const Icon = card.icon;

        return (
          <div key={index} className={`${card.bgColor + " " + card.borderColor} rounded-lg p-4 border  flex items-center`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`${card.iconBgColor} w-10 h-10  rounded-lg flex items-center justify-center`}>
                <Icon className={`${card.iconColor} size-7`} />
              </div>
            </div>
            <div className="ml-5">
              <span className="text-xl text-gray-600 font-medium card-title">{card.title.toUpperCase()}</span>
              <div className="text-3xl font-bold text-gray-800">{card.measure} <span className="text-lg text-gray-500">{card.unit}</span></div>
            </div>
          </div>
        )
      })}
    </section>
  );
}

export default Cards;