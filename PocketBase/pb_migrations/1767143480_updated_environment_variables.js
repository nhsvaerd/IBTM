/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503202129")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_OVv9KuB7iH` ON `application_settings` (`key`)"
    ],
    "name": "application_settings"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1503202129")

  // update collection data
  unmarshal({
    "indexes": [
      "CREATE UNIQUE INDEX `idx_OVv9KuB7iH` ON `environment_variables` (`key`)"
    ],
    "name": "environment_variables"
  }, collection)

  return app.save(collection)
})
