/// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/create", (e) => {
        const requestBody = e.requestInfo()?.body || {};

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
            minLength: 1,
            maxLength: 200,
            },
            ownerEmail: {
            type: "email",
            required: false,
            },
        }

        const input = validateRequest(requestBody,requestSpec);

        const ownerName = input.ownerName;
        const eventTitle = input.title;
        const startTime = input.startTime;
        const ownerEmail = input.ownerEmail

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

        function createNewEvent(eventTitle, startTime,) {
            let record = new Record(e.app.findCollectionByNameOrId("events"))

            record.set("title", eventTitle);
            record.set("startTime", startTime);

            try {
                e.app.save(record);
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
        
        const newEvent = createNewEvent(eventTitle, startTime);
        try {
            const newOwner = createNewRegistrant(newEvent.eventId,ownerName,ownerEmail,true);
            const eventRecord = e.app.findRecordById("events", newOwner.recordId);

            eventRecord.set("owning_host", newOwner.recordId);
            e.app.save(eventRecord);

        } catch (err) {
            let eventFailed = e.app.findRecordById("events", newEvent.eventId);
            e.app.delete(eventFailed);

            let ownerFailed = e.app.findRecordById("events", newOwner.eventId);
            e.app.delete(ownerFailed);

            throwApi(
                500,
                "Error creating event"
            );
        } 
        
        return e.json(
            200,
            {
                eventId: newEvent.eventId,
                ownerId: newOwner.recordId,
                inviteCode: newOwner.inviteCode,
                //inviteURL:
            }
        ) 

        
        
    }
)