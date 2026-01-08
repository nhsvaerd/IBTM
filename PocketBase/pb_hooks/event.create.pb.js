// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/create", 
    (e) => {
        const requestBody = 
            e.requestInfo()?.body || {};

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
            },
            ownerEmail: {
            type: "email",
            required: false,
            },
        }

        const input = 
            validateRequest(
                requestBody,
                requestSpec
            );

        const ownerName = input.ownerName;
    
        const eventTitle = input.title;
    
        const startTime = input.startTime;
    
        const ownerEmail = input.ownerEmail; //Optional: Full email validation

        // Check valid startTime
        let dayOffset = getAppSetting(e, "StartDate_Day_Offset");
        dayOffset = isBlank(dayOffset) ? 1 : dayOffset;
        
        validateFutureDate(startTime,{dayOffset});

        e.app.runInTransaction(
            (txApp) => {
                const newEventId = createNewEvent(
                    txApp,
                    {
                        eventTitle,
                        startTime
                    }
                ).eventId;
                const newOwner = createNewHost(
                txApp,
                    {
                        newEventId,
                        ownerName,
                        ownerEmail,
                    }
                );
                
                const newEventRecord = txApp.findRecordById("events",newEventId);
                newEventRecord.set("owning_host", newOwner.recordId);

                responseBody = {
                    "eventId": newEventId,
                    "ownerId": newOwner.recordId,
                    "inviteCode": newOwner.inviteCode,
                }
            }
        );

        return e.json(
            200,
            responseBody,
        );
    }
);


function createNewHost(
    app,
        {
            eventId,
            hostName,
            hostEmail,
        },
    ) 
    {
    const record =
        new Record(
            app.findCollectionByNameOrId(
                "registrants",
            ),
        );

    const password = $security.randomString(24);

    const inviteId = $security.randomString(12);

    const inviteCode = `${inviteId}.${password}`;

    record.setPassword(password,);

    record.set("invite_id", inviteId,);

    record.set("event", eventId,);

    record.set("name", hostName,);
    
    record.set("is_host", true,);
    
    if (!isBlank(hostEmail)) {
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
};

function createNewEvent(
    app,
    {
        eventTitle, 
        startTime,
    }
) 
{
    const record = 
    new Record(
        app.findCollectionByNameOrId(
            "events")
    )

    record.set("title", eventTitle);
    record.set("start_time", startTime);

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