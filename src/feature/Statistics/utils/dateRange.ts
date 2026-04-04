export const lastNDaysRange = (n: number) => {
  const normalizedDays = Math.max(1, Math.floor(n));
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(end.getDate() - normalizedDays + 1);
  return { start, end };
};
