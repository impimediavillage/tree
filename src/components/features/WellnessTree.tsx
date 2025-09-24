
import * as React from "react";

const advisors = [
  {
    name: "Aida",
    specialty: "Nutrition & Diet",
    imageUrl: "https://via.placeholder.com/150/92c950/FFFFFF?Text=Aida"
  },
  {
    name: "Cortex",
    specialty: "Mental Wellness",
    imageUrl: "https://via.placeholder.com/150/771796/FFFFFF?Text=Cortex"
  },
  {
    name: "Pulse",
    specialty: "Fitness & Exercise",
    imageUrl: "https://via.placeholder.com/150/24a3a8/FFFFFF?Text=Pulse"
  },
  {
    name: "Somnus",
    specialty: "Sleep Science",
    imageUrl: "https://via.placeholder.com/150/f9a8d4/FFFFFF?Text=Somnus"
  }
];

const WellnessTree = () => {
  return (
    <section id="ai-advisors" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-2 text-gray-800">
          Meet Your AI Wellness Advisors
        </h2>
        <h3 className="text-2xl mb-8 text-gray-600">
          Personalized guidance for your well-being journey.
        </h3>

        <div className="flex flex-wrap justify-center gap-8">
          {advisors.map((advisor) => (
            <div key={advisor.name} className="w-full sm:w-1/2 md:w-1/4 p-4">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <img
                  src={advisor.imageUrl}
                  alt={`AI Advisor ${advisor.name}`}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h4 className="text-xl font-bold mb-2">{advisor.name}</h4>
                  <p className="text-gray-700">{advisor.specialty}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { WellnessTree };
