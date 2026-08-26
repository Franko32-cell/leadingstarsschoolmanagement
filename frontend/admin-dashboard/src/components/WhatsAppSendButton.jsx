import { useEffect, useState } from "react";
import { FaCheck, FaSpinner, FaTimes, FaWhatsapp } from "react-icons/fa";
import API from "../services/api";

const FAILURE_LABELS = {
  no_phone: "No phone number on file",
  invalid_phone: "Invalid phone number",
  termii_error: "Termii could not send the message",
  pdf_generation_error: "Could not generate the PDF",
  pdf_unavailable: "PDF sending is not available for this record",
};

const WhatsAppSendButton = ({ endpoint, send, disabledReason, className = "" }) => {
  const [state, setState] = useState("idle");
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (state === "idle") return undefined;
    const timer = setTimeout(() => {
      setState("idle");
      setFailure("");
    }, 4000);
    return () => clearTimeout(timer);
  }, [state]);

  const handleClick = async (event) => {
    event.stopPropagation();
    if (disabledReason || state === "sending") return;
    setState("sending");
    setFailure("");
    try {
      const response = send ? await send() : await API.post(endpoint);
      const result = response?.data || response;
      if (result?.success) {
        setState("success");
      } else {
        setFailure(FAILURE_LABELS[result?.reason] || result?.reason || "Send failed");
        setState("failure");
      }
    } catch (error) {
      const reason = error?.response?.data?.reason;
      setFailure(FAILURE_LABELS[reason] || reason || "Could not send message");
      setState("failure");
    }
  };

  const label = state === "sending" ? "Sending..." : state === "success" ? "Sent" : state === "failure" ? failure : "Send via WhatsApp";
  const color = state === "success"
    ? "text-green-700 bg-green-50 border-green-200"
    : state === "failure"
    ? "text-red-700 bg-red-50 border-red-200"
    : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={Boolean(disabledReason) || state === "sending"}
      title={disabledReason || undefined}
      className={`inline-flex items-center justify-center gap-1.5 border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${color} ${className}`}
    >
      {state === "sending" ? <FaSpinner className="animate-spin" aria-hidden="true" /> : state === "success" ? <FaCheck aria-hidden="true" /> : state === "failure" ? <FaTimes aria-hidden="true" /> : <FaWhatsapp aria-hidden="true" />}
      <span>{label}</span>
    </button>
  );
};

export default WhatsAppSendButton;
