// <reference path="../pb_data/types.d.ts" />

routerAdd(
  "POST",
  "/api/event/:eventId/invite-reissue",
  (e) => {
    const allowEndpoint = getAppSettingOrDefault(e.app, "AllowUnauthenticatedReissue", false,);

    if (!allowEndpoint) {
        throwApi(
            403,
            "New invite code must be aquired from event host"
        )
    };

    const requestInfo = e.requestInfo?.() ?? {};

    const requestBody = requestInfo.body ?? {};

    const eventId = requirePathParam(requestInfo, "eventId");

    const inviteReissueSchema =
    z.object (
        {
            name: schemaFields.registrant.name(),
            email: schemaFields.registrant.email(),
        }
    ).strict();

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