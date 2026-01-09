// <reference path="..\pb_data\types.d.ts" />

onRecordUpdateRequest(
    (e) => {
        if (e.collection?.name !== "application_settings") return e.next();

        const requestInfo = e.requestInfo?.() ?? {};

        const requestBody = requestInfo.body ?? {};

        // Type enforcement: Pre-check value data type aginst selected type

        // Helper function: enforceIntRange(key, minValue, maxValue)

        // Key: InviteCodeIdLength Range: 8 to 16

        // Key InviteCodeTokenLength Range: 8 to 64 - Warning if less than 22: "Set token length does not provide reasonable brute force protection"

        // Key: EventIdLength Range: 8 to 16

        // Key: WriteUntilDayOffset Range: 0 to 30000

        // Key: StartDateDayOffset Range: 0 to 365
    }
)
