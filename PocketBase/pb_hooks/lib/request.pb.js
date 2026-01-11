function parseOrThrowApi(schema, body) {
  const result =
    schema.safeParse(body);

  if (!result.success) {
    throwApi(
      400,
      "Invalid request body",
      { errors: result.error.issues },
    );
  }

  return result.data;
};

function requirePathParam(requestInfo, name) {
  
    const value = requestInfo?.pathParams?.[name];

    if (value === null || value === undefined || String(value).trim() === "") 
        {
        throwApi(
            400, 
            `Missing ${name}`, 
            { param: name }
        );
        }

    return String(value).trim();
}
