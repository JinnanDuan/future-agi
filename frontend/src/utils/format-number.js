import numeral from "numeral";

// ----------------------------------------------------------------------

export function fNumber(number) {
  return numeral(number).format();
}
export function fCurrency(number, showThreeDecimals = false) {
  // Return empty string if input is null or undefined
  if (number === null || number === undefined) return "";

  // Convert string inputs to numbers
  if (typeof number === "string") number = parseFloat(number);

  // If number is exactly 0, return "$0"
  if (number === 0) return "$0";

  // If number is a whole integer, return formatted string with no decimals
  if (Number.isInteger(number)) return numeral(number).format("$0,0");

  // Treat near-zero values as zero (use smaller threshold when showing extra decimals)
  if (Math.abs(number) < (showThreeDecimals ? 0.0000001 : 0.000001))
    return "$0";

  // If showThreeDecimals flag is false, use default 2 decimal formatting
  if (!showThreeDecimals) {
    const format = number ? numeral(number).format("$0,0.00") : "";
    return result(format, ".00"); // Remove unnecessary trailing zeros if needed
  }

  // -----------------------------
  // For showThreeDecimals = true
  // -----------------------------

  // Work with absolute value to calculate magnitude
  const absNumber = Math.abs(number);

  // Calculate order of magnitude (log10) of the number
  // Example: 123 -> 2, 0.00456 -> -3
  const orderOfMagnitude = Math.floor(Math.log10(absNumber));

  let decimalPlaces;

  // Determine number of decimal places based on magnitude
  if (orderOfMagnitude >= 0) {
    // Numbers >= 1 → show up to 3 decimal places
    decimalPlaces = 3;
  } else {
    // Numbers < 1 → show enough decimals to capture first 3 significant digits
    // Cap at 7 decimal places to support micro-pricing (e.g., $0.000002/token)
    decimalPlaces = Math.min(7, -orderOfMagnitude + 2);
  }

  // Build a numeral.js format string with the calculated decimal places
  const formatString = "$0,0." + "0".repeat(decimalPlaces);

  // Format the number
  let formatted = numeral(number).format(formatString);

  // Remove unnecessary trailing zeros after significant decimals
  formatted = formatted.replace(/(\.\d*?[1-9])0+$/g, "$1");

  // Remove .0 if the number has no meaningful decimals
  formatted = formatted.replace(/\.0+$/g, "");

  // Return the formatted currency string
  return formatted;
}

export function fPercent(number) {
  const format = number ? numeral(Number(number) / 100).format("0.0%") : "";

  return result(format, ".0");
}

export function fShortenNumber(number) {
  const format = number ? numeral(number).format("0.00a") : "";

  return result(format, ".00");
}

export function fData(number) {
  const format = number ? numeral(number).format("0.0 b") : "";

  return result(format, ".0");
}

function result(format, key = ".00") {
  const isInteger = format.includes(key);

  return isInteger ? format.replace(key, "") : format;
}
