export default function DashboardHeader() {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white p-8 rounded-2xl shadow-lg">
      <p className="text-sm opacity-80">Good morning,</p>
      <h1 className="text-2xl font-bold mt-1">
        MedPlus Pharmacy
      </h1>
      <p className="mt-2 opacity-90 text-sm">
        3 prescriptions awaiting validation · 2 critical stock alerts
      </p>
    </div>
  )
}