function isBlank(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

function throwApi(status, message, data = {}) {
  // Try the richer error type if present; fall back to BadRequestError.
  if (typeof ApiError !== "undefined") {
    throw new ApiError(
      status,
      message,
      data,
    );
  }

  // BadRequestError is 400 only; include status in payload for debugging.
  throw new BadRequestError(
    message,
    {
      status,
      ...data,
    },
  );
};

function requireString(value, field) {
  if (value === null || value === undefined) {
    throwApi(400, `Missing ${field}`, { field });
  }

  const s = String(value).trim();
  if (s.length === 0) {
    throwApi(400, `Missing ${field}`, { field });
  }

  return s;
};

function startOfLocalDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0,
    0,
    0,
    0,
  );
}

function addDaysLocal(date, days) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    0,
    0,
    0,
    0,
  );
}
