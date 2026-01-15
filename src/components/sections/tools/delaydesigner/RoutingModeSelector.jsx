// ============================================================
// RoutingModeSelector - Delay routing mode toggle
// ============================================================

import React from "react";
import { ROUTING_MODES } from "./constants";

export const RoutingModeSelector = ({ routingMode, setRoutingMode }) => {
  return (
    <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
      {Object.entries(ROUTING_MODES).map(([key, mode]) => (
        <button
          key={key}
          onClick={() => setRoutingMode(key)}
          title={mode.description}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            routingMode === key ? "bg-amber-600 text-white shadow-lg" : "bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          }`}
        >
          {mode.short}
        </button>
      ))}
    </div>
  );
};
