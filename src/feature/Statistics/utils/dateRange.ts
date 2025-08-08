export const lastNDaysRange = (n: number) => {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  const start = new Date(end);
  start.setDate(end.getDate() - n);
  return { start, end };
};
