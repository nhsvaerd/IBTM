- Total files: 11

## Folder Structure

```
PocketBase
  pb_hooks
    event.create.pb.js
    event.invite.pb.js
    event.register.pb.js
    lib
      getAppSetting.pb.js
      utilityFunctions.pb..js
      validateFutureDate.pb.js
      validateRequest.pb.js
    registrant.invite-reissue-by-host.pb.js
    registrant.invite-reissue.pb..js
    updateValidationHooks
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

        const requestSpec = {
            ownerName: {
            type: "string",
            required: true,
            minLength: 2,
            maxLength: 200,
            },
            title: {
            type: "string",
            required: true,
            minLength: 1,
            maxLength: 200,
            },       
            startTime: {
            type: "datetime",
            required: true,
            },
            ownerEmail: {
            type: "email",
            required: false,
            },
        }

        const input = 
            validateRequest(
                requestBody,
                requestSpec
            );

        const ownerName = input.ownerName;
    
        const eventTitle = input.title;
    
        const startTime = input.startTime;
    
        const ownerEmail = input.ownerEmail; //Optional: Full email validation

        // Check valid startTime
        let dayOffset = getAppSetting(e.app, "StartDateDayOffset");
        dayOffset = isBlank(dayOffset) ? 1 : dayOffset;
        
        validateFutureDate(startTime,{dayOffset});

        // Set writeUntil
        let writeUntilOffset = getAppSetting(e.app, "WriteUntilDayOffset");
        writeUntilOffset = isBlank(writeUntilOffsetOffset) ? 14 : writeUntilOffset;

        const writeUntil = addDaysLocal(startTime,writeUntilOffset);
        
        let responseBody;

        e.app.runInTransaction(
            (txApp) => {
                const newEvent = createNewEvent(
                    txApp,
                    {
                        eventTitle,
                        startTime
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
    }
) 
{
    const record = 
    new Record(
        app.findCollectionByNameOrId(
            "events")
    )

    record.set("title", eventTitle);
    record.set("start_time", startTime);
    record.set("write_until", writeUntilOffset)

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
    const requestInfo =
      e.requestInfo?.() ?? {};

    const requestBody =
      requestInfo.body ?? {};

    const eventId =
      requestInfo.pathParams?.eventId;

    if (!eventId) {
      throwApi(
        400,
        "Missing eventId",
      );
    }

    const requestSpec = {
      name: {
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      email: {
        type: "email",
        required: false,
      },
      isHost: {
        type: "bool",
        required: false,
        default: false,
      },
    };

    const input =
    validateRequest(
        requestBody,
        requestSpec,
    );

    const registrantName =
    input.name;

    const registrantEmail =
    input.email ?? "";

    const invitedAsHost =
    !!input.isHost;

    // Authentication check
    const auth =
    e.auth;

    if (!auth?.id) {
        throwApi(
        401,
        "Host invite requires authentication",
        );
    }

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
                "event = {:eventId} && email = {:email}",
                {
                    eventId,
                    registrantEmail,
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

    const eventId =requestInfo.pathParams?.eventId;

    if (!eventId) {
      throwApi(400, "Missing eventId",)
    }

    const requestSpec = {
      name: {
        type: "string",
        required: true,
        minLength: 1,
        maxLength: 200,
      },
      email: {
        type: "email",
        required: false,
      },
    };

    const input = validateRequest(
      requestBody,
      requestSpec,
    );

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
        const auth =
          txApp.auth;

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
            "event = {:eventId} && email = {:email}",
            {
              eventId,
              registrantEmail,
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

### PocketBase\pb_hooks\lib\getAppSetting.pb.js

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
}
```

### PocketBase\pb_hooks\lib\utilityFunctions.pb..js

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

```

### PocketBase\pb_hooks\lib\validateFutureDate.pb.js

```js
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
```

### PocketBase\pb_hooks\lib\validateRequest.pb.js

```js
function validateRequest(body, spec, opts = {}) {
  const mode = opts.mode ?? "throw"; // "throw" | "return"
  const out = {};
  const errors = [];

  function addError(field, message, meta = {}) {
    errors.push(
      {
        field,
        message,
        ...meta,
      },
    );
  }

  for (const field in spec) {
    const rule = spec[field] || {};
    const required = !!rule.required;
    const type = rule.type || "any";

    const raw = body?.[field];

    const isMissing =
      raw === null ||
      raw === undefined ||
      (typeof raw === "string" && raw.trim().length === 0);

    if (isMissing) {
      if (required) {
        addError(
          field,
          "Missing required field",
          { type },
        );
      } else if ("default" in rule) {
        out[field] = rule.default;
      }
      continue;
    }

    // Type parsing / normalization
    switch (type) {
      case "string": {
        const s = String(raw).trim();
        if (rule.minLength !== undefined && s.length < rule.minLength) {
          addError(field, `Must be at least ${rule.minLength} characters`);
          break;
        }
        if (rule.maxLength !== undefined && s.length > rule.maxLength) {
          addError(field, `Must be at most ${rule.maxLength} characters`);
          break;
        }
        out[field] = s;
        break;
      }

      case "email": {
        const s = String(raw).trim();
        // Baseline validation only.
        if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) {
          addError(field, "Invalid email format");
          break;
        }
        out[field] = s;
        break;
      }

      case "enum": {
        const s = String(raw).trim();
        const allowed = rule.allowed || [];
        if (!allowed.includes(s)) {
          addError(
            field,
            "Invalid value",
            { allowed },
          );
          break;
        }
        out[field] = s;
        break;
      }

      case "int": {
        const n = typeof raw === "number" ? raw : Number(String(raw).trim());
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
          addError(field, "Must be an integer");
          break;
        }
        if (rule.min !== undefined && n < rule.min) {
          addError(field, `Must be >= ${rule.min}`);
          break;
        }
        if (rule.max !== undefined && n > rule.max) {
          addError(field, `Must be <= ${rule.max}`);
          break;
        }
        out[field] = n;
        break;
      }

      case "bool": {
        if (typeof raw === "boolean") {
          out[field] = raw;
          break;
        }
        const s = String(raw).trim().toLowerCase();
        if (s === "true" || s === "1" || s === "yes") {
          out[field] = true;
          break;
        }
        if (s === "false" || s === "0" || s === "no") {
          out[field] = false;
          break;
        }
        addError(field, "Must be a boolean");
        break;
      }

      case "datetime": {
        const s = String(raw).trim();

        const hasTimezone =
          /[zZ]$/.test(s) || /[+\-]\d{2}:\d{2}$/.test(s);

        if (!hasTimezone) {
          addError(field, "Datetime must include timezone (Z or ±HH:MM)");
          break;
        }

        const d = new Date(s);
        if (Number.isNaN(d.getTime())) {
          addError(field, "Invalid datetime");
          break;
        }

        // normalize
        out[field] = d.toISOString();
        break;
      }
    }

    if (errors.length > 0) {
      if (mode === "return") {
        return { ok: false, data: null, errors };
      }

      throw new BadRequestError(
        "Invalid request body",
        { errors },
      );
    }

    return mode === "return" 
    ? { ok: true, data: out, errors: [] }
    : out;
  }
}

```

### PocketBase\pb_hooks\registrant.invite-reissue-by-host.pb.js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite-reissue-by-host",
  (e) => {
    const requestInfo =
      e.requestInfo?.() ?? {};

    const requestBody =
      requestInfo.body ?? {};

    const eventId = requestInfo.pathParams?.eventId;

    const requestSpec = {
        eventId: {
            type: "string",
            required: true,
            minLength: 8,
            maxLength: 16,
        },
        registrantId: {
            type: "string",
            required: true,
            minLength: 8,
            maxLength: 16,
        },
    };

    if (!eventId) {
      throwApi(
          400,
          "Missing eventId",
      );
    };

    const input = validateRequest(
        requestBody,
        requestSpec
    );

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

        const record = txApp.findRecordById(input.registrantId);

        const password = $security.randomString(24);

        const newInviteCode = `${inviteId}.${password}`;

        record.setPassword("password");

        txApp.save(record);

        return {newInviteCode,};
      }
    );

    responseBody = {newInviteCode,};

  },
);

```

### PocketBase\pb_hooks\registrant.invite-reissue.pb..js

```js
// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite-reissue",
  (e) => {
    const requestInfo =
      e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requestInfo.pathParams?.eventId;

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
            minLength: 6,
            maxLength: 250,
        },
    };

    const allowEndpoint = getAppSetting("AllowUnauthenticatedReissue");
    if (!allowEndpoint) {
        throwApi(
            403,
            "New invite code must be aquired through an event host"
        )
    };

    if (!eventId) {  // Option: Replace with general path parameter validator 
      throwApi(
        400,
        "Missing eventId",
      );
    };

    const input = validateRequest(
        requestBody,
        requestSpec
    );

    const registrantName = input.name;
    const registrantEmail = input.email;

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
            };

            if (event.getBool("is_private")) {
                throwApi(
                    403,
                    "Event is private and invite only",
                    { eventId },
                );
            }

            // Check duplicate auth token
            const auth =
            txApp.auth;

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

            // Check duplicate email
            const existingRegistrant = txApp.countRecords(
                "registrants",
                "event = {:eventId} && name = {:name} && email = {:email}",
                {
                    eventId,
                    registrantEmail,
                    registrantName,
                }
            );

            if (existingRegistrant < 1) {
                throwApi(
                    404,
                    "Registrant not found",
                )
            };

            const record = txApp.findRecordById(input.registrantId);

            const password = $security.randomString(24);

            const newInviteCode = `${inviteId}.${password}`;

            record.setPassword("password");

            txApp.save(record);

            return {newInviteCode,};
        }
    );

    responseBody = {newInviteCode,};

    },
);
```

### PocketBase\pb_hooks\updateValidationHooks\application_settings.pb.js

```js
// <reference path="..\pb_data\types.d.ts" />

onRecordUpdateRequest(
    (e) => {
        if (e.collection?.name !== "application_settings") return e.next();

        const requestInfo = e.requestInfo?.() ?? {};

        const requestBody = requestInfo.body ?? {};

        // Type enforcement: Pre-check value data type aginst selected type

        // Helper function: enforceIntRange(key, minValue, maxValue)

        // Key: InviteCodeIdLength Range: 8 to 16

        // Key InviteCodeTokenLength Range: 8 to 64 - Warning if less than 22: "Set token length does not provide reasonable brute force protection"

        // Key: EventIdLength Range: 8 to 16

        // Key: WriteUntilDayOffset Range: 0 to 30000

        // Key: StartDateDayOffset Range: 0 to 365
    )
}
```

### PocketBase\pb_hooks\updateValidationHooks\registrants.pb.js

```js
/// <reference path="..\pb_data\types.d.ts" />

onRecordUpdateRequest((e) => {
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
}, "registrants");
```
