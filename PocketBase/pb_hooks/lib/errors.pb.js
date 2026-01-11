function throwApi(status, message, data = {}) {
  // Try the richer error type if present
  if (typeof ApiError !== "undefined") {
    throw new ApiError(
      status,
      message,
      data,
    );
  }
  // Fallback. 400 only: Status in payload.
  throw new BadRequestError(
    message,
    {
      status,
      ...data,
    },
  );
};

function throwZodAsApi(err, message = "Invalid input") {
  if (err instanceof z.ZodError) {
    throwApi(400, message, { errors: err.issues });
  }
  throw err;
};