export const verboseTryOnDebug = import.meta.env.DEV;

export const logVerboseTryOn = (...args: unknown[]) => {
  if (verboseTryOnDebug) {
    console.log(...args);
  }
};
