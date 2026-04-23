let recaptchaExecutor = null;
let executorReadyPromise = null;

export const setRecaptchaExecutor = (executorFn) => {
  recaptchaExecutor = executorFn;
  // Resolve any pending waits
  if (executorReadyPromise) {
    executorReadyPromise.resolve();
    executorReadyPromise = null;
  }
};

// Create a helper that waits for the executor
const waitForExecutor = () => {
  if (recaptchaExecutor) return Promise.resolve();

  if (!executorReadyPromise) {
    executorReadyPromise = {};
    executorReadyPromise.promise = new Promise((resolve) => {
      executorReadyPromise.resolve = resolve;
    });
  }

  return executorReadyPromise.promise;
};

export const getRecaptchaToken = async (action) => {
  await waitForExecutor();
  return await recaptchaExecutor(action);
};
