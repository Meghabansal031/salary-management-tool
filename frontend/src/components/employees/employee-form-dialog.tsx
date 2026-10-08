"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSaveEmployee } from "@/hooks/use-employee-mutations";
import { ApiError } from "@/lib/api";
import {
  EMPTY_FORM,
  employeeToFormValues,
  parseSalary,
  toEmployeeInput,
  todayIso,
  type EmployeeFormValues,
  type FormField,
} from "@/lib/employee-rules";
import { makeEmployeeSchema } from "@/lib/employee-schema";
import { serverErrorsToForm } from "@/lib/form-errors";
import { formatMoney } from "@/lib/format";
import type { Employee, MetaFilters } from "@/lib/types";

/** A label, the input, and the error message under it. */
function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Add (no `employee`) or edit (with `employee`) form. The parent mounts it only while it is
 * open, so every opening starts from fresh values.
 */
export function EmployeeFormDialog({
  employee,
  options,
  onClose,
  onSaved,
}: {
  employee?: Employee;
  options: MetaFilters | undefined;
  onClose: () => void;
  onSaved: (saved: Employee, wasEdit: boolean) => void;
}) {
  const isEdit = employee !== undefined;
  const countryCodes = useMemo(
    () => options?.countries.map((c) => c.code),
    [options],
  );
  const schema = useMemo(
    () => makeEmployeeSchema(countryCodes),
    [countryCodes],
  );

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: employee ? employeeToFormValues(employee) : EMPTY_FORM,
  });

  const save = useSaveEmployee();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // The currency is not typed: it follows the country, so the two can never disagree.
  const country = useWatch({ control, name: "country" });
  const currency =
    options?.countries.find((c) => c.code === country)?.currency ??
    (employee && employee.country === country ? employee.currency : "");

  const salary = parseSalary(useWatch({ control, name: "salary" }) ?? "");

  const onSubmit = handleSubmit(async (values) => {
    setFormMessage(null);
    try {
      const saved = await save.mutateAsync({
        id: employee?.id,
        input: toEmployeeInput(values, currency),
      });
      onSaved(saved, isEdit);
      onClose();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      // The server has the last word: show its messages next to the fields they belong to.
      const { fields, message } = serverErrorsToForm(error);
      for (const [field, text] of Object.entries(fields) as [
        FormField,
        string,
      ][]) {
        setError(field, { type: "server", message: text });
      }
      setFormMessage(message);
    }
  });

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change any field and save. The salary is the annual amount in the country's currency."
              : "All fields are required. The salary is the annual amount in the country's currency."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              htmlFor="full_name"
              error={errors.full_name?.message}
            >
              <Input
                id="full_name"
                autoComplete="off"
                aria-invalid={Boolean(errors.full_name)}
                {...register("full_name")}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
            </Field>

            <Field
              label="Job title"
              htmlFor="job_title"
              error={errors.job_title?.message}
            >
              <Input
                id="job_title"
                list="job-title-options"
                autoComplete="off"
                aria-invalid={Boolean(errors.job_title)}
                {...register("job_title")}
              />
              <datalist id="job-title-options">
                {(options?.job_titles ?? []).map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Department"
              htmlFor="department"
              error={errors.department?.message}
            >
              <Input
                id="department"
                list="department-options"
                autoComplete="off"
                aria-invalid={Boolean(errors.department)}
                {...register("department")}
              />
              <datalist id="department-options">
                {(options?.departments ?? []).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Country"
              htmlFor="country"
              error={errors.country?.message}
            >
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="country"
                      className="w-full"
                      aria-invalid={Boolean(errors.country)}
                    >
                      <SelectValue placeholder="Choose a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {(options?.countries ?? []).map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label="Currency"
              htmlFor="currency"
              hint="Set by the country"
            >
              <Input
                id="currency"
                value={currency}
                readOnly
                disabled
                placeholder="—"
              />
            </Field>

            <Field
              label={currency ? `Annual salary (${currency})` : "Annual salary"}
              htmlFor="salary"
              error={errors.salary?.message}
              hint={
                salary && salary > 0 && currency
                  ? formatMoney(salary, currency)
                  : "Whole numbers, for example 85000"
              }
            >
              <Input
                id="salary"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={Boolean(errors.salary)}
                {...register("salary")}
              />
            </Field>

            <Field
              label="Hire date"
              htmlFor="hire_date"
              error={errors.hire_date?.message}
            >
              <Input
                id="hire_date"
                type="date"
                max={todayIso()}
                aria-invalid={Boolean(errors.hire_date)}
                {...register("hire_date")}
              />
            </Field>
          </div>

          {formMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {formMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || currency === ""}>
              {isSubmitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
