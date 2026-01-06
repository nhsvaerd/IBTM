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