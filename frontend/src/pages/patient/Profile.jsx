import { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Image,
} from "lucide-react"

export default function Profile() {

  /* ---------------- USER STATE ---------------- */

const storedUser =
  JSON.parse(localStorage.getItem("user"))

const [user, setUser] = useState({
  fullName:
    storedUser?.firstName +
      " " +
      storedUser?.lastName ||
    "",
  phone: storedUser?.phone || "",
  email: storedUser?.email || "",
  dob: storedUser?.dob || "",
})


  /* ---------------- PREFERENCES ---------------- */

  const [preferences, setPreferences] = useState({
    reminderTime: "09:00",
    language: "English",
    push: true,
    sms: false,
    emailReports: true,
  })

  const [saved, setSaved] = useState(false)

  /* ---------------- HANDLERS ---------------- */

  const handleUserChange = (e) => {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    })
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUser({
        ...user,
        profileImage: URL.createObjectURL(file),
      })
    }
  }

  const handlePrefChange = (key) => {
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    })
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-cyan-50 min-h-screen">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold text-gray-800">
          Profile
        </h1>
        <p className="text-gray-500">
          Manage your personal information and preferences.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">

        {/* ================= PERSONAL DETAILS ================= */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow border"
        >

          <h2 className="font-semibold text-lg mb-4">
            Personal Details
          </h2>

          {/* PROFILE HEADER */}
          <div className="flex items-center gap-4 mb-6">

            <div className="relative">
              <img
                src={
                  user.profileImage ||
                  "https://via.placeholder.com/100"
                }
                alt="profile"
                className="w-16 h-16 rounded-full object-cover border"
              />

              <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-1 rounded-full cursor-pointer">
                <Image size={14} />
                <input
                  type="file"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div>
              <p className="font-semibold">
                {user.fullName}
              </p>
              <p className="text-sm text-gray-500">
                {user.email}
              </p>
            </div>

          </div>

          {/* FORM */}
          <div className="grid grid-cols-2 gap-4">

            <InputField
              icon={<User size={16} />}
              label="Full Name"
              name="fullName"
              value={user.fullName}
              onChange={handleUserChange}
            />

            <InputField
              icon={<Phone size={16} />}
              label="Phone"
              name="phone"
              value={user.phone}
              onChange={handleUserChange}
            />

            <InputField
              icon={<Mail size={16} />}
              label="Email"
              name="email"
              value={user.email}
              onChange={handleUserChange}
            />

            <InputField
              icon={<Calendar size={16} />}
              label="Date of Birth"
              name="dob"
              type="date"
              value={user.dob}
              onChange={handleUserChange}
            />

            <InputField
              icon={<User size={16} />}
              label="Age"
              name="age"
              value={user.age}
              onChange={handleUserChange}
            />

            <InputField
              icon={<MapPin size={16} />}
              label="Address"
              name="address"
              value={user.address}
              onChange={handleUserChange}
            />

          </div>

          {/* NOTES */}
          <div className="mt-4">
            <label className="text-sm text-gray-500">
              Message / Notes
            </label>

            <textarea
              name="notes"
              value={user.notes}
              onChange={handleUserChange}
              rows="3"
              className="w-full border rounded-lg px-3 py-2 mt-1"
              placeholder="Write any medical notes..."
            />
          </div>

          {/* SAVE */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="mt-6 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow hover:shadow-lg transition"
          >
            Save Changes
          </motion.button>

          {saved && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-600 text-sm mt-2"
            >
              Profile updated successfully ✔
            </motion.p>
          )}

        </motion.div>

        {/* ================= PREFERENCES ================= */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-6 rounded-2xl shadow border"
        >

          <h2 className="font-semibold text-lg mb-4">
            Preferences
          </h2>

          {/* REMINDER TIME */}
          <div className="mb-4">
            <label className="text-sm text-gray-500">
              Reminder Time
            </label>

            <div className="flex items-center border rounded-lg px-3 py-2 mt-1">
              <Clock
                size={16}
                className="mr-2 text-gray-400"
              />

              <input
                type="time"
                value={preferences.reminderTime}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    reminderTime:
                      e.target.value,
                  })
                }
                className="outline-none w-full"
              />
            </div>
            <p className="text-gray-500 text-sm">
                Set your daily medicine reminder time.
             </p>
            
          </div>

          {/* LANGUAGE */}
          <div className="mb-4">
            <label className="text-sm text-gray-500">
              Language
            </label>

            <select
              value={preferences.language}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  language:
                    e.target.value,
                })
              }
              className="w-full border rounded-lg px-3 py-2 mt-1"
            >
              <option>English</option>
              <option>Hindi</option>
              <option>Marathi</option>
            </select>
          </div>

          {/* TOGGLES */}
          <Toggle
            label="Push Notifications"
            desc="Receive reminders on your device"
            value={preferences.push}
            onChange={() =>
              handlePrefChange("push")
            }
          />

          <Toggle
            label="SMS Notifications"
            desc="Get therapy reminders via SMS"
            value={preferences.sms}
            onChange={() =>
              handlePrefChange("sms")
            }
          />

          <Toggle
            label="Email Reports"
            desc="Weekly therapy reports"
            value={preferences.emailReports}
            onChange={() =>
              handlePrefChange(
                "emailReports"
              )
            }
          />

        </motion.div>

      </div>
    </div>
  )
}

/* ---------- INPUT FIELD ---------- */

function InputField({
  icon,
  label,
  name,
  value,
  onChange,
  type = "text",
}) {
  return (
    <div>
      <label className="text-sm text-gray-500">
        {label}
      </label>

      <div className="flex items-center border rounded-lg px-3 py-2 mt-1">
        <span className="mr-2 text-gray-400">
          {icon}
        </span>

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="outline-none w-full"
        />
      </div>
    </div>
  )
}

/* ---------- TOGGLE ---------- */

function Toggle({
  label,
  desc,
  value,
  onChange,
}) {
  return (
    <div className="flex justify-between items-center border rounded-xl p-3 mt-3">

      <div>
        <p className="font-medium text-sm">
          {label}
        </p>
        <p className="text-xs text-gray-500">
          {desc}
        </p>
      </div>

      {/* WORKING TOGGLE */}
      <div
        onClick={onChange}
        className={`w-12 h-6 rounded-full cursor-pointer transition-colors
        ${
          value
            ? "bg-green-500"
            : "bg-gray-300"
        }`}
      >
        <motion.div
          className="w-5 h-5 bg-white rounded-full shadow"
          animate={{
            x: value ? 24 : 2,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          style={{ marginTop: "2px" }}
        />
      </div>

    </div>
  )
}
