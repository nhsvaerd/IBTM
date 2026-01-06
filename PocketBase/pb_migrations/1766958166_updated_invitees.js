/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "name": "registrants"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4042354073")

  // update collection data
  unmarshal({
    "name": "invitees"
  }, collection)

  return app.save(collection)
})
