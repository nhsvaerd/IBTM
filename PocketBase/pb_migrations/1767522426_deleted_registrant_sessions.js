/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_11499691");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_4042354073",
        "hidden": false,
        "id": "relation1712544448",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "registrant",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text3015464922",
        "max": 0,
        "min": 0,
        "name": "token_hash",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date461503937",
        "max": "",
        "min": "",
        "name": "issued_at",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date3088861482",
        "max": "",
        "min": "",
        "name": "last_seen_at",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date261981154",
        "max": "",
        "min": "",
        "name": "expires_at",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date3687365789",
        "max": "",
        "min": "",
        "name": "revoked_at",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select4119331924",
        "maxSelect": 1,
        "name": "revoked_reason",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "max_cookie_count_exceeded",
          "rotated",
          "logout",
          "unknown"
        ]
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_11499691",
    "indexes": [
      "CREATE UNIQUE INDEX `idx_d3U4GyBBl8` ON `registrant_sessions` (`token_hash`)",
      "CREATE INDEX `idx_sGDggt0VzI` ON `registrant_sessions` (`registrant`)",
      "CREATE INDEX `idx_DxodqFacuv` ON `registrant_sessions` (`expires_at`)"
    ],
    "listRule": null,
    "name": "registrant_sessions",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
})
