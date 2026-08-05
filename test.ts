const text = "MS 250 95 30 25 20";
const prev = { paciente: "" };
const newData = { ...prev };
const hasKeywords = /(paciente|dd|ds|siv|pp|ao|ai|apertura|fey|vol|conclusi)/i.test(text);
if (!hasKeywords) {
  let cleanedText = text
    .replace(/\by\b/gi, " ")
    .replace(/un|uno/gi, "1");
  const numbers = cleanedText.match(/\d+(?:[.,]\d+)?/g);
  if (numbers && numbers.length > 0) {
    const firstNumMatch = text.match(/\d+(?:[.,]\d+)?/);
    if (firstNumMatch && firstNumMatch.index !== undefined && firstNumMatch.index > 0) {
      const beforeNumber = text.substring(0, firstNumMatch.index).replace(/paciente/gi, "").trim();
      if (beforeNumber) {
        newData.paciente = beforeNumber;
      }
    }
  }
}
console.log(newData);
