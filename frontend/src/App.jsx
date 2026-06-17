import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import ChatPage from "./pages/ChatPage";
import ProtectedLayout from "./components/layout/ProtectedLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1e1b18",
            color: "#e8e0d5",
            border: "1px solid #3a3228",
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/chat/:documentId" element={<ChatPage />} />
          <Route
            path="/chat/:documentId/session/:sessionId"
            element={<ChatPage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
