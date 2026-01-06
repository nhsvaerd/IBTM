/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_639040218")

  // update collection data
  unmarshal({
    "name": "event_attributes"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_639040218")

  // update collection data
  unmarshal({
    "name": "event_particulars"
  }, collection)

  return app.save(collection)
})
