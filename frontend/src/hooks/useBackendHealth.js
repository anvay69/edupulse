import { useEffect, useState } from "react";
import { checkBackendHealth } from "../services/api.js";

export function useBackendHealth() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let active = true;

    checkBackendHealth()
      .then(() => {
        if (active) setStatus("connected");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });

    return () => {
      active = false;
    };
  }, []);

  return status;
}
