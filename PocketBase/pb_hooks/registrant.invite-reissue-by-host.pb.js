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

        // Registrant check
        const record = 
          txApp.findRecordById("registrants", input.registrantId,);
        
          if (!record.get("event") === eventId) {
            throwApi(
              403, 
              "Provided registrant is not registered for this event"
            )
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

    return e.json (200, transactionResult); //Replace with sending email before release
  },
);
