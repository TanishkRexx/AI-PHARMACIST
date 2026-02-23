import { useState } from "react"
import { motion } from "framer-motion"
import { UploadCloud } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function UploadPrescription() {

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleUpload = async () => {

    if (!file) {
      alert("Please select a file")
      return
    }

    const formData = new FormData()
    formData.append("prescription", file)

    try {
      setLoading(true)

      const res = await fetch(
        "http://localhost:5000/api/prescription/upload",
        {
          method: "POST",
          body: formData
        }
      )

      const data = await res.json()

      /* Save for current prescription page */
      localStorage.setItem(
        "currentPrescription",
        JSON.stringify(data)
      )

      alert("Prescription Uploaded & Extracted ✅")

      navigate("/patient/current-prescription")

    } catch (err) {
      console.log(err)
      alert("Upload failed ❌")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-10 min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-2xl shadow max-w-xl mx-auto text-center"
      >

        <UploadCloud size={60} className="mx-auto text-purple-600 mb-4" />

        <h2 className="text-xl font-semibold mb-3">
          Upload Prescription
        </h2>

        <p className="text-gray-500 mb-6">
          Upload doctor prescription to extract medicines automatically
        </p>

        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
          className="mb-4"
        />

        <button
          onClick={handleUpload}
          className="bg-purple-600 text-white px-6 py-2 rounded-xl"
        >
          {loading ? "Processing..." : "Upload"}
        </button>

      </motion.div>

    </div>
  )
}