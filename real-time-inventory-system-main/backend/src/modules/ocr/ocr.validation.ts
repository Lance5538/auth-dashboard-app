import type { OcrFieldType, OcrRiskLevel, OcrValidationStatus } from "@prisma/client";

type ValidationOutcome = {
  normalizedValue: string;
  validationStatus: OcrValidationStatus;
  validationMessage: string;
  riskLevel: OcrRiskLevel;
};

type ParsedValidationRule = {
  minChars?: number;
  maxChars?: number;
  exactChars?: number;
  requiredKeywords?: string[];
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCode(value: string) {
  return normalizeWhitespace(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

const monthMap: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

function normalizeMonthToken(value: string) {
  const normalized = monthMap[value.toLowerCase()];
  return normalized || value.padStart(2, "0");
}

function normalizeDate(value: string) {
  const trimmed = normalizeWhitespace(value).replace(/[.]/g, "/").replace(/-/g, "/");
  if (!trimmed) {
    return "";
  }

  const parts = trimmed.split("/").map((item) => item.trim());
  if (parts.length === 3) {
    const [left, middle, right] = parts;
    if (left.length === 4) {
      return `${left}-${normalizeMonthToken(middle)}-${right.padStart(2, "0")}`;
    }

    if (right.length === 4) {
      const leftLooksLikeMonth = Boolean(monthMap[left.toLowerCase()]);

      if (leftLooksLikeMonth) {
        return `${right}-${normalizeMonthToken(left)}-${middle.padStart(2, "0")}`;
      }

      return `${right}-${normalizeMonthToken(middle)}-${left.padStart(2, "0")}`;
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return trimmed;
}

function normalizePositiveInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function parseValidationRule(rule?: string | null): ParsedValidationRule {
  if (!rule?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rule) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const requiredKeywords = Array.isArray(parsed.requiredKeywords)
      ? parsed.requiredKeywords
          .map((item) => normalizeWhitespace(String(item)))
          .filter(Boolean)
      : [];

    return {
      minChars: normalizePositiveInteger(parsed.minChars),
      maxChars: normalizePositiveInteger(parsed.maxChars),
      exactChars: normalizePositiveInteger(parsed.exactChars),
      requiredKeywords,
    };
  } catch {
    return {};
  }
}

function applyCustomValidationRules(normalizedValue: string, validationRule?: string | null) {
  const parsedRule = parseValidationRule(validationRule);
  const issues: string[] = [];
  const comparableValue = normalizedValue.toUpperCase();

  if (parsedRule.exactChars && normalizedValue.length !== parsedRule.exactChars) {
    issues.push(`Expected exactly ${parsedRule.exactChars} characters`);
  }

  if (parsedRule.minChars && normalizedValue.length < parsedRule.minChars) {
    issues.push(`Expected at least ${parsedRule.minChars} characters`);
  }

  if (parsedRule.maxChars && normalizedValue.length > parsedRule.maxChars) {
    issues.push(`Expected no more than ${parsedRule.maxChars} characters`);
  }

  if (parsedRule.requiredKeywords?.length) {
    const missingKeywords = parsedRule.requiredKeywords.filter((keyword) => !comparableValue.includes(keyword.toUpperCase()));
    if (missingKeywords.length > 0) {
      issues.push(`Missing required keywords: ${missingKeywords.join(", ")}`);
    }
  }

  return {
    checked:
      Boolean(parsedRule.exactChars) ||
      Boolean(parsedRule.minChars) ||
      Boolean(parsedRule.maxChars) ||
      Boolean(parsedRule.requiredKeywords?.length),
    issues,
  };
}

function mergeValidationOutcomes(baseOutcome: ValidationOutcome, validationRule?: string | null) {
  if (!baseOutcome.normalizedValue) {
    return baseOutcome;
  }

  const customValidation = applyCustomValidationRules(baseOutcome.normalizedValue, validationRule);
  if (!customValidation.checked) {
    return baseOutcome;
  }

  const messages = [baseOutcome.validationMessage, ...customValidation.issues].filter(Boolean);
  if (customValidation.issues.length > 0) {
    return {
      ...baseOutcome,
      validationStatus: "FAILED",
      validationMessage: messages.join("; "),
      riskLevel: "HIGH_RISK",
    } satisfies ValidationOutcome;
  }

  if (baseOutcome.validationStatus === "NOT_RUN") {
    return {
      ...baseOutcome,
      validationStatus: "PASSED",
      validationMessage: "",
      riskLevel: "NORMAL",
    } satisfies ValidationOutcome;
  }

  return {
    ...baseOutcome,
    validationMessage: messages.join("; "),
  } satisfies ValidationOutcome;
}

export function validateOcrFieldValue(fieldType: OcrFieldType, rawValue: string, required: boolean, validationRule?: string | null) {
  const baseValue = normalizeWhitespace(rawValue);

  if (!baseValue) {
    return {
      normalizedValue: "",
      validationStatus: required ? "FAILED" : "NOT_RUN",
      validationMessage: required ? "Required field is empty" : "",
      riskLevel: required ? "HIGH_RISK" : "REVIEW",
      } satisfies ValidationOutcome;
  }

  let outcome: ValidationOutcome;

  switch (fieldType) {
    case "NUMBER": {
      const normalizedValue = baseValue.replace(/[^\d.-]/g, "");
      const isValid = /^-?\d+(\.\d+)?$/.test(normalizedValue);
      outcome = {
        normalizedValue,
        validationStatus: isValid ? "PASSED" : "FAILED",
        validationMessage: isValid ? "" : "Expected a numeric value",
        riskLevel: isValid ? "NORMAL" : "HIGH_RISK",
      } satisfies ValidationOutcome;
      break;
    }
    case "DATE": {
      const normalizedValue = normalizeDate(baseValue);
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue);
      outcome = {
        normalizedValue,
        validationStatus: isValid ? "PASSED" : "FAILED",
        validationMessage: isValid ? "" : "Expected a recognizable date",
        riskLevel: isValid ? "NORMAL" : "HIGH_RISK",
      } satisfies ValidationOutcome;
      break;
    }
    case "PHONE": {
      const normalizedValue = baseValue.replace(/[^\d+()-\s]/g, "");
      const digits = normalizedValue.replace(/\D/g, "");
      const isValid = digits.length >= 7;
      outcome = {
        normalizedValue,
        validationStatus: isValid ? "PASSED" : "FAILED",
        validationMessage: isValid ? "" : "Expected a phone number",
        riskLevel: isValid ? "NORMAL" : "REVIEW",
      } satisfies ValidationOutcome;
      break;
    }
    case "CODE": {
      const normalizedValue = normalizeCode(baseValue);
      const isValid = /^[A-Z0-9]{4,}$/.test(normalizedValue);
      outcome = {
        normalizedValue,
        validationStatus: isValid ? "PASSED" : "FAILED",
        validationMessage: isValid ? "" : "Expected an alphanumeric code",
        riskLevel: isValid ? "NORMAL" : "REVIEW",
      } satisfies ValidationOutcome;
      break;
    }
    case "CONTAINER_NO": {
      const normalizedValue = normalizeCode(baseValue);
      const isValid = /^[A-Z]{4}\d{7}$/.test(normalizedValue);
      outcome = {
        normalizedValue,
        validationStatus: isValid ? "PASSED" : "FAILED",
        validationMessage: isValid ? "" : "Expected a container number like ABCD1234567",
        riskLevel: isValid ? "NORMAL" : "HIGH_RISK",
      } satisfies ValidationOutcome;
      break;
    }
    case "TEXT":
    default:
      outcome = {
        normalizedValue: baseValue,
        validationStatus: "NOT_RUN",
        validationMessage: "",
        riskLevel: "NORMAL",
      } satisfies ValidationOutcome;
      break;
  }

  return mergeValidationOutcomes(outcome, validationRule);
}

export function resolveRiskLevel(confidence: number | null, validationRisk: OcrRiskLevel) {
  if (confidence !== null && confidence < 0.5) {
    return "HIGH_RISK" as const;
  }

  if (validationRisk === "HIGH_RISK") {
    return validationRisk;
  }

  if (confidence !== null && confidence < 0.8) {
    return "REVIEW" as const;
  }

  return validationRisk;
}
