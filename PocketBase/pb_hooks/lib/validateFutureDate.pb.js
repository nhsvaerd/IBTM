function validateFutureDate(
  dateTimeIso,
  {
    dayOffset = 0,
    fieldName = "dateTime",
    now = new Date(),
  } = {},
) {
  if (typeof dateTimeIso !== "string" || dateTimeIso.trim() === "") {
    throwApi(
      400,
      `Missing or invalid ${fieldName}`,
    );
  }

  if (!Number.isInteger(dayOffset) || dayOffset < 0) {
    throwApi(
      400,
      "dayOffset must be a non-negative integer",
    );
  }

  const parsed =
    new Date(dateTimeIso);

  if (Number.isNaN(parsed.getTime())) {
    throwApi(
      400,
      `${fieldName} must be a valid ISO datetime string`,
      { fieldName },
    );
  }

  // Calendar-day threshold: start of (today + dayOffset)
  const thresholdDate =
    addDaysLocal(
      startOfLocalDay(now),
      dayOffset,
    );

  if (parsed.getTime() < thresholdDate.getTime()) {
    const msg =
      dayOffset > 0
        ? `Input date must be ${dayOffset} days from today`
        : "Input date must be today or later";

    throwApi(
      400,
      msg,
      {
        fieldName,
        minIso: thresholdDate.toISOString(),
      },
    );
  }

  // Optional stricter rule for offset 0: must be later than now (not earlier today)
  if (dayOffset === 0) {
    if (parsed.getTime() <= now.getTime()) {
      throwApi(
        400,
        "Input time must be in the future",
        {
          fieldName,
          minIso: now.toISOString(),
        },
      );
    }
  }

  return parsed;
}