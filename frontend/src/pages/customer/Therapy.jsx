import { useEffect, useState } from "react";
import { Activity, Pill, Calendar } from "lucide-react";
import axios from "axios"; // ✅ Fix 1: was missing
import api from "../../api/axios"

/* ------------------ THERAPY DATA ------------------ */

const therapyData = [
  {
    id: 1,
    dosage: "1 tablet",
    frequency: "Once daily",
    time: "Morning",
    meal: "After Meal",
    totalDoses: 30,
    remainingDoses: 12,
  },
  {
    id: 2,
    dosage: "1 tablet",
    frequency: "Twice daily",
    time: "Afternoon",
    meal: "After Meal",
    totalDoses: 60,
    remainingDoses: 24,
  },
  {
    id: 3,
    dosage: "1 tablet",
    frequency: "Once daily",
    time: "Night",
    meal: "Before Meal",
    totalDoses: 30,
    remainingDoses: 12,
  },
  {
    id: 4,
    dosage: "1 tablet",
    frequency: "Once daily",
    time: "Night",
    meal: "Before Meal",
    totalDoses: 30,
    remainingDoses: 12,
  },
];

/* ------------------ MAIN COMPONENT ------------------ */

export default function Therapy() {
  /* -------- DAYS DATA -------- */

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true); // ✅ Fix 2: was missing

  const [days, setDays] = useState([
    {
      day: "Day 1",
      date: "2026-02-10",
      meds: therapyData.map((med) => ({
        ...med,
        taken: true,
      })),
    },
    {
      day: "Day 2",
      date: "2026-02-11",
      meds: therapyData.map((med, i) => ({
        ...med,
        taken: i !== 1,
      })),
    },
    {
      day: "Day 3",
      date: "2026-02-12",
      meds: therapyData.map((med, i) => ({
        ...med,
        taken: i === 2,
      })),
    },
  ]);

  const [selectedDay, setSelectedDay] = useState(0);
  const [medicines, setMeds] = useState(null);

  /* -------- CALCULATIONS -------- */

  const totalDoses = days.reduce(
    (acc, d) => acc + d.meds.length,
    0
  );

  const takenDoses = days.reduce(
    (acc, d) =>
      acc + d.meds.filter((m) => m.taken).length,
    0
  );

  const adherence = Math.round(
    (takenDoses / totalDoses) * 100
  );

  useEffect(() => {
    const handleGetPrescription = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const response = await api.get("/customer/show-prescription",
          { params: { patient_id: user?.id } }
        );
        setPrescription(response.data);
        setMeds(response.data.medicine_info); // ✅ Fix 3: was using stale `prescription` state
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    handleGetPrescription();
  }, []); // ✅ Fix 4: empty array stops infinite loop

  /* -------- TOGGLE -------- */

  const toggleMedicine = (medIndex) => {
    const updated = [...days];
    updated[selectedDay].meds[medIndex].taken =
      !updated[selectedDay].meds[medIndex].taken;
    setDays(updated);
  };

  const currentDay = days[selectedDay];

  /* ------------------ UI ------------------ */

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">

      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Therapy Tracker 💊
        </h1>
        <p className="text-gray-500">
          Monitor daily medicine adherence professionally.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        <StatCard
          icon={<Activity />}
          title="Overall Adherence"
          value={`${adherence}%`}
          gradient="from-blue-500 to-cyan-500"
        />

        <StatCard
          icon={<Pill />}
          title="Doses Taken"
          value={`${takenDoses}/${totalDoses}`}
          gradient="from-emerald-500 to-green-500"
        />

        <StatCard
          icon={<Calendar />}
          title="Therapy Duration"
          value={`${days.length} Days`}
          gradient="from-purple-500 to-pink-500"
        />

      </div>

      {/* PROGRESS */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">

        <div className="flex justify-between mb-2 font-medium">
          <span>Total Therapy Progress</span>
          <span>{adherence}%</span>
        </div>

        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${adherence}%` }}
          />
        </div>

      </div>

      {/* DAY TABS */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">

        <div className="flex gap-4 flex-wrap">

          {days.map((d, i) => {

            const taken = d.meds.filter(m => m.taken).length;
            const total = d.meds.length;

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(i)}
                className={`w-24 h-20 rounded-xl border flex flex-col items-center justify-center text-sm font-medium shadow transition

                ${
                  selectedDay === i
                    ? "bg-blue-600 text-white border-blue-600"
                    : taken === total
                    ? "bg-green-50 border-green-400 text-gray-800"
                    : "bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{d.day}</span>

                <span className="text-xs mt-1 font-semibold">
                  {taken}/{total}
                </span>
              </button>
            );

          })}

        </div>

      </div>

      {/* MEDICINES */}
      <div className="bg-white p-6 rounded-2xl shadow">

        <div className="flex justify-between mb-6">

          <div>
            <h3 className="font-semibold text-lg">
              {currentDay.day}
            </h3>
            <p className="text-sm text-gray-500">
              {currentDay.date}
            </p>
          </div>

          <span className="text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-full font-medium">
            {
              currentDay.meds.filter((m) => m.taken).length
            }/{currentDay.meds.length} taken
          </span>

        </div>

        <div className="space-y-4">

          {currentDay.meds.map((med, i) => (

            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-xl border transition

              ${
                med.taken
                  ? "bg-green-50 border-green-300"
                  : "bg-red-50 border-red-300"
              }`}
            >

              {/* LEFT */}
              <div className="flex items-start gap-4">

                <input
                  type="checkbox"
                  checked={med.taken}
                  onChange={() => toggleMedicine(i)}
                  className="w-5 h-5 mt-1 accent-green-600 cursor-pointer"
                />

                <div>

                  <p className="font-medium text-gray-800">
                    {medicines?.[i]?.medicine_name ?? therapyData[i]?.id} {/* ✅ Fix 5: was [i+1], now [i]. Also safe fallback while loading */}
                  </p>

                  <div className="flex gap-3 mt-1 text-xs">

                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      🕒 {med.time}
                    </span>

                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      🍽 {med.meal}
                    </span>

                  </div>

                </div>

              </div>

              {/* STATUS */}
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold

                ${
                  med.taken
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                }`}
              >
                {med.taken ? "Taken" : "Missed"}
              </span>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
}

/* ------------------ STAT CARD ------------------ */

function StatCard({ icon, title, value, gradient }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow flex items-center gap-4 hover:shadow-lg transition">

      <div className={`p-3 rounded-xl text-white bg-gradient-to-r ${gradient}`}>
        {icon}
      </div>

      <div>
        <p className="text-sm text-gray-500">
          {title}
        </p>
        <p className="text-xl font-bold text-gray-800">
          {value}
        </p>
      </div>

    </div>
  );
}