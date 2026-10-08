"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteEmployee } from "@/hooks/use-employee-mutations";
import type { Employee } from "@/lib/types";

/** Asks before deleting, because there is no undo in this version. Mounted only while open. */
export function DeleteEmployeeDialog({
  employee,
  onClose,
  onDeleted,
}: {
  employee: Employee;
  onClose: () => void;
  onDeleted: (employee: Employee) => void;
}) {
  const remove = useDeleteEmployee();
  const [message, setMessage] = useState<string | null>(null);

  async function confirm() {
    setMessage(null);
    try {
      await remove.mutateAsync(employee.id);
      onDeleted(employee);
      onClose();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete the employee.",
      );
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {employee.full_name}?</DialogTitle>
          <DialogDescription>
            This removes {employee.full_name} ({employee.email}) from the
            records. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {message ? (
          <p className="text-sm text-red-600" role="alert">
            {message}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={remove.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
