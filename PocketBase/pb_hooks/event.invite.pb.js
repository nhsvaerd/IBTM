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
