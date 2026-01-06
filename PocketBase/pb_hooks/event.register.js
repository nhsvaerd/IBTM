/// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/:eventId/register", (e) => {
        const requestBody = e.requestInfo()?.body || {};
        const eventId = e.requestInfo()?.pathParams?.eventId

        const requestSpec = {
            requestType: {
            type: "enum",
            required: true,
            allowed: ["registration_request", "host_invite"],
            },
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
        
        const input = validateRequest(requestBody,requestSpec);

        const registrantName = input.name;
        const registrantEmail = input.email

        function createNewRegistrant(eventId, registrantName, registrantEmail = "", isHost = false) {
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
            record.set("is_host", isHost);
            
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
        
        // Placeholder for optional override: If request source is authenticated, force "host_invite" path

        switch (input.requestType) {
            case "registration_request": {

                if (event.getBool("is_invite_only")) {
                    throw new BadRequestError("Event is invite only")
                };

                if (input.isHost) {
                    throw new BadRequestError("Host status can only be set by other host")
                }

                const newRegistrant = createNewRegistrant(eventId, registrantName, registrantEmail, false,);

                return e.json(
                    200,
                    {
                        eventId: eventId,
                        registrantId: newRegistrant.recordId,
                        inviteId: newRegistrant.inviteId,
                        inviteCode: newRegistrant.inviteCode,
                        // invite_url?
                    },
                );
            }

            case "host_invite": {

                const auth = e.auth;
                if (!auth || !auth.id) {
                    throwApi(
                        401,
                        "Host invite requires authentication",
                    );
                }

                let requestingAgent;
                try {
                    requestingAgent = e.app.findFirstRecordByFilter(
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
                    );
                }

                if (!requestingAgent.getBool("is_host")) {
                    throwApi(
                        403,
                        "Host privileges required",
                    );
                }

                if (input.isHost) {
                    const ownerId = String( 
                        event.get(
                            "owning_registrant",
                        )
                    );
                    if (ownerId && ownerId !== requestingAgent.id) {
                        throwApi(
                        403,
                        "Only the event owner can assign host privileges",
                        );
                    }
                }
                    
                const newRegistrant = createNewRegistrant(eventId, registrantName, registrantEmail, input.isHost);

                return e.json(
                    200,
                    {
                        eventId: eventId,
                        registrantId: newRegistrant.recordId,
                        inviteId: newRegistrant.inviteId,
                        inviteCode: newRegistrant.inviteCode,
                    }
                );

                // Placeholder: Send email if provided
            }

            default:
                throw new BadRequestError("Unknown request type");
        }
    }
);