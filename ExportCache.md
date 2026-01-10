# Project Export

## Project Statistics

- Total files: 12

## Folder Structure

```
PocketBase
  pb_hooks
    event.create.pb.js
    event.invite.pb.js
    event.register.pb.js
    lib
      getAppSettingOrDefault.pb.js
      utilityFunctions.pb.js
      validateFutureDate.pb.js
      validateRequest.pb.js
    pb_schema.json
    registrant.invite-reissue-by-host.pb.js
    registrant.invite-reissue.pb.js
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

        const input = validateRequest(
                requestBody,
                requestSpec
            );

        const ownerName = input.ownerName;
    
        const eventTitle = input.title;
    
        const startTimeInput = input.startTime;
    
        const ownerEmail = input.ownerEmail; //Optional: Full email validation

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
    record.set("start_time", startTime);
    record.set("write_until", writeUntil)

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
    const auth = e.auth;

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
            "event = {:eventId} && email = {:email}",
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

### PocketBase\pb_hooks\lib\utilityFunctions.pb.js

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
    errors.push({ field, message, ...meta });
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
        addError(field, "Missing required field", { type });
      } else if ("default" in rule) {
        out[field] = rule.default;
      }
      continue;
    }

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
        if (!s.includes("@") || s.startsWith("@") || s.endsWith("@")) {
          addError(field, "Invalid email format");
          break;
        }
        out[field] = s;
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

        out[field] = d.toISOString();
        break;
      }

      case "int": {
        const n =
          typeof raw === "number"
            ? raw
            : Number(String(raw).trim());

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

      case "enum": {
        const s = String(raw).trim();
        const allowed = rule.allowed || [];
        if (!allowed.includes(s)) {
          addError(field, "Invalid value", { allowed });
          break;
        }
        out[field] = s;
        break;
      }

      default: {
        out[field] = raw;
        break;
      }
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
            "CREATE UNIQUE INDEX `idx_vKt2xsbkhT` ON `registrants` (\n  `registrant_email`,\n  `event`\n) WHERE 'registrant_email' != '' ",
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
                "required": false,
                "system": false,
                "type": "select",
                "values": [
                    "integer",
                    "string",
                    "json",
                    "boolean",
                    "enum"
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
                "required": false,
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
    
    const newInviteCode = 
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
        const auth = e.auth;

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

        const record = txApp.findRecordById("registrants", input.registrantId,);

        const password = $security.randomString(24);

        const inviteId = record.getString("invite_id");

        const newInviteCode = `${inviteId}.${password}`;

        record.setPassword("password");

        txApp.save(record);

        return {newInviteCode,};
      }
    ).newInviteCode

    responseBody = {newInviteCode,}; //Replace with sending email before release
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
                "event = {:eventId} && name = {:name} && email = {:email}",
                {
                    eventId: eventId,
                    name: registrantName,
                    email: registrantEmail,
                }
            );

            if (!erecord) {
                throwApi(
                    404,
                    "Registrant not found",
                )
            };

            const password = $security.randomString(24);

            const newInviteCode = `${record.inviteId}.${password}`;

            record.setPassword("password");

            txApp.save(record);

            return {newInviteCode,};
        }
    );

    responseBody = {newInviteCode,}; //Replace with sending email before release

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
    }
)

```

### PocketBase\pb_hooks\updateValidationHooks\registrants.pb.js

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
