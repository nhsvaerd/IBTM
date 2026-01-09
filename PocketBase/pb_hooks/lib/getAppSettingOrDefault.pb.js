function getAppSetting(
  app,
  key,
) {
  let record;

  try {
    record = app.findFirstRecordByFilter(
      "application_settings",
      "key = {:key}",
      { key },
    );
  } catch (_) {
    throwApi(
      500,
      "Missing application setting",
      { key },
    );
  }

  const type =
    record.get("type");

  const rawValue =
    record.get("value");

  if (isBlank(type)) {
    throwApi(
      500,
      "Application setting has no type",
      { key },
    );
  }

  if (rawValue === null || rawValue === undefined) {
    throwApi(
      500,
      "Application setting has no value",
      { key },
    );
  }

  switch (type) {
    case "integer": {
      const parsed =
        Number(rawValue);

      if (
        Number.isNaN(parsed) ||
        !Number.isInteger(parsed)
      ) {
        throwApi(
          500,
          "Invalid integer application setting value",
          {
            key,
            value: rawValue,
          },
        );
      }

      return parsed;
    }

    case "string": {
      return String(rawValue);
    }

    case "boolean": {
      if (
        rawValue !== "true" &&
        rawValue !== "false"
      ) {
        throwApi(
          500,
          "Invalid boolean application setting value",
          {
            key,
            value: rawValue,
          },
        );
      }

      return rawValue === "true";
    }

    case "json": {
      try {
        return JSON.parse(rawValue);
      } catch (_) {
        throwApi(
          500,
          "Invalid JSON application setting value",
          {
            key,
            value: rawValue,
          },
        );
      }
    }

    default:
      throwApi(
        500,
        "Unknown application setting type",
        {
          key,
          type,
        },
      );
  }
};

function getAppSettingOrDefault(app, key, fallback) {
  try {
    return getAppSetting(app, key);
  } catch (_) {
    return fallback;
  }
};