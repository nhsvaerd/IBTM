// <reference path="../pb_data/types.d.ts" />

routerAdd(
    "POST", "/api/event/create", 
    (e) => {
        const requestInfo =
        e.requestInfo?.() ?? {};

        const requestBody =
        requestInfo.body ?? {};

        const eventCreateSchema =
        z.object(
            {
                ownerName: schemaFields.registrant.name(),
                title: schemaFields.event.title(),
                startTime: schemaFields.event.startTime(),
                ownerEmail: schemaFields.registrant.email().optional(),
            }
        ).strict();

        const input = parseOrThrowApi(eventCreateSchema, requestBody,);

        const ownerName = input.ownerName;
    
        const eventTitle = input.title;
    
        const startTimeInput = input.startTime;
    
        const ownerEmail = input.ownerEmail;

        // Check valid startTime
        const dayOffset = getAppSettingOrDefault(e.app, "StartDateDayOffset", 1,);
        
        const startTime = validateFutureDate(startTimeInput,{dayOffset});

        // Set writeUntil
        const writeUntilOffset = getAppSettingOrDefault(e.app, "WriteUntilDayOffset", 1,);

        const writeUntil = addDaysLocal(startTime, writeUntilOffset,);
        
        let responseBody;

        e.app.runInTransaction(
            (txApp) => {
                const newEvent = createNewEvent(
                    txApp,
                    {
                        eventTitle,
                        startTime,
                        writeUntil,
                    }
                );
                const newOwner = createNewHost(
                txApp,
                    {
                        eventId: newEvent.eventId,
                        hostName: ownerName,
                        hostEmail: ownerEmail,
                    }
                );
                
                const newEventRecord = txApp.findRecordById("events",newEvent.eventId);

                newEventRecord.set("owning_host", newOwner.recordId);

                txApp.save(newEventRecord);

                responseBody = {
                    "eventId": newEvent.eventId,
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

/*    const password = $security.randomString(24);

    const inviteId = $security.randomString(12);

    const inviteCode = `${inviteId}.${password}`;*/

    const credentials = createInviteCredentials();

    const inviteCode = credentials.inviteCode;

    record.setPassword(credentials.password,);

    record.set("invite_id", credentials.inviteId,);

    record.set("event", eventId,);

    record.set("name", hostName,);
    
    record.set("is_host", true,);

    if (!isBlank(hostEmail)) {
        record.set(
            "registrant_email",
            hostEmail,
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
        writeUntil,
    }
) 
{
    const record = 
    new Record(
        app.findCollectionByNameOrId(
            "events")
    )

    record.set("title", eventTitle);
    record.set("start_time", startTime.toISOString());
    record.set("write_until", writeUntil.toISOString())

    try {
        app.save(record);
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