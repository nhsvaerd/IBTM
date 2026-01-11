## Folder Structure

```
PocketBase
  pb_hooks
    event.create.pb.js
    event.invite.pb.js
    event.register.pb.js
    lib
      dates.pb.js
      errors.pb.js
      getAppSettingOrDefault.pb.js
      isBlank.pb.js
      pocketZod.pb.js
      request.pb.js
      strings.pb.js
    pb_schema.json
    registrant.invite-reissue-by-host.pb.js
    registrant.invite-reissue.pb.js
    schemaFields.pb.js
    updateValidation
      application_settings.pb.js
      registrants.pb.js

```

### PocketBase\pb_hooks\event.create.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/create", 
    (e) => {
        const requestInfo =
        e.requestInfo?.() ?? {};

        const requestBody =
        requestInfo.body ?? {};

        const eventCreateSchema =
        z.object(
            {
                ownerName: schemaFields.registrant.name,
                title: schemaFields.event.title,
                startTime: schemaFields.event.startTime,
                ownerEmail: schemaFields.registrant.email.optional(),
            }
        ).strict();

        const input = parseOrThrowApi(eventCreateSchema, requestBody,);

        const ownerName = input.ownerName;
    
        const eventTitle = input.title;
    
        const startTimeInput = input.startTime;
    
        const ownerEmail = input.ownerEmail;

        // Check valid startTime
        const dayOffset = getAppSettingOrDefault(e.app, "StartDateDayOffset", 1,);
        
        const startTime = validateFutureDate(startTimeInput,{dayOffset});

        // Set writeUntil
        const writeUntilOffset = getAppSettingOrDefault(e.app, "WriteUntilDayOffset", 1,);

        const writeUntil = addDaysLocal(startTime, writeUntilOffset,);
        
        let responseBody;

        e.app.runInTransaction(
            (txApp) => {
                const newEvent = createNewEvent(
                    txApp,
                    {
                        eventTitle,
                        startTime,
                        writeUntil,
                    }
                );
                const newOwner = createNewHost(
                txApp,
                    {
                        eventId: newEvent.eventId,
                        hostName: ownerName,
                        hostEmail: ownerEmail,
                    }
                );
                
                const newEventRecord = txApp.findRecordById("events",newEvent.eventId);

                newEventRecord.set("owning_host", newOwner.recordId);

                txApp.save(newEventRecord);

                responseBody = {
                    "eventId": newEvent.eventId,
                    "ownerId": newOwner.recordId,
                    "inviteCode": newOwner.inviteCode,
                }
            }
        );

        return e.json(
            200,
            responseBody,
        );
    }
);

function createNewHost(
    app,
        {
            eventId,
            hostName,
            hostEmail,
        },
    ) 
    {
    const record =
        new Record(
            app.findCollectionByNameOrId(
                "registrants",
            ),
        );

    const password = $security.randomString(24);

    const inviteId = $security.randomString(12);

    const inviteCode = `${inviteId}.${password}`;

    record.setPassword(password,);

    record.set("invite_id", inviteId,);

    record.set("event", eventId,);

    record.set("name", hostName,);
    
    record.set("is_host", true,);

    if (!isBlank(hostEmail)) {
        record.set(
            "registrant_email",
            hostEmail,
        );
    }

    try {
        app.save(record);
    } catch (err) {
        // Optional addition: Detect unique constraint errors and return 409
        throwApi(
            500,
            "Failed to create registrant",
        );
    }

    return {
        recordId: record.id,
        inviteId,
        inviteCode,
    };
};

function createNewEvent(
    app,
    {
        eventTitle, 
        startTime,
        writeUntil,
    }
) 
{
    const record = 
    new Record(
        app.findCollectionByNameOrId(
            "events")
    )

    record.set("title", eventTitle);
    record.set("start_time", startTime.toISOString());
    record.set("write_until", writeUntil.toISOString())

    try {
        app.save(record);
    } catch (err) {
        throwApi(
            500,
            "Unknown error"
        );
    }

    return {
        eventId: record.id,
    }
};
```

### PocketBase\pb_hooks\event.invite.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite",
  (e) => {
    const requestInfo = e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requirePathParam(requestInfo, "eventId");

    const auth = e.auth;
    if (!auth?.id) {
      throwApi(
        401,
        "Invite creation requires authentication",
      );
    };

    const eventInviteSchema =
    z.object(
      {
        name: schemaFields.registrant.name,
        email: schemaFields.registrant.email,
        isHost: schemaFields.registrant.isHost.optional(),
      }
    ).strict();

    const input = parseOrThrowApi(eventInviteSchema, requestBody,);

    const registrantName = input.name;

    const registrantEmail = input.email ?? "";

    const invitedAsHost = !!input.isHost;

    let responseBody;

    e.app.runInTransaction(
        (txApp) => {
        // Event load
        let event;
        try {
            event = txApp.findRecordById(
            "events",
            eventId,
            );
        } catch (_) {
            throwApi(
            404,
            "Event not found",
            { eventId },
            );
        }

        // Registrant check
        let requestingAgent;
        try {
          requestingAgent = txApp.findFirstRecordByFilter(
            "registrants",
            "id = {:id} && event = {:eventId}",
            {
                id: auth.id,
                eventId,
            },
            );
        } catch (_) {
            throwApi(
            403,
            "Not authorized for this event",
            { eventId },
            );
        }

        if (!requestingAgent.getBool("is_host")) {
            throwApi(
                403,
                "Host privileges required",
                { eventId },
            );
        }

        // Owner check
        if (invitedAsHost) {
          const ownerId =
            String(
                event.get(
                "owning_host",
                ) ?? "",
            );

          if (ownerId && ownerId !== requestingAgent.id) {
            throwApi(
                403,
                "Only the event owner can assign host privileges",
                { eventId },
            );
          }
        }

        // Capacity check (transaction-safe)
        const maxAttendants =
            event.getInt("max_attendants",);

        if (maxAttendants > 0) {
          const registeredCount =
            txApp.countRecords(
                "registrants",
                "event = {:eventId}",
                { eventId },
            );

          if (registeredCount >= maxAttendants) {
            throwApi(
              409,
              "Number of invites/registrants has reached maximum attendants for the event",
                {
                eventId,
                maxAttendants,
                },
            );
          }
        }

        // Duplicate email check
        if (registrantEmail) {
            const existingEmail =
            txApp.countRecords(
                "registrants",
                "event = {:eventId} && registrant_email = {:email}",
                {
                    eventId: eventId,
                    email: registrantEmail,
                }
            );

            if (existingEmail > 0) {
                throwApi(
                    409,
                    "Provided email already registered for this event",
                )
            }
        }        

        const newRegistrant =
          createNewRegistrant(
            txApp,
            {
              eventId,
              registrantName,
              registrantEmail,
              isHost: invitedAsHost,
            },
          );

        responseBody = {
          eventId,
          registrantId: newRegistrant.recordId,
          inviteId: newRegistrant.inviteId,
          inviteCode: newRegistrant.inviteCode,
        };
      },
    );

    return e.json(
      200,
      responseBody,
    );
  },
);

function createNewRegistrant(
  app,
  {
    eventId,
    registrantName,
    registrantEmail,
    isHost,
  },
) {
  const record =
    new Record(
      app.findCollectionByNameOrId(
        "registrants",
      ),
    );

  const password =
    $security.randomString(24);

  const inviteId =
    $security.randomString(12);

  const inviteCode =
    `${inviteId}.${password}`;

  record.setPassword(
    password,
  );

  record.set(
    "invite_id",
    inviteId,
  );

  record.set(
    "event",
    eventId,
  );

  record.set(
    "name",
    registrantName,
  );

  if (!isBlank(registrantEmail)) {
    record.set(
      "registrant_email",
      registrantEmail,
    );
  }

  record.set(
    "is_host",
    !!isHost,
  );

  try {
    app.save(record);
  } catch (err) {
    // Optional: Translate uniqueness violations to 409
    throwApi(
      500,
      "Failed to create registrant",
    );
  }

  return {
    recordId: record.id,
    inviteId,
    inviteCode,
  };
}

```

### PocketBase\pb_hooks\event.register.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/register",
  (e) => {
    const requestInfo = e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requirePathParam(requestInfo, "eventId");

    const eventRegisterSchema =
    z.object (
      {
        name: schemaFields.registrant.name,
        email: schemaFields.registrant.email.optional(),
      }
    )

    const input = parseOrThrowApi(eventRegisterSchema, requestBody,);

    const registrantName = input.name;

    const registrantEmail = input.email ?? "";

    let responseBody;

    e.app.runInTransaction(
      (txApp) => {
        let event;
        try {
          event = txApp.findRecordById(
            "events",
            eventId,
          );
        } catch (_) {
          throwApi(
            404,
            "Event not found",
            { eventId },
          );
        }

        if (event.getBool("is_private")) {
          throwApi(
            403,
            "Event is private and invite only",
            { eventId },
          );
        }

        // Check duplicate auth token
        const auth = e.auth;

        if (auth?.id) {
            const existingRegistrant = txApp.countRecords(
              "registrants",
              "id = {:id} && event = {:eventId}",
              {
                id: auth.id,
                eventId,
              },
            );

            if (existingRegistrant > 0) {
                throwApi(
                  409,
                  "Already registered for this event",
                  { eventId },
                );
            }
        }
        
        // Check duplicate email
        if (registrantEmail) {
          const existingEmail = txApp.countRecords(
            "registrants",
            "event = {:eventId} && registrant_email = {:email}",
            {
              eventId: eventId,
              email: registrantEmail,
            }
          );

          if (existingEmail > 0) {
              throwApi(
                409,
                "Provided email already registered for this event",
              )
          }
        }

        // Check capacity
        const maxAttendants = event.getInt("max_attendants",);

        if (maxAttendants > 0) {
          const currentCount = txApp.countRecords(
            "registrants",
            "event = {:eventId}",
            { eventId },
          );

          if (currentCount >= maxAttendants) {
            throwApi(
              409,
              "Event is full",
              {
                eventId,
                maxAttendants,
              },
            );
          }
        }

        const newRegistrant = createNewRegistrant(
          txApp,
          {
            eventId,
            registrantName,
            registrantEmail,
          },
        );

        responseBody = {
          "eventId": eventId,
          "registrantId": newRegistrant.recordId,
          "inviteId": newRegistrant.inviteId,
          "inviteCode": newRegistrant.inviteCode,
        };
      },
    );

    return e.json(
      200,
      responseBody,
    );
  },
);

function createNewRegistrant(
    app,
    {
      eventId,
      registrantName,
      registrantEmail,
    },
  ) 
  {
  const record =
    new Record(
      app.findCollectionByNameOrId("registrants",),
    );

  const password = $security.randomString(24);

  const inviteId = $security.randomString(12);

  const inviteCode = `${inviteId}.${password}`;

  record.setPassword(password,);

  record.set(
    "invite_id",
    inviteId,
  );

  record.set(
    "event",
    eventId,
  );

  record.set(
    "name",
    registrantName,
  );

  if (!isBlank(registrantEmail)) {
    record.set(
      "registrant_email",
      registrantEmail,
    );
  }

  try {
    app.save(record);
  } catch (err) {
    // Optional addition: Detect unique constraint errors and return 409
    throwApi(
      500,
      "Failed to create registrant",
    );
  }

  return {
    recordId: record.id,
    inviteId,
    inviteCode,
  };
}
```

### PocketBase\pb_hooks\lib\dates.pb.js

```js
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
};

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
};

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
};
```

### PocketBase\pb_hooks\lib\errors.pb.js

```js
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
```

### PocketBase\pb_hooks\lib\getAppSettingOrDefault.pb.js

```js
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
```

### PocketBase\pb_hooks\lib\isBlank.pb.js

```js
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

```

### PocketBase\pb_hooks\lib\pocketZod.pb.js

```js
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

```

### PocketBase\pb_hooks\lib\request.pb.js

```js
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

```

### PocketBase\pb_hooks\lib\strings.pb.js

```js
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
```

### PocketBase\pb_hooks\pb_schema.json

```json
[
    {
        "id": "pbc_42490191812",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "registrants",
        "type": "auth",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text3930158919",
                "max": 16,
                "min": 8,
                "name": "invite_id",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_4041782348",
                "hidden": false,
                "id": "relation1001261735",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "event",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text1579384326",
                "max": 200,
                "min": 2,
                "name": "name",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "exceptDomains": [],
                "hidden": false,
                "id": "email1513173",
                "name": "registrant_email",
                "onlyDomains": [],
                "presentable": false,
                "required": false,
                "system": false,
                "type": "email"
            },
            {
                "hidden": false,
                "id": "bool1523858908",
                "name": "is_host",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "cascadeDelete": false,
                "collectionId": "_pb_users_auth_",
                "hidden": false,
                "id": "relation2375276105",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "user",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "date1323900893",
                "max": "",
                "min": "",
                "name": "checked_in_at",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "hidden": false,
                "id": "date4059440156",
                "max": "",
                "min": "",
                "name": "access_revoked_at",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text3373526761",
                "max": 800,
                "min": 0,
                "name": "access_revoked_reason",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "cost": 0,
                "hidden": true,
                "id": "password901924565",
                "max": 64,
                "min": 8,
                "name": "password",
                "pattern": "",
                "presentable": false,
                "required": true,
                "system": true,
                "type": "password"
            },
            {
                "exceptDomains": null,
                "hidden": false,
                "id": "email3885137012",
                "name": "email",
                "onlyDomains": null,
                "presentable": false,
                "required": false,
                "system": true,
                "type": "email"
            },
            {
                "hidden": false,
                "id": "bool256245529",
                "name": "verified",
                "presentable": false,
                "required": false,
                "system": true,
                "type": "bool"
            },
            {
                "hidden": false,
                "id": "bool1547992806",
                "name": "emailVisibility",
                "presentable": false,
                "required": false,
                "system": true,
                "type": "bool"
            },
            {
                "autogeneratePattern": "[a-zA-Z0-9]{50}",
                "hidden": true,
                "id": "text2504183744",
                "max": 60,
                "min": 30,
                "name": "tokenKey",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": true,
                "type": "text"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX `idx_tokenKey_1xkldq5u5v` ON `registrants` (`tokenKey`)",
            "CREATE UNIQUE INDEX `idx_email_1xkldq5u5v` ON `registrants` (`email`) WHERE `email` != ''",
            "CREATE UNIQUE INDEX `idx_aaHz7Xltda` ON `registrants` (`invite_id`)",
            "CREATE UNIQUE INDEX `idx_vKt2xsbkhT` ON `registrants` (\n  `registrant_email`,\n  `event`\n) WHERE registrant_email != '' ",
            "CREATE INDEX `idx_WqZCuRRHao` ON `registrants` (`event`)",
            "CREATE INDEX `idx_4FminYCPu8` ON `registrants` (`user`)"
        ],
        "system": false,
        "authRule": "",
        "manageRule": null,
        "authAlert": {
            "enabled": false,
            "emailTemplate": {
                "subject": "Login from a new location",
                "body": "<p>Hello,</p>\n<p>We noticed a login to your {APP_NAME} account from a new location:</p>\n<p><em>{ALERT_INFO}</em></p>\n<p><strong>If this wasn't you, you should immediately change your {APP_NAME} account password to revoke access from all other locations.</strong></p>\n<p>If this was you, you may disregard this email.</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
            }
        },
        "oauth2": {
            "mappedFields": {
                "id": "",
                "name": "",
                "username": "",
                "avatarURL": ""
            },
            "enabled": false
        },
        "passwordAuth": {
            "enabled": true,
            "identityFields": [
                "invite_id"
            ]
        },
        "mfa": {
            "enabled": false,
            "duration": 1800,
            "rule": ""
        },
        "otp": {
            "enabled": false,
            "duration": 180,
            "length": 8,
            "emailTemplate": {
                "subject": "OTP for {APP_NAME}",
                "body": "<p>Hello,</p>\n<p>Your one-time password is: <strong>{OTP}</strong></p>\n<p><i>If you didn't ask for the one-time password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
            }
        },
        "authToken": {
            "duration": 604800
        },
        "passwordResetToken": {
            "duration": 1800
        },
        "emailChangeToken": {
            "duration": 1800
        },
        "verificationToken": {
            "duration": 259200
        },
        "fileToken": {
            "duration": 180
        },
        "verificationTemplate": {
            "subject": "Verify your {APP_NAME} email",
            "body": "<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-verification/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Verify</a>\n</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        },
        "resetPasswordTemplate": {
            "subject": "Reset your {APP_NAME} password",
            "body": "<p>Hello,</p>\n<p>Click on the button below to reset your password.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Reset password</a>\n</p>\n<p><i>If you didn't ask to reset your password, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        },
        "confirmEmailChangeTemplate": {
            "subject": "Confirm your {APP_NAME} new email address",
            "body": "<p>Hello,</p>\n<p>Click on the button below to confirm your new email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-email-change/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Confirm new email</a>\n</p>\n<p><i>If you didn't ask to change your email address, you can ignore this email.</i></p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>"
        }
    },
    {
        "id": "pbc_927927318",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "additional_attributes",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text245846248",
                "max": 0,
                "min": 0,
                "name": "label",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select2363381545",
                "maxSelect": 1,
                "name": "type",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "select",
                "values": [
                    "Paragraph",
                    "Location",
                    "URL",
                    "Album"
                ]
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text3685223346",
                "max": 0,
                "min": 0,
                "name": "body",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "exceptDomains": null,
                "hidden": false,
                "id": "url4101391790",
                "name": "url",
                "onlyDomains": null,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "url"
            },
            {
                "hidden": false,
                "id": "geoPoint378301449",
                "name": "location_geo",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "geoPoint"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX `idx_xrX1Ir9pm2` ON `additional_attributes` (`label`)"
        ],
        "system": false
    },
    {
        "id": "pbc_3908775312",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "additional_questions",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text245846248",
                "max": 0,
                "min": 0,
                "name": "label",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select2363381545",
                "maxSelect": 1,
                "name": "type",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "select",
                "values": [
                    "Choice",
                    "MultiChoice",
                    "Boolean",
                    "Text"
                ]
            },
            {
                "hidden": false,
                "id": "json3493198471",
                "maxSize": 0,
                "name": "options",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "json"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [],
        "system": false
    },
    {
        "id": "pbc_1503202129",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "application_settings",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text2324736937",
                "max": 0,
                "min": 0,
                "name": "key",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "select2363381545",
                "maxSelect": 1,
                "name": "type",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "select",
                "values": [
                    "integer",
                    "string",
                    "json",
                    "boolean"
                ]
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text494360628",
                "max": 0,
                "min": 0,
                "name": "value",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX `idx_OVv9KuB7iH` ON `application_settings` (`key`)"
        ],
        "system": false
    },
    {
        "id": "pbc_2150159679",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "assets",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "file3309110367",
                "maxSelect": 1,
                "maxSize": 0,
                "mimeTypes": [],
                "name": "file",
                "presentable": false,
                "protected": false,
                "required": false,
                "system": false,
                "thumbs": [],
                "type": "file"
            },
            {
                "hidden": false,
                "id": "select2363381545",
                "maxSelect": 1,
                "name": "type",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "select",
                "values": [
                    "Background image"
                ]
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [],
        "system": false
    },
    {
        "id": "pbc_4041782348",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "events",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text724990059",
                "max": 850,
                "min": 0,
                "name": "title",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_42490191812",
                "hidden": false,
                "id": "relation2103652596",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "owning_host",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "date1345189255",
                "max": "",
                "min": "",
                "name": "start_time",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "date"
            },
            {
                "hidden": false,
                "id": "date1096160257",
                "max": "",
                "min": "",
                "name": "end_time",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text3586931371",
                "max": 120,
                "min": 0,
                "name": "location_label",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "geoPoint378301449",
                "name": "location_geo",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "geoPoint"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text1843675174",
                "max": 0,
                "min": 0,
                "name": "description",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_2150159679",
                "hidden": false,
                "id": "relation2484770424",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "background_image",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "number2412187558",
                "max": 10000000000,
                "min": null,
                "name": "max_attendants",
                "onlyInt": true,
                "presentable": false,
                "required": false,
                "system": false,
                "type": "number"
            },
            {
                "hidden": false,
                "id": "bool775214973",
                "name": "is_private",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "hidden": false,
                "id": "json607041951",
                "maxSize": 0,
                "name": "additional_attributes",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "json"
            },
            {
                "hidden": false,
                "id": "json3856069256",
                "maxSize": 0,
                "name": "additional_questions",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "json"
            },
            {
                "hidden": false,
                "id": "date3500824919",
                "max": "",
                "min": "",
                "name": "read_until",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "hidden": false,
                "id": "date4221960274",
                "max": "",
                "min": "",
                "name": "write_until",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "hidden": false,
                "id": "bool2798380904",
                "name": "is_registrant_email_required",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX `idx_JjJzIuNrJF` ON `events` (`owning_host`)"
        ],
        "system": false
    },
    {
        "id": "pbc_3607937828",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "images",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_4041782348",
                "hidden": false,
                "id": "relation1001261735",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "event",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "file3309110367",
                "maxSelect": 1,
                "maxSize": 0,
                "mimeTypes": [],
                "name": "image",
                "presentable": false,
                "protected": false,
                "required": false,
                "system": false,
                "thumbs": [],
                "type": "file"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text975751238",
                "max": 0,
                "min": 0,
                "name": "album_name",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": false,
                "system": false,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [],
        "system": false
    },
    {
        "id": "pbc_1433696524",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "responses",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "cascadeDelete": true,
                "collectionId": "pbc_42490191812",
                "hidden": false,
                "id": "relation1712544448",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "registrant",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_4041782348",
                "hidden": false,
                "id": "relation1001261735",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "event",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "select3497176377",
                "maxSelect": 1,
                "name": "attendance_response",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "select",
                "values": [
                    "attending",
                    "not_attending",
                    "undecided"
                ]
            },
            {
                "hidden": false,
                "id": "json1582643657",
                "maxSize": 0,
                "name": "additional_responses",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "json"
            },
            {
                "hidden": false,
                "id": "date3973590776",
                "max": "",
                "min": "",
                "name": "responded_attendance_at",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "date"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [
            "CREATE UNIQUE INDEX `idx_pistJ3gOmD` ON `responses` (`registrant`)",
            "CREATE INDEX `idx_zPe7w8ky8T` ON `responses` (`event`)"
        ],
        "system": false
    },
    {
        "id": "pbc_1125843985",
        "listRule": null,
        "viewRule": null,
        "createRule": null,
        "updateRule": null,
        "deleteRule": null,
        "name": "posts",
        "type": "base",
        "fields": [
            {
                "autogeneratePattern": "[a-z0-9]{15}",
                "hidden": false,
                "id": "text3208210256",
                "max": 15,
                "min": 15,
                "name": "id",
                "pattern": "^[a-z0-9]+$",
                "presentable": false,
                "primaryKey": true,
                "required": true,
                "system": true,
                "type": "text"
            },
            {
                "hidden": false,
                "id": "bool3268062305",
                "name": "edited",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_4041782348",
                "hidden": false,
                "id": "relation1001261735",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "event",
                "presentable": false,
                "required": true,
                "system": false,
                "type": "relation"
            },
            {
                "autogeneratePattern": "",
                "hidden": false,
                "id": "text3065852031",
                "max": 2500,
                "min": 1,
                "name": "message",
                "pattern": "",
                "presentable": false,
                "primaryKey": false,
                "required": true,
                "system": false,
                "type": "text"
            },
            {
                "cascadeDelete": false,
                "collectionId": "pbc_42490191812",
                "hidden": false,
                "id": "relation1712544448",
                "maxSelect": 1,
                "minSelect": 0,
                "name": "registrant",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "relation"
            },
            {
                "hidden": false,
                "id": "bool24025353",
                "name": "is_flagged",
                "presentable": false,
                "required": false,
                "system": false,
                "type": "bool"
            },
            {
                "hidden": false,
                "id": "autodate2990389176",
                "name": "created",
                "onCreate": true,
                "onUpdate": false,
                "presentable": false,
                "system": false,
                "type": "autodate"
            },
            {
                "hidden": false,
                "id": "autodate3332085495",
                "name": "updated",
                "onCreate": true,
                "onUpdate": true,
                "presentable": false,
                "system": false,
                "type": "autodate"
            }
        ],
        "indexes": [],
        "system": false
    }
]
```

### PocketBase\pb_hooks\registrant.invite-reissue-by-host.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite-reissue-by-host",
  (e) => {
    const requestInfo = e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requirePathParam(requestInfo, "eventId");

    const inviteReissueByHostSchema =
    z.object (
      {
        registrantId: schemaFields.registrant.id,
      }
    );

    const input = parseOrThrowApi(inviteReissueByHostSchema, requestBody,);
    
    const transactionResult = 
      e.app.runInTransaction(
      (txApp) => {
        // Event load
        let event;
        try {
            event = txApp.findRecordById(
            "events",
            eventId,
            );
        } catch (_) {
            throwApi(
            404,
            "Event not found",
            { eventId },
            );
        }

        // Auth check
        const auth = e.auth;
        if (!auth?.id) {
          throwApi(401, "Authentication required");
        };
          
        // Registrant check
        let requestingAgent;
        try {
          requestingAgent = txApp.findFirstRecordByFilter(
            "registrants",
            "id = {:id} && event = {:eventId}",
            {
                id: auth.id,
                eventId,
            },
            );
        } catch (_) {
            throwApi(
            403,
            "Not authorized for this event",
            { eventId },
            );
        }

        // Registrant event check
        const record = 
          txApp.findRecordById("registrants", input.registrantId,);
        
        if (String(record.get("event")) !== String(eventId)) {
          throwApi(
            403, 
            "Provided registrant is not registered for this event",
          );
        }

        // IsHost Check
        if (!requestingAgent.getBool("is_host")) {
            throwApi(
                403,
                "Host privileges required",
                { eventId },
            );
        }

        const password = $security.randomString(24);

        const inviteId = record.getString("invite_id");

        const newInviteCode = `${inviteId}.${password}`;

        record.setPassword(password);

        txApp.save(record);

        return {newInviteCode,};
      }
    );

    return e.json (200, transactionResult); //Replace with sending email
  },
);

```

### PocketBase\pb_hooks\registrant.invite-reissue.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite-reissue",
  (e) => {
    const allowEndpoint = getAppSettingOrDefault(e.app, "AllowUnauthenticatedReissue", false,);

    if (allowEndpoint = false) {
        throwApi(
            403,
            "New invite code must be aquired from event host"
        )
    };

    const requestInfo = e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requirePathParam(requestInfo, "eventId");

    const requestSpec = {
        name: {
            type: "string",
            required: true,
            minLength: 1,
            maxLength: 250,
        },
        email: {
            type: "email",
            required: true,
        },
    };

    const inviteReissueSchema =
    z.object (
        {
            name: schemaFields.registrant.name,
            email: schemaFields.registrant.email,
        }
    );

    const input = parseOrThrowApi(inviteReissueSchema, requestBody,);

    const registrantName = input.name;
    const registrantEmail = input.email;
    
    const transactionResult = e.app.runInTransaction(
        (txApp) => {
            // Event load
            let event;
            try {
                event = txApp.findRecordById(
                "events",
                eventId,
                );
            } catch (_) {
                throwApi(
                404,
                "Event not found",
                { eventId },
                );
            };

            // Check duplicate auth token
            const auth = e.auth;

            if (auth?.id) {
                const existingRegistrant = txApp.countRecords(
                "registrants",
                "id = {:id} && event = {:eventId}",
                {
                    id: auth.id,
                    eventId,
                },
                );

                if (existingRegistrant > 0) {
                    throwApi(
                    409,
                    "Already authenticated for this event",
                    { eventId },
                    );
                }
            };

            // Load registrant
            const record = txApp.findFirstRecordByFilter(
                "registrants",
                "event = {:eventId} && name = {:name} && registrant_email = {:email}",
                {
                    eventId: eventId,
                    name: registrantName,
                    email: registrantEmail,
                }
            );

            if (!record) {
                throwApi(
                    404,
                    "Registrant not found",
                )
            };

            const inviteId = record.getString("invite_id");

            const password = $security.randomString(24);

            const newInviteCode = `${inviteId}.${password}`;

            record.setPassword(password);

            txApp.save(record);

            return {newInviteCode,};
        }
    );
    
    return e.json(200, transactionResult) //Replace with sending email before release

    },
);
```

### PocketBase\pb_hooks\schemaFields.pb.js

```js
const schemaFields = {
    registrant: {
        id: () => z.string().min(8).max(64),
        name: () => z.string().min(1).max(200),
        email: () => z.string().email().max(254),
        isHost: () => z.bool(),
    },
    event: {
        id: () => z.string().min(8).max(64),
        title: () => z.string().min(1).max(200),
        startTime: () => z.datetime(),
    },
}
```

### PocketBase\pb_hooks\updateValidation\application_settings.pb.js

```js
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
  StartDateDayOffset:
    z.int().min(0).max(365),

  WriteUntilDayOffset:
    z.int().min(0).max(30000),

  AllowUnauthenticatedReissue:
    z.bool(),

  InviteCodeIdLength:
    z.int().min(8).max(16),

  InviteCodePasswordLength:
    z.int().min(8).max(64),
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
        // choose whether empty is allowed
        return z.string().optional().parse(raw, ["value"]) ?? "";

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

```

### PocketBase\pb_hooks\updateValidation\registrants.pb.js

```js
// <reference path="..\pb_data\types.d.ts" />

onRecordUpdateRequest(
  (e) => {
    if (e.collection?.name !== "registrants") return e.next();

    const body = e.requestInfo()?.body || {};

    if (Object.prototype.hasOwnProperty.call(body, "invite_id")) {
      throw new BadRequestError(
      "invite_id cannot be changed once created.",
      { field: "invite_id" },
          );
    };

    if (Object.prototype.hasOwnProperty.call(body, "event")) {
      throw new BadRequestError(
        "event cannot be changed once event registrant is created.",
        { field: "event" },
      );
    }

    return e.next();
  }, 
  "registrants"
);

```
