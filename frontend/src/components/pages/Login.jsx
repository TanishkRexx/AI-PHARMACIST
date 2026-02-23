import LoginPopup from "../LoginPopup.jsx"
import { useState } from "react";

export default function LoginPage() {
  const [open, setOpen] = useState(true);

  return (
    <LoginPopup
      isOpen={open}
      onClose={() => setOpen(false)}
    />
  );
}