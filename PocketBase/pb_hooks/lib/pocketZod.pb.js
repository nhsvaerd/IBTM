class ZodError extends Error {
  constructor(issues) {
    super("Validation error");
    this.name = "ZodError";
    this.issues = issues;
  }
}

function issue(path, message, code = "invalid") {
  return { path, message, code };
}

function ok(data) {
  return { success: true, data };
}

function fail(issues) {
  return { success: false, error: new ZodError(issues) };
}

function makeSchema(parseFn) {
  const schema = {
    _parse: parseFn,

    parse(value, path = []) {
      const r = this.safeParse(value, path);
      if (!r.success) throw r.error;
      return r.data;
    },

    safeParse(value, path = []) {
      try {
        return ok(this._parse(value, path));
      } catch (err) {
        if (err instanceof ZodError) return fail(err.issues);
        // If a rule throws a raw Error, wrap it
        return fail([issue(path, err?.message ?? "Invalid value")]);
      }
    },

    optional() {
      const base = this;
      return makeSchema((value, path) => {
        if (value === null || value === undefined) return undefined;
        return base._parse(value, path);
      });
    },

    default(defaultValue) {
      const base = this;
      return makeSchema((value, path) => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === "string" && value.trim() === "") return defaultValue;
        return base._parse(value, path);
      });
    },
  };

  return schema;
}

// ---------- primitives ----------

function zString() {
  let minLen = null;
  let maxLen = null;
  let requireNonEmpty = false;
  let mustBeEmail = false;

  const base = makeSchema((value, path) => {
    if (value === null || value === undefined) {
      throw new ZodError([issue(path, "Required", "required")]);
    }

    const s = String(value).trim();

    if (requireNonEmpty && s.length === 0) {
      throw new ZodError([issue(path, "Must not be empty", "too_small")]);
    }

    if (minLen !== null && s.length < minLen) {
      throw new ZodError([issue(path, `Must be at least ${minLen} characters`, "too_small")]);
    }

    if (maxLen !== null && s.length > maxLen) {
      throw new ZodError([issue(path, `Must be at most ${maxLen} characters`, "too_big")]);
    }

    if (mustBeEmail) {
      // Basic email check (you can upgrade later)
      if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) {
        throw new ZodError([issue(path, "Invalid email", "invalid_string")]);
      }
    }

    return s;
  });

  base.min = (n) => { minLen = n; return base; };
  base.max = (n) => { maxLen = n; return base; };
  base.nonempty = () => { requireNonEmpty = true; return base; };
  base.email = () => { mustBeEmail = true; return base; };

  return base;
}

function zInt() {
  let min = null;
  let max = null;

  const base = makeSchema((value, path) => {
    if (value === null || value === undefined) {
      throw new ZodError([issue(path, "Required", "required")]);
    }

    const n =
      typeof value === "number"
        ? value
        : Number(String(value).trim());

    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new ZodError([issue(path, "Must be an integer", "invalid_type")]);
    }

    if (min !== null && n < min) {
      throw new ZodError([issue(path, `Must be >= ${min}`, "too_small")]);
    }

    if (max !== null && n > max) {
      throw new ZodError([issue(path, `Must be <= ${max}`, "too_big")]);
    }

    return n;
  });

  base.min = (n) => { min = n; return base; };
  base.max = (n) => { max = n; return base; };

  return base;
}

function zBool() {
  return makeSchema((value, path) => {
    if (value === null || value === undefined) {
      throw new ZodError([issue(path, "Required", "required")]);
    }

    if (typeof value === "boolean") return value;

    const s = String(value).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;

    throw new ZodError([issue(path, "Must be a boolean", "invalid_type")]);
  });
}

function zEnum(values) {
  return makeSchema((value, path) => {
    if (value === null || value === undefined) {
      throw new ZodError([issue(path, "Required", "required")]);
    }

    const s = String(value).trim();

    if (!values.includes(s)) {
      throw new ZodError([issue(path, "Invalid enum value", "invalid_enum")]);
    }

    return s;
  });
}

function zDateTimeIsoWithTz() {
  return makeSchema((value, path) => {
    if (value === null || value === undefined) {
      throw new ZodError([issue(path, "Required", "required")]);
    }

    const s = String(value).trim();

    const hasTimezone =
      /[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s);

    if (!hasTimezone) {
      throw new ZodError([issue(path, "Datetime must include timezone (Z or ±HH:MM)", "invalid_string")]);
    }

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      throw new ZodError([issue(path, "Invalid datetime", "invalid_string")]);
    }

    // Return ISO string, since PocketBase date fields want ISO.
    return d.toISOString();
  });
}

// ---------- object ----------

function zObject(shape) {
  let strict = false;

  const base = makeSchema((value, path) => {
    if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
      throw new ZodError([issue(path, "Must be an object", "invalid_type")]);
    }

    const out = {};
    const issues = [];

    // Parse known keys
    for (const key in shape) {
      const schema = shape[key];
      const v = value[key];

      const r = schema.safeParse(v, [...path, key]);
      if (!r.success) {
        issues.push(...r.error.issues);
      } else {
        // Keep undefined values out to mimic typical request parsing
        if (r.data !== undefined) out[key] = r.data;
      }
    }

    // Strict mode: forbid unknown keys
    if (strict) {
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(shape, key)) {
          issues.push(issue([...path, key], "Unknown key", "unrecognized_key"));
        }
      }
    }

    if (issues.length > 0) {
      throw new ZodError(issues);
    }

    return out;
  });

  base.strict = () => { strict = true; return base; };

  return base;
}

// Export-like object (JSVM global)
const z = {
  string: zString,
  int: zInt,
  bool: zBool,
  enum: zEnum,
  datetime: zDateTimeIsoWithTz,
  object: zObject,
  ZodError,
};
