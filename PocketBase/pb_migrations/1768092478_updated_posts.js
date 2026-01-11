/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1125843985")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && registrant.event.id = event.id && registrant.access_revoked_at = null",
    "listRule": "event.is_private = false && @now <= event.read_until"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1125843985")

  // update collection data
  unmarshal({
    "createRule": null,
    "listRule": null
  }, collection)

  return app.save(collection)
})
