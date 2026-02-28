import { Upload, FileText, Edit3, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from 'axios'

export default function UploadPrescription() {

  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [editing, setEditing] = useState(false);
  const [verified, setVerified] = useState(false);

const handleUpload = async (e) => {
  const selected = e.target.files[0];
  if (!selected) return;

  setFile(selected);

  const userString = localStorage.getItem("user");
  if (!userString) {
    console.error("No user found in localStorage");
    return;
  }

  const user = JSON.parse(userString);
  const user_id = user.id;

  try {
    const formData = new FormData();
    formData.append("file", selected);
    formData.append("user_id", user_id);  // ✅ This works now

    const response = await axios.post(
      "http://localhost:8000/api/customer/upload-prescription",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    console.log("Upload successful:", response.data);
  } catch (error) {
    console.error("Upload failed:", error);
  }
};

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Upload Prescription
        </h1>
        <p className="text-sm text-gray-500">
          Upload prescription and verify extracted medicines.
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-8 shadow-sm space-y-6">

        {/* Upload Section */}
        <div className="border-2 border-dashed rounded-xl p-10 text-center">

          <Upload className="mx-auto text-gray-400 mb-4" size={40} />

          <p className="text-gray-600 mb-2">
            Upload your doctor's prescription
          </p>

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleUpload}
            className="hidden"
            id="prescriptionUpload"
          />

          <label
            htmlFor="prescriptionUpload"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
          >
            Choose File
          </label>

        </div>

        {/* File Info */}
        {file && (
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <FileText className="text-blue-600" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}

        {/* Extracted Text Section */}
        {extractedText && (
          <div className="space-y-3">

            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">
                Extracted Medicines
              </h3>

              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 text-blue-600 text-sm"
              >
                <Edit3 size={16} />
                Edit
              </button>
            </div>

            {editing ? (
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm"
                rows="4"
              />
            ) : (
              <div className="bg-gray-50 border rounded-xl p-3 text-sm whitespace-pre-line">
                {extractedText}
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={() => setVerified(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              Verify Medicines
            </button>

          </div>
        )}

        {/* After verification */}
        {verified && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl">

            <p className="text-green-700 text-sm mb-3">
              Medicines verified successfully.
            </p>

            <button
              onClick={() => navigate("/customer/cart")}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ShoppingCart size={18} />
              Add to Cart
            </button>

          </div>
        )}

      </div>

    </div>
  );
}