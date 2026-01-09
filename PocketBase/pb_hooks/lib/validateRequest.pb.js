function validateRequest(body, spec, opts = {}) {
  const mode = opts.mode ?? "throw"; // "throw" | "return"
  const out = {};
  const errors = [];

  function addError(field, message, meta = {}) {
    errors.push({ field, message, ...meta });
  }

  for (const field in spec) {
    const rule = spec[field] || {};
    const required = !!rule.required;
    const type = rule.type || "any";

    const raw = body?.[field];

    const isMissing =
      raw === null ||
      raw === undefined ||
      (typeof raw === "string" && raw.trim().length === 0);

    if (isMissing) {
      if (required) {
        addError(field, "Missing required field", { type });
      } else if ("default" in rule) {
        out[field] = rule.default;
      }
      continue;
    }

    switch (type) {
      case "string": {
        const s = String(raw).trim();
        if (rule.minLength !== undefined && s.length < rule.minLength) {
          addError(field, `Must be at least ${rule.minLength} characters`);
          break;
        }
        if (rule.maxLength !== undefined && s.length > rule.maxLength) {
          addError(field, `Must be at most ${rule.maxLength} characters`);
          break;
        }
        out[field] = s;
        break;
      }

      case "email": {
        const s = String(raw).trim();
        if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) {
          addError(field, "Invalid email format");
          break;
        }
        out[field] = s;
        break;
      }

      case "bool": {
        if (typeof raw === "boolean") {
          out[field] = raw;
          break;
        }
        const s = String(raw).trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes") {
          out[field] = true;
          break;
        }
        if (s === "false" || s === "0" || s === "no") {
          out[field] = false;
          break;
        }
        addError(field, "Must be a boolean");
        break;
      }

      case "datetime": {
        const s = String(raw).trim();
        const hasTimezone =
          /[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s);

        if (!hasTimezone) {
          addError(field, "Datetime must include timezone (Z or ±HH:MM)");
          break;
        }

        const d = new Date(s);
        if (Number.isNaN(d.getTime())) {
          addError(field, "Invalid datetime");
          break;
        }

        out[field] = d.toISOString();
        break;
      }

      case "int": {
        const n =
          typeof raw === "number"
            ? raw
            : Number(String(raw).trim());

        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          addError(field, "Must be an integer");
          break;
        }

        if (rule.min !== undefined && n < rule.min) {
          addError(field, `Must be >= ${rule.min}`);
          break;
        }
        if (rule.max !== undefined && n > rule.max) {
          addError(field, `Must be <= ${rule.max}`);
          break;
        }

        out[field] = n;
        break;
      }

      case "enum": {
        const s = String(raw).trim();
        const allowed = rule.allowed || [];
        if (!allowed.includes(s)) {
          addError(field, "Invalid value", { allowed });
          break;
        }
        out[field] = s;
        break;
      }

      default: {
        out[field] = raw;
        break;
      }
    }
  }

  if (errors.length > 0) {
    if (mode === "return") {
      return { ok: false, data: null, errors };
    }

    throw new BadRequestError(
      "Invalid request body",
      { errors },
    );
  }

  return mode === "return"
    ? { ok: true, data: out, errors: [] }
    : out;
}
