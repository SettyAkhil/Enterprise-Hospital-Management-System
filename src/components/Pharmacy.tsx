import React from "react";
import PharmacyApp from "./PharmacyModule/PharmacyApp";

interface PharmacyProps {
  activeModule?: string;
  onNavigate?: (module: string) => void;
}

export default function Pharmacy({ activeModule, onNavigate }: PharmacyProps) {
  return (
    <div className="w-full h-full bg-white overflow-hidden">
      <PharmacyApp />
    </div>
  );
}

