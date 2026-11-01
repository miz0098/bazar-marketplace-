/** UI policy only. Backend isolation and authorization never depend on this flag. */
export const simulationMode = process.env.NEXT_PUBLIC_BAZAR_SIMULATION === '1';
export const simulationCopy = (original: string, ordinary: string) => simulationMode ? ordinary : original;
