import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import sonicTalesLogo from "@/assets/8e180fd67a0c0bd01f42002dab2e7103c2e61e1f.png";

interface AdminLoginProps {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === "2141") {
      onLogin();
      setError("");
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={sonicTalesLogo} alt="SonicTales" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl text-white">SonicTales Admin</CardTitle>
          <CardDescription className="text-gray-400">Enter password to access Content Management.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="Enter the password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="bg-gray-800 border-gray-700 text-white"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          <Button onClick={handleLogin} className="w-full bg-white text-black hover:bg-gray-200">
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
