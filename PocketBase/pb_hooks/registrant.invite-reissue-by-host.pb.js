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
