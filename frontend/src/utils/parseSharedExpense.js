// Shared text comes from many different sources — a bank SMS, or the "Share"
// button on a UPI app's payment screen (Google Pay, PhonePe, Paytm, BHIM, etc).
// Each phrases it differently ("paid ₹X to Y", "Rs.X sent to Y", "X debited
// towards Y"), so these patterns key off the common pieces (an amount near a
// currency marker, a name after to/at/towards) rather than one app's wording.
const AMOUNT_PATTERNS = [
  /₹\s*([\d,]+(?:\.\d{1,2})?)/,
  /(?:inr|rs\.?|rupees)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:inr|rs\.?|rupees)/i,
  /(?:paid|sent|debited|received|transferred)\s+([\d,]+(?:\.\d{1,2})?)\b/i,
]

const PLACE_TERMINATOR = String.raw`(?:\s+(?:on|dt|via|using|through|from|for|success\w*|ref\w*|txn\w*|transaction|upi)\b|\s+\d|[,.]|$)`
const PLACE_PATTERNS = [
  new RegExp(String.raw`\b(?:at|to|towards)\s+([A-Za-z0-9&.'\- ]{2,40}?)${PLACE_TERMINATOR}`, 'i'),
]

// Best-effort extraction from shared payment text — never trusted blindly, the
// parsed values only pre-fill the Add Expense form for the user to review.
export const parseSharedExpenseText = (rawText) => {
  const text = String(rawText || '').replace(/\s+/g, ' ').trim()
  if (!text) {
    return { amount: '', place: '' }
  }

  let amount = ''
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      amount = match[1].replace(/,/g, '')
      break
    }
  }

  let place = ''
  for (const pattern of PLACE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      place = match[1].trim()
      break
    }
  }

  return { amount, place }
}
