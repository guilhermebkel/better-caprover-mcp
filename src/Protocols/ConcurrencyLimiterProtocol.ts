export type ConcurrencyLimiterWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};
