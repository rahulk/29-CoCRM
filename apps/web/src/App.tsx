import { AppRoutes } from "./routes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
