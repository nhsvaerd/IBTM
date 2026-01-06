/// <reference path="..\pb_data\types.d.ts" />

onRecordUpdateRequest((e) => {
  if (e.collection?.name !== "registrants") return e.next();

  const body = e.requestInfo()?.body || {};

  if (Object.prototype.hasOwnProperty.call(body, "invite_id")) {
    throw new BadRequestError(
    "invite_id cannot be changed once created.",
    { field: "invite_id" },
        );
  };

  if (Object.prototype.hasOwnProperty.call(body, "event")) {
    throw new BadRequestError(
    "event cannot be changed once event registrant is created.",
    { field: "event" },
        );
  }

  return e.next();
}, "registrants");