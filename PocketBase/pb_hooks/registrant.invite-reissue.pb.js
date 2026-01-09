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