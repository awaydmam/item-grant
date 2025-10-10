import { toast as sonnerToast } from "sonner";

// Toast utility untuk konsistensi di seluruh aplikasi
export const showToast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 2000,
      position: "top-right",
    });
  },
  
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 3000, // sedikit lebih lama untuk error
      position: "top-right",
    });
  },
  
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 2000,
      position: "top-right",
    });
  },
  
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 2500,
      position: "top-right",
    });
  },
  
  // Toast ringan untuk feedback cepat
  quick: (message: string) => {
    sonnerToast(message, {
      duration: 1500,
      position: "top-right",
    });
  }
};

// Export juga toast original untuk backward compatibility
export { toast } from "sonner";
