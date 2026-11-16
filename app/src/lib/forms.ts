import { startTransition, type FormEvent } from "react";

/**
 * Submits a form to a server action WITHOUT React's automatic form reset.
 *
 * With <form action={...}>, React 19 resets every uncontrolled field after the
 * action finishes. On a refused save that wipes what the person typed; on a
 * successful one it puts back stale values that the next click would save.
 * Use as: <form onSubmit={submitWithoutReset(action)}>. The pressed button's
 * name/value (e.g. intent=publish) is still sent.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
