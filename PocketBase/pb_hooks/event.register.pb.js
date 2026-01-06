// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/:eventId/register", (e) => {

        const requestBody = e.requestInfo()?.body || {};
        const eventId = e.requestInfo()?.pathParams?.eventId

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
        
        const input = validateRequest(requestBody,requestSpec);

        const registrantName = input.name;
        const registrantEmail = input.email

        function createNewRegistrant(eventId, registrantName, registrantEmail = "") {
            let record = new Record(e.app.findCollectionByNameOrId("registrants"))

            const password = $security.randomString(24);
            const inviteId = $security.randomString(12);
            const inviteCode = `${inviteId}.${password}`;

            record.setPassword(password);
            record.set("invite_id", inviteId);
            record.set("event", eventId);
            record.set("name", registrantName);
            if(!isBlank(registrantEmail)) { 
                record.set( "registrant_email", registrantEmail ) 
            };
            
            try {
                e.app.save(record);
            } catch (err) {
                throwApi(
                    500,
                    "Unknown error"
                );
            }

            return {
                recordId: record.id,
                inviteId: inviteId,
                inviteCode: inviteCode
            }
        };

        // Event load
        let event;
        try {
            event = e.app.findRecordById(
                "events", 
                eventId,
            );
            } catch (_) {
                throwApi(
                    404, 
                    "Event not found",
                { eventId: eventId },
            );
        }

        // Capacity check
        const maxAttendants = event.getInt("max_attendants")
        if(maxAttendants > 0) {
            let registeredCount = e.app.countRecords(
                "registrants",
                "event = {:eventId}",
                { "eventId" : eventId },
            );
            if(registeredCount >= maxAttendants) {
                throwApi(409, "Number of invites/registrants has reached maximum attendants for the event")
            }
        }
        
        // Registrant check
        const auth = e.auth;
        const registrant = e.app.countRecords(
            "registrants",
            "id = {:id} && event = {:eventId}",
            {
            id: auth.id,
            eventId,
            },
        );
        if ((auth || auth.id) && registrant > 0) {
            throwApi(
                401,
                "Client is already registered for this event",
            );
        };

        if (event.getBool("is_private")) {
            throw new BadRequestError("Event is private and invite only")
        };

        const newRegistrant = createNewRegistrant(eventId, registrantName, registrantEmail);

        return e.json(
            200,
            {
                eventId: eventId,
                registrantId: newRegistrant.recordId,
                inviteId: newRegistrant.inviteId,
                inviteCode: newRegistrant.inviteCode,
                // inviteUrl: {env.baseUrl}/..
            },
        );
    }
);