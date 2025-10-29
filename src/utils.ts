export const safeJSONParse = (data: string) => {
  try {
    return JSON.parse(data);
  } catch {
    return;
  }
};

export const getRandomNumber = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
