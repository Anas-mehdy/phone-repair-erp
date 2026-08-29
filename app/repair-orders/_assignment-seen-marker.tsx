"use client";

import { useEffect } from "react";
import { markRepairAssignmentSeenAction } from "./actions";

export function AssignmentSeenMarker({ repairOrderId }: { repairOrderId: string }) {
  useEffect(() => {
    void markRepairAssignmentSeenAction(repairOrderId);
  }, [repairOrderId]);

  return null;
}
