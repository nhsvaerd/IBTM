// <reference path="../pb_data/types.d.ts" />

onRecordUpdateRequest(
  (e) => {
    if (e.collection?.name !== "application_settings") {
      return e.next();
    }

    const body = e.requestInfo?.()?.body ?? {};

    const record = e.record;

    const key =
      String(
        body.key ?? record.getString("key"),
      ).trim();

    const type =
      String(
        body.type ?? record.getString("type"),
      ).trim();

    const rawValue = body.value ?? record.getString("value");

    const parsedValue = parseSettingByType(type, rawValue,);

    parseSettingByKey(key, parsedValue,);

    return e.next();
  },
  "application_settings",
);

const valueConstraints = {
  StartDateDayOffset: z.int().min(0).max(365),
  WriteUntilDayOffset: z.int().min(0).max(30000),
  AllowUnauthenticatedReissue: z.bool(),
  InviteCodeIdLength: z.int().min(8).max(16),
  InviteCodePasswordLength: z.int().min(8).max(64),
};

function parseSettingByType(
  type,
  raw,
) {
  try {
    switch (type) {
      case "integer":
        return z.int().parse(raw, ["value"]);

      case "string":
        return z.string().parse(raw, ["value"]);

      case "boolean":
        return z.bool().parse(raw, ["value"]);

      case "json": {
        const s =
          z.string().nonempty().parse(raw, ["value"]);

        try {
          return JSON.parse(s);
        } catch (_) {
          throw new z.ZodError([
            {
              path: ["value"],
              message: "Invalid JSON",
              code: "invalid_string",
            },
          ]);
        }
      }

      default:
        throw new z.ZodError([
          {
            path: ["type"],
            message: "Unknown type",
            code: "invalid_enum",
          },
        ]);
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Convert to your API error format
      throwApi(
        400,
        "Invalid application setting value",
        {
          key: undefined, // caller may not have one yet
          errors: err.issues,
        },
      );
    }
    throw err;
  }
}

function parseSettingByKey(
  key,
  parsedValue,
) 
{
  const rule =
    valueConstraints[key];

  // Unknown keys: allow
  if (!rule) return;

  const result =
    rule.safeParse(
      parsedValue,
      ["value"],
    );

  if (!result.success) {
    throwApi(
      400,
      "Application setting violates constraints",
      {
        key,
        errors: result.error.issues,
      },
    );
  }

  // Optional “warning” example (non-blocking):
  if (
    key === "InviteCodePasswordLength" &&
    typeof parsedValue === "number" &&
    parsedValue < 22
  ) {
    try {
      console.warn(
        `[application_settings] ${key} is ${parsedValue}; recommended minimum is 22`,
      );
    } catch (_) {}
  }
}
