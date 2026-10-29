"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React resets a form after its action runs, which wipes what someone typed when the
 * server returns a validation error. Submitting through onSubmit keeps the fields filled.
 */
export function keepFormOnSubmit(action: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };
}
