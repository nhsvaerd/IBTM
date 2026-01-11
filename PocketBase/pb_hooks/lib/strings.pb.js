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