// src/shutdown.ts

let stopping = false;

const activeControllers =
  new Set<AbortController>();

export function isStopping(): boolean {
  return stopping;
}

export function registerController(
  controller: AbortController
): void {
  activeControllers.add(
    controller
  );
}

export function unregisterController(
  controller: AbortController
): void {
  activeControllers.delete(
    controller
  );
}

export function requestShutdown(): void {
  if (stopping) {
    return;
  }

  stopping = true;

  console.log(
    "\n\nGraceful shutdown requested..."
  );

  if (activeControllers.size > 0) {
    console.log(
      `Aborting ${activeControllers.size} active LLM request(s)...`
    );
  }

  for (const controller of activeControllers) {
    controller.abort(
      "Worker shutdown requested"
    );
  }
}