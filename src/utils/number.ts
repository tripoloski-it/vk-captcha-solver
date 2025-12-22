export const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getRandomFloat = (min: number, max: number, fractionDigits: number = 1): number => {
  const number = Math.random() * (max - min) + min;
  return +number.toFixed(fractionDigits);
};
