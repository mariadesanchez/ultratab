const text = "MS 250 95 30 25 20";
const hasKeywords = /(paciente|dd|ds|siv|pp|ao|ai|apertura|fey|vol|conclusi)/i.test(text);
console.log("hasKeywords:", hasKeywords);

let cleanedText = text
  .replace(/\by\b/gi, " ")
  .replace(/un|uno/gi, "1")
  .replace(/dos/gi, "2");

const numbers = cleanedText.match(/\d+(?:[.,]\d+)?/g);
console.log("numbers:", numbers);

if (numbers && numbers.length > 0) {
  const firstNumMatch = text.match(/\d+(?:[.,]\d+)?/);
  console.log("firstNumMatch.index:", firstNumMatch.index);
  if (firstNumMatch && firstNumMatch.index !== undefined && firstNumMatch.index > 0) {
    const beforeNumber = text.substring(0, firstNumMatch.index).replace(/paciente/gi, "").trim();
    console.log("beforeNumber:", beforeNumber);
  }
}
