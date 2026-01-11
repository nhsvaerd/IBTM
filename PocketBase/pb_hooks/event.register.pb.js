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
        name: schemaFields.registrant.name(),
        email: schemaFields.registrant.email().optional(),
      }
    ).strict()

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
  const record = new Record(
    app.findCollectionByNameOrId("registrants",),
  );

  const credentials = createInviteCredentials();

  const inviteCode = credentials.inviteCode;

  record.setPassword(credentials.password,);

  record.set("invite_id", inviteId,);

  record.set("event", eventId,);

  record.set("name", registrantName,);

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