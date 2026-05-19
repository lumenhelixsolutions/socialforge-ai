import { X } from "lucide-react";

export function ToastContainer({ toasts, dismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => dismiss(toast.id)}><X size={13}/></button>
        </div>
      ))}
    </div>
  );
}
