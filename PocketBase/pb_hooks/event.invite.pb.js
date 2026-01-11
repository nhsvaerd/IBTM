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
        name: schemaFields.registrant.name(),
        email: schemaFields.registrant.email().optional(),
        isHost: schemaFields.registrant.isHost().optional(),
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

        // Capacity check
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

  const credentials = createInviteCredentials();

  const inviteCode = credentials.inviteCode;

  record.setPassword(credentials.password,);

  record.set("invite_id", credentials.inviteId,);

  record.set("event", eventId,);

  record.set("name", registrantName,);

  if (!isBlank(registrantEmail)) {
    record.set(
      "registrant_email",
      registrantEmail,
    );
  }

  record.set("is_host", !!isHost,);

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
