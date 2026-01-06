/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "name": "events"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4041782348")

  // update collection data
  unmarshal({
    "name": "event"
  }, collection)

  return app.save(collection)
})
