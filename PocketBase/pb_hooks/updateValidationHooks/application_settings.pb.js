// <reference path="../pb_data/types.d.ts" />

onRecordUpdateRequest(
  (e) => {
    if (e.collection?.name !== "application_settings") {
      return e.next();
    }

    const body =
      e.requestInfo?.()?.body ?? {};

    // Only validate fields that are being changed, but we may need both key/type/value.
    // So load "effective" values: body overrides record.
    const record =
      e.record;

    const key =
      (body.key ?? record.getString("key")).trim();

    const type =
      (body.type ?? record.getString("type")).trim();

    const rawValue =
      body.value ?? record.getString("value");


    // 1) Type enforcement
    const parsed =
      parseAppSettingValue(
        type,
        rawValue,
        { key },
      );

    // 2) Per-key rules
    enforceAppSettingRules(
      {
        key,
        type,
        rawValue,
        parsed,
      },
    );

    return e.next();
  },
  "application_settings",
);

function parseAppSettingValue(
  type,
  rawValue,
  { key } = {},
) {
  // Treat null/undefined as empty string for parsing decisions
  const s =
    rawValue === null || rawValue === undefined
      ? ""
      : String(rawValue).trim();

  switch (type) {
    case "integer": {
      if (s.length === 0) {
        throwApi(
          400,
          "Value is required for integer setting",
          { key, field: "value" },
        );
      }

      const n =
        Number(s);

      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throwApi(
          400,
          "Value must be an integer",
          { key, field: "value", value: rawValue },
        );
      }

      return n;
    }

    case "string": {
      // allow empty string if you want; if not, enforce non-empty here
      return s;
    }

    case "boolean": {
      if (s === "true") return true;
      if (s === "false") return false;

      throwApi(
        400,
        "Value must be 'true' or 'false'",
        { key, field: "value", value: rawValue },
      );
    }

    case "json": {
      if (s.length === 0) {
        // decide whether empty is allowed; I usually disallow
        throwApi(
          400,
          "Value is required for json setting",
          { key, field: "value" },
        );
      }

      try {
        return JSON.parse(s);
      } catch (_) {
        throwApi(
          400,
          "Value must be valid JSON",
          { key, field: "value" },
        );
      }
    }

    case "enum": {
      // Enum needs allowed values somewhere; enforce in per-key rules.
      // Here we just require non-empty.
      if (s.length === 0) {
        throwApi(
          400,
          "Value is required for enum setting",
          { key, field: "value" },
        );
      }
      return s;
    }

    default:
      throwApi(
        400,
        "Unknown setting type",
        { key, field: "type", type },
      );
  }
}

function enforceIntRange(
  key,
  value,
  {
    min = null,
    max = null,
  } = {},
) {
  if (!Number.isInteger(value)) {
    throwApi(
      400,
      "Value must be an integer",
      { key, field: "value" },
    );
  }

  if (min !== null && value < min) {
    throwApi(
      400,
      `Value must be >= ${min}`,
      { key, field: "value", min },
    );
  }

  if (max !== null && value > max) {
    throwApi(
      400,
      `Value must be <= ${max}`,
      { key, field: "value", max },
    );
  }
}

function enforceAppSettingRules(
  {
    key,
    type,
    parsed,
  },
) {
  // Rules table: encode your intent declaratively.
  const rules = {
    InviteCodeIdLength: {
      type: "integer",
      min: 8,
      max: 16,
    },
    InviteCodeTokenLength: {
      type: "integer",
      min: 8,
      max: 64,
      warnIfLessThan: 22,
    },
    EventIdLength: {
      type: "integer",
      min: 8,
      max: 16,
    },
    WriteUntilDayOffset: {
      type: "integer",
      min: 0,
      max: 30000,
    },
    StartDateDayOffset: {
      type: "integer",
      min: 0,
      max: 365,
    },
    AllowUnauthenticatedReissue: {
      type: "boolean",
    },
  };

  const rule =
    rules[key];

  // Unknown keys: allow (so you can add settings without code deploy)
  if (!rule) return;

  if (type !== rule.type) {
    throwApi(
      400,
      `Setting '${key}' must have type '${rule.type}'`,
      {
        key,
        field: "type",
        expected: rule.type,
        actual: type,
      },
    );
  }

  if (rule.type === "integer") {
    enforceIntRange(
      key,
      parsed,
      {
        min: rule.min ?? null,
        max: rule.max ?? null,
      },
    );

    if (
      rule.warnIfLessThan !== undefined &&
      parsed < rule.warnIfLessThan
    ) {
      // Not user-visible; best practical "warning"
      // You can remove this if logging isn't available in your environment.
      try {
        console.warn(
          `[application_settings] ${key} is ${parsed}, below recommended minimum ${rule.warnIfLessThan}`,
        );
      } catch (_) {}
    }
  }

  // For enum, add allowed lists per key here later, e.g.
  // if (rule.type === "enum") { if (!rule.allowed.includes(parsed)) throwApi(...) }
}
