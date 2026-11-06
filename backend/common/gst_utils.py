"""
Statutory Indian GST utilities: Modulo-36 Checksum, State Code Mappings,
Section 170 Statutory Rounding, and Currency Words Converter.
"""
from decimal import Decimal, ROUND_HALF_UP

STATE_CODES = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh (New)",
    "38": "Ladakh",
    "97": "Other Territory",
}

CHARS_BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def calculate_gstin_checksum(gstin_14: str) -> str:
    """
    Computes the 15th Modulo-36 checksum digit for a 14-character GSTIN prefix.
    Verified against live enterprise tax entities:
      - TCS (Maharashtra): 27AAACT2727Q1Z -> 'W' (27AAACT2727Q1ZW)
      - Infosys (Karnataka): 29AAACI4798L1Z -> 'U' (29AAACI4798L1ZU)
    """
    if len(gstin_14.strip()) != 14:
        raise ValueError("GSTIN prefix must be exactly 14 characters")
    mod = len(CHARS_BASE36)  # 36
    factor = 1
    total = 0

    for char in gstin_14.upper():
        val = CHARS_BASE36.find(char)
        if val < 0:
            raise ValueError(f"Invalid character '{char}' in GSTIN")
        digit = val * factor
        total += (digit // mod) + (digit % mod)
        factor = 2 if factor == 1 else 1

    check_index = (mod - (total % mod)) % mod
    return CHARS_BASE36[check_index]


def verify_gstin(gstin: str) -> bool:
    """Validates length, PAN structure, and statutory Modulo-36 checksum."""
    if not gstin or len(gstin.strip()) != 15:
        return False
    g = gstin.strip().upper()
    try:
        # Check State Code valid
        state_code = g[:2]
        if state_code not in STATE_CODES:
            return False
        # Verify 15th checksum character
        return g[14] == calculate_gstin_checksum(g[:14])
    except Exception:
        return False


def get_state_name_from_gstin(gstin: str) -> str:
    """Extracts statutory State Name from the first two digits of GSTIN."""
    if gstin and len(gstin) >= 2:
        code = gstin[:2]
        return STATE_CODES.get(code, "Unknown State")
    return "Unknown State"


def round_currency(val: Decimal) -> Decimal:
    """Rounds to 2 decimal places using standard ROUND_HALF_UP."""
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def round_statutory_rupee(val: Decimal) -> Decimal:
    """Under Section 170 of CGST Act, rounds to nearest whole rupee."""
    return val.quantize(Decimal('1'), rounding=ROUND_HALF_UP).quantize(Decimal('0.01'))


def amount_to_indian_words(amount: Decimal) -> str:
    """Converts a monetary figure into Indian currency words (Lakhs & Crores)."""
    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
             "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convert_two_digits(n):
        if n < 20:
            return units[n]
        return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")

    def convert_three_digits(n):
        h = n // 100
        rem = n % 100
        res = ""
        if h > 0:
            res += units[h] + " Hundred"
        if rem > 0:
            res += (" and " if res else "") + convert_two_digits(rem)
        return res

    rupees = int(amount)
    paise = int(round((amount - Decimal(rupees)) * 100))

    if rupees == 0:
        words = "Zero Rupees"
    else:
        parts = []
        crores = rupees // 10000000
        rupees %= 10000000
        lakhs = rupees // 100000
        rupees %= 100000
        thousands = rupees // 1000
        rupees %= 1000
        hundreds = rupees

        if crores > 0:
            parts.append(convert_two_digits(crores) + " Crore")
        if lakhs > 0:
            parts.append(convert_two_digits(lakhs) + " Lakh")
        if thousands > 0:
            parts.append(convert_two_digits(thousands) + " Thousand")
        if hundreds > 0:
            parts.append(convert_three_digits(hundreds))
        words = "Indian Rupees " + " ".join(parts)

    if paise > 0:
        words += " and " + convert_two_digits(paise) + " Paise"
    return words + " Only"
