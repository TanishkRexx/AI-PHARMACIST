import { Upload, FileText, Edit3, ShoppingCart, CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';

export default function UploadPrescription() {

  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [editing, setEditing] = useState(false);
  const [verified, setVerified] = useState(false);

  // ── Upload status state ──────────────────────────
  // null | "uploading" | "success" | "error"
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);   // success response data
  const [uploadError, setUploadError] = useState(null);     // error detail string

  // ── Handle Upload ────────────────────────────────
  const handleUpload = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setUploadStatus("uploading");
    setUploadResult(null);
    setUploadError(null);

    const userString = localStorage.getItem("user");
    if (!userString) {
      setUploadStatus("error");
      setUploadError("No user session found. Please log in again.");
      return;
    }

    const user = JSON.parse(userString);
    const patient_id = user.id;

    try {
      const formData = new FormData();
      formData.append("patient_id", patient_id);
      formData.append("file", selected);

      const response = await axios.post(
        "http://localhost:8000/api/customer/upload-prescription",
        formData
      );

      // Backend returns: { message, prescription_id, data }
      setUploadResult(response.data);
      setUploadStatus("success");

      // If backend returned extracted text, populate it
      if (response.data?.data?.extracted_text) {
        setExtractedText(response.data.data.extracted_text);
      }

    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus("error");

      // Try to surface a meaningful error from backend
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong. Please try again.";

      setUploadError(detail);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Upload Prescription</h1>
        <p className="text-sm text-gray-500">
          Upload your prescription and verify extracted medicines.
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-8 shadow-sm space-y-6">

        {/* ── Upload dropzone ── */}
        <div className={`border-2 border-dashed rounded-xl p-10 text-center transition
          ${uploadStatus === "success" ? "border-green-300 bg-green-50"
          : uploadStatus === "error" ? "border-red-300 bg-red-50"
          : "border-gray-300"}`}
        >
          {uploadStatus === "uploading" ? (
            <Loader className="mx-auto text-blue-500 mb-4 animate-spin" size={40} />
          ) : uploadStatus === "success" ? (
            <CheckCircle className="mx-auto text-green-500 mb-4" size={40} />
          ) : uploadStatus === "error" ? (
            <XCircle className="mx-auto text-red-500 mb-4" size={40} />
          ) : (
            <Upload className="mx-auto text-gray-400 mb-4" size={40} />
          )}

          <p className="text-gray-600 mb-2">
            {uploadStatus === "uploading"
              ? "Processing your prescription..."
              : uploadStatus === "success"
              ? "Prescription processed successfully!"
              : uploadStatus === "error"
              ? "Upload failed. You can try again."
              : "Upload your doctor's prescription"}
          </p>

          {/* Hide file picker while uploading */}
          {uploadStatus !== "uploading" && (
            <>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleUpload}
                className="hidden"
                id="prescriptionUpload"
              />
              <label
                htmlFor="prescriptionUpload"
                className={`inline-block px-4 py-2 rounded-lg cursor-pointer text-white transition
                  ${uploadStatus === "error"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {uploadStatus === "error" ? "Try Again" : uploadStatus === "success" ? "Upload Another" : "Choose File"}
              </label>
            </>
          )}
        </div>

        {/* ── File name tag ── */}
        {file && (
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <FileText className="text-blue-600 flex-shrink-0" />
            <span className="text-sm truncate">{file.name}</span>
            {/* Status badge */}
            {uploadStatus === "uploading" && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                Processing...
              </span>
            )}
            {uploadStatus === "success" && (
              <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                ✓ Completed
              </span>
            )}
            {uploadStatus === "error" && (
              <span className="ml-auto text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                ✗ Failed
              </span>
            )}
          </div>
        )}

        {/* ── SUCCESS RESULT CARD ── */}
        <AnimatePresence>
          {uploadStatus === "success" && uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle size={18} />
                {uploadResult.message || "Prescription processed successfully"}
              </div>

              {uploadResult.prescription_id && (
                <p className="text-sm text-gray-600">
                  Prescription ID:{" "}
                  <span className="font-mono text-xs bg-green-100 px-2 py-0.5 rounded">
                    {uploadResult.prescription_id}
                  </span>
                </p>
              )}

              {/* Show any extra data fields from result */}
              {uploadResult.data && Object.keys(uploadResult.data).length > 0 && (
                <div className="mt-2 text-xs text-gray-500 bg-white border rounded-lg p-3 space-y-1">
                  {Object.entries(uploadResult.data).map(([key, val]) =>
                    typeof val === "string" || typeof val === "number" ? (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium capitalize text-gray-600">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span>{val}</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ERROR RESULT CARD ── */}
        <AnimatePresence>
          {uploadStatus === "error" && uploadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1"
            >
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <XCircle size={18} />
                Upload Failed
              </div>
              <p className="text-sm text-red-600">{uploadError}</p>
              <div className="flex items-start gap-2 mt-2 text-xs text-red-500 bg-red-100 rounded-lg p-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Please check that your file is a valid prescription image or PDF and try again.
                  If the problem persists, contact support.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Extracted Text Section ── */}
        {extractedText && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Extracted Medicines</h3>
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 text-blue-600 text-sm"
              >
                <Edit3 size={16} />
                {editing ? "Done" : "Edit"}
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

            <button
              onClick={() => setVerified(true)}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              Verify Medicines
            </button>
          </div>
        )}

        {/* ── After verification ── */}
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